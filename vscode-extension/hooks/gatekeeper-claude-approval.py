#!/usr/bin/env python3
"""GateKeeper PreToolUse hook for Claude Code.

Routes Claude Code tool-approval prompts to Telegram via the GateKeeper
approval server (bot.py, default http://localhost:8765).

Flow:
  1. Read the PreToolUse hook payload from stdin.
  2. Safe read-only Bash commands are auto-approved locally (no phone buzz).
  3. Anything Claude would already auto-run (commands matching your
     permissions.allow rules, or file edits while in acceptEdits mode) is
     passed straight through to Claude's own permission system — GateKeeper
     stays out of the way, so it does NOT route every terminal command.
  4. Only the calls Claude would genuinely prompt for are POSTed to
     GateKeeper's /approve endpoint, which sends them to your phone. The
     Telegram approve/reject maps to allow/deny.
  5. If the server is unreachable, we fall back to Claude's normal prompt
     ("ask") so you are never locked out.

Only Python stdlib is used, so this runs under any python3.
"""

import fnmatch
import json
import os
import re
import sys
import urllib.error
import urllib.request

SERVER = os.environ.get("GATEKEEPER_URL", "http://localhost:8765")
# How long to wait for a Telegram answer. bot.py caps total wait at 300s;
# we give the HTTP call a little more headroom so the server times out first.
HTTP_TIMEOUT = 310

# Read-only Bash commands that are safe to approve without bothering the phone.
SAFE_BASH = [
    r"^ls(\s|$)", r"^pwd$", r"^cat\s", r"^head\s", r"^tail\s",
    r"^grep\s", r"^rg\s", r"^find\s", r"^echo\s", r"^which\s",
    r"^wc\s", r"^date(\s|$)", r"^whoami$", r"^tree(\s|$)", r"^stat\s",
    r"^file\s", r"^du\s", r"^df(\s|$)", r"^cd\s", r"^env$",
    r"^printenv(\s|$)", r"^realpath\s", r"^dirname\s", r"^basename\s",
    r"^git\s+(status|log|diff|show|branch|remote|config\s+--get|rev-parse)(\s|$)",
]
# Shell metacharacters that could chain a safe command into something unsafe.
UNSAFE_CHARS = re.compile(r"[;&|`]|\$\(|>>|>|<")


def emit(decision: str, reason: str) -> None:
    """Print a PreToolUse decision and exit cleanly."""
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,      # allow | deny | ask
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def passthrough() -> None:
    """Exit with no decision so Claude's own permission rules apply.

    Used for anything Claude would already auto-resolve (allow/deny matches,
    auto-accepted edits) — GateKeeper does not touch those.
    """
    sys.exit(0)


# Tools whose edits Claude auto-accepts when permission_mode == "acceptEdits".
EDIT_TOOLS = ("Edit", "MultiEdit", "Write", "NotebookEdit")


def match_value(tool: str, ti: dict) -> str:
    """The field a permission rule's argument is matched against, per tool."""
    if tool == "Bash":
        return ti.get("command", "")
    if tool in ("Edit", "MultiEdit", "Write", "Read"):
        return ti.get("file_path", "")
    if tool == "NotebookEdit":
        return ti.get("notebook_path", "")
    if tool == "WebFetch":
        return ti.get("url", "")
    for k in ("command", "file_path", "path", "url", "query"):
        if k in ti:
            return str(ti[k])
    return ""


def value_candidates(tool: str, value: str, cwd: str) -> set:
    """Plausible forms of a value to test against a rule's glob.

    Claude matches file paths relative to the project root, but tool inputs are
    usually absolute. For path tools we also offer the cwd-relative, ``./``-
    prefixed, and basename forms so relative rules (e.g. ``Read(./.env)``) match.
    """
    cands = {value}
    if tool in ("Edit", "MultiEdit", "Write", "Read", "NotebookEdit") and value:
        if cwd and value.startswith(cwd):
            rel = value[len(cwd):].lstrip("/")
            cands.add(rel)
            cands.add("./" + rel)
        cands.add(os.path.basename(value))
    return cands


def rule_matches(rule: str, tool: str, ti: dict, cwd: str = "") -> bool:
    """Approximate Claude's permission-rule matching for one rule string.

    Rules look like ``Bash(git status *)``, ``Read(/path/**)``, ``WebSearch``
    or ``mcp__server__tool``. A bare ``Tool`` (no parens) matches any use of
    that tool; an argument is glob-matched (``*`` wildcard) against the tool's
    primary field. Anything we fail to match simply falls through to a phone
    prompt, so over-routing is safe, never dangerous.
    """
    rule = rule.strip()
    if rule.endswith(")") and "(" in rule:
        rtool = rule[:rule.index("(")]
        arg = rule[rule.index("(") + 1:-1]
    else:
        rtool, arg = rule, None

    # mcp__ rules act as prefixes (e.g. "mcp__claude_ai_Slack" matches its tools)
    if rtool != tool and not (rtool.startswith("mcp__") and tool.startswith(rtool)):
        return False
    if arg is None:
        return True
    return any(
        fnmatch.fnmatchcase(v, arg)
        for v in value_candidates(tool, match_value(tool, ti), cwd)
    )


def load_rules(cwd: str):
    """Merge permissions.allow / .deny from user + project settings files."""
    paths = [os.path.expanduser("~/.claude/settings.json")]
    if cwd:
        paths.append(os.path.join(cwd, ".claude", "settings.json"))
        paths.append(os.path.join(cwd, ".claude", "settings.local.json"))
    allow: list = []
    deny: list = []
    for p in paths:
        try:
            with open(p) as f:
                perms = (json.load(f) or {}).get("permissions", {}) or {}
            allow += perms.get("allow", []) or []
            deny += perms.get("deny", []) or []
        except Exception:  # noqa: BLE001 - missing/invalid settings just skip
            continue
    return allow, deny


def is_safe_bash(command: str) -> bool:
    cmd = command.strip()
    if not cmd or UNSAFE_CHARS.search(cmd):
        return False
    return any(re.search(p, cmd) for p in SAFE_BASH)


def describe(tool: str, ti: dict) -> str:
    """Build a human-readable one-liner for the Telegram message."""
    if tool == "Bash":
        return ti.get("command", "")
    if tool in ("Edit", "MultiEdit", "Write"):
        return f"{tool} {ti.get('file_path', '?')}"
    if tool == "NotebookEdit":
        return f"{tool} {ti.get('notebook_path', '?')}"
    if tool == "WebFetch":
        return f"WebFetch {ti.get('url', '?')}"
    for k in ("command", "file_path", "path", "url", "query", "prompt"):
        if k in ti:
            return f"{tool}: {str(ti[k])[:300]}"
    return f"{tool} {json.dumps(ti)[:300]}"


def main() -> None:
    try:
        data = json.loads(sys.stdin.read())
    except Exception:
        emit("ask", "GateKeeper: could not parse hook input; using local prompt")

    tool = data.get("tool_name", "")
    ti = data.get("tool_input", {}) or {}
    cwd = data.get("cwd", "")
    mode = data.get("permission_mode", "")

    # Respect an explicit bypass mode — let Claude run without routing.
    if mode == "bypassPermissions":
        passthrough()

    # Auto-approve safe read-only shell commands locally (no prompt, no phone).
    if tool == "Bash" and is_safe_bash(ti.get("command", "")):
        emit("allow", "GateKeeper: auto-approved safe read-only command")

    # Defer to Claude's own permission rules: only route to the phone for
    # calls Claude would actually prompt for. Anything already allowed/denied
    # by settings, or auto-accepted in acceptEdits mode, passes straight
    # through — so GateKeeper does NOT prompt for every terminal command.
    allow_rules, deny_rules = load_rules(cwd)
    if any(rule_matches(r, tool, ti, cwd) for r in deny_rules):
        passthrough()  # Claude will block it; nothing to approve
    if any(rule_matches(r, tool, ti, cwd) for r in allow_rules):
        passthrough()  # already permitted; run without bothering anyone
    if mode == "acceptEdits" and tool in EDIT_TOOLS:
        passthrough()  # Claude auto-accepts edits in this mode

    payload = json.dumps({
        "command": describe(tool, ti),
        "explanation": f"Claude Code tool: {tool}",
        "goal": f"cwd: {cwd}" if cwd else "Claude Code approval request",
        "localApprovalDelay": 0,   # no VS Code approver here — go straight to phone
    }).encode()

    req = urllib.request.Request(
        f"{SERVER}/approve",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            result = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        emit("ask", f"GateKeeper server unreachable ({e.reason}); using local prompt")
    except Exception as e:  # noqa: BLE001 - never block Claude on hook errors
        emit("ask", f"GateKeeper error ({e}); using local prompt")

    if result.get("approved"):
        emit("allow", "Approved via Telegram (GateKeeper)")
    emit("deny", "Rejected or timed out via Telegram (GateKeeper)")


if __name__ == "__main__":
    main()
