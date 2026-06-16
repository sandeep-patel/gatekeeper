# GateKeeper - Remote Command Approval

Approve VS Code Copilot **and Claude Code** terminal commands from your phone! 📱✅

> 💡 **Just want it to work in VS Code?** Install the [GateKeeper extension](./vscode-extension/) for one-click setup — no manual install required.

## Supported Channels

| Channel | Status |
|---------|--------|
| 📱 **Telegram** | ✅ Available |
| 💬 Slack | 🔜 Coming Soon |
| 💚 WhatsApp | 🔜 Coming Soon |
| 🎮 Discord | 🔜 Coming Soon |
| 📧 Email | 🔜 Coming Soon |
| 📲 SMS (Twilio) | 🔜 Coming Soon |
| 🔔 Pushover | 🔜 Coming Soon |
| 📨 Microsoft Teams | 🔜 Coming Soon |
| 🔗 Webhook (Custom) | 🔜 Coming Soon |

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  VS Code        │────▶│  GateKeeper      │────▶│  VS Code    │
│  Copilot        │     │  Server          │     │  Notification
│                 │     │                  │     │  (Local)    │
│                 │     │                  │     └──────┬──────┘
│                 │     │                  │            │
│                 │     │                  │     ┌──────▼──────┐
│                 │◀────│                  │◀────│  Telegram   │
└─────────────────┘     └──────────────────┘     │  (Fallback) │
                                                 └─────────────┘
```

### Local-First Approval Flow

1. Copilot wants to run a command
2. **VS Code notification appears immediately** with ✅ Approve / ❌ Reject
3. If no response within `localApprovalDelay` seconds (default: 10s)...
4. Command **escalates to Telegram**
5. Either channel can approve — **first response wins**

### Ask User Flow (Interactive Q&A)

Copilot can also ask questions and get responses:

```
Copilot: "Which database should I use?"
    ↓
ask_user(question: "Which database?", options: ["PostgreSQL", "MySQL", "SQLite"])
    ↓
VS Code shows quick-pick with options (or Telegram buttons)
    ↓
User selects "PostgreSQL" or types custom answer
    ↓
Copilot receives "PostgreSQL" and continues
```

**MCP Tools:**
- `run_approved_command` — Run a command with approval
- `ask_user` — Ask a question and get a response
- `check_approval_server` — Check if server is healthy

## Quick Start (Recommended) 🌟

The VS Code extension provides a simple setup UI — no manual configuration needed!

### 1. Create a Telegram Bot (1 minute)

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy your bot token

### 2. Install the Extension

```bash
cd gatekeeper/vscode-extension
npm install && npm run compile
npx vsce package
code --install-extension gatekeeper-remote-approval-*.vsix
```

### 3. Install Bot Dependencies

```bash
cd gatekeeper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Configure via Extension UI

1. Click **GateKeeper** in the VS Code sidebar (shield icon)
2. Enter your bot token and chat ID
3. Click **🚀 Start Approval Server**

**Done!** The extension handles everything else.

---

## Alternative Setup Options

### Option A: Manual Bot Configuration

If you prefer manual setup:

```bash
# Configure the bot
cp config.json.example config.json
# Edit config.json with your bot token and chat ID

# Start the bot
python bot.py
```

### Option B: MCP Server Integration

For deeper Copilot agent integration, add the MCP server:

**`~/.vscode/settings.json`:**
```json
{
    "mcp": {
        "servers": {
            "gatekeeper": {
                "type": "stdio",
                "command": "/path/to/gatekeeper/.venv/bin/python",
                "args": ["/path/to/gatekeeper/approval_mcp_server.py"]
            }
        }
    }
}
```

This provides the `run_approved_command` tool for Copilot.

### Option C: Direct HTTP API

Any tool can request approval:

```bash
curl -X POST http://localhost:8765/approve \
  -H "Content-Type: application/json" \
  -d '{"command": "npm install", "explanation": "Install deps"}'
```

Response: `{"approved": true, "requestId": "..."}`

---

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message and your Chat ID |
| `/status` | List pending approval requests |
| `/approveall` | Approve all pending commands |
| `/rejectall` | Reject all pending commands |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|  
| `TELEGRAM_BOT_TOKEN` | Your bot token from BotFather | Required |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | Required |
| `APPROVAL_HTTP_PORT` | HTTP server port | `8765` |
| `LOCAL_APPROVAL_DELAY` | Seconds to wait for VS Code approval before Telegram | `10` |
| `PREVENT_SLEEP` | Prevent macOS from sleeping (`true`/`false`) | `true` |

### config.json (Alternative)

```json
{
    "telegram_bot_token": "YOUR_TOKEN",
    "telegram_chat_id": 123456789,
    "http_port": 8765,
    "local_approval_delay": 10,
    "prevent_sleep": true
}
```

## Running as a Service

### macOS (launchd)

Create `~/Library/LaunchAgents/com.gatekeeper.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gatekeeper</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/.venv/bin/python</string>
        <string>/path/to/bot.py</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>TELEGRAM_BOT_TOKEN</key>
        <string>your-token</string>
        <key>TELEGRAM_CHAT_ID</key>
        <string>your-chat-id</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### Docker

```bash
docker-compose up -d
```

## Security

- HTTP server runs on localhost only
- Bot only accepts commands from your Chat ID  
- Bot token stored securely in VS Code secret storage (extension)
- Commands auto-reject after 5 minutes

## Platform Features

### macOS Sleep Prevention

When running on macOS, the server can prevent your Mac from sleeping using `caffeinate`. This ensures approval requests aren't missed while the server is active.

- ☕ **Enabled by default** — toggle in Advanced Settings or set `PREVENT_SLEEP=false`
- ☕ **Auto-disabled** when server stops (Ctrl+C or graceful shutdown)
- Uses `-i` (prevent idle sleep) and `-s` (prevent system sleep on AC power)

You'll see in the logs:
```
☕ Sleep prevention enabled (caffeinate)
```

To disable, either:
- Uncheck "☕ Prevent Mac from sleeping" in Advanced Settings
- Set `PREVENT_SLEEP=false` environment variable
- Set `"prevent_sleep": false` in config.json

## Architecture

```
gatekeeper/
├── bot.py                    # Telegram channel + HTTP server
├── approval_mcp_server.py    # MCP server for Copilot
├── config.json               # Bot configuration
├── requirements.txt          # Python dependencies
├── vscode-extension/         # VS Code extension
│   ├── src/
│   │   ├── extension.ts      # Main extension
│   │   ├── setupPanel.ts     # Setup UI
│   │   ├── approvalClient.ts # HTTP client
│   │   └── commandInterceptor.ts
│   └── package.json
└── README.md
```

## Configure Copilot to Use GateKeeper

Add custom instructions so Copilot routes terminal commands through GateKeeper. See the [extension README](./vscode-extension/README.md#configure-copilot-to-use-gatekeeper) for the full setup — short version:

**Workspace** — create `.github/copilot-instructions.md`:

```markdown
## Terminal Commands

Always use `mcp_gatekeeper_run_approved_command` for all shell commands.
```

## Claude Code Integration

GateKeeper also routes [Claude Code](https://claude.com/claude-code) tool approvals to your phone, using a `PreToolUse` hook. Because it talks to the **same** approval server, Claude Code and Copilot can both run against one bot at the same time — each request is tracked independently by `requestId`, so there's no conflict. The hook lives in Claude Code's `settings.json`, so it works wherever Claude Code runs (terminal, VS Code, or JetBrains), not just inside VS Code.

```
Copilot      ──▶ GateKeeper VS Code extension ──┐
                                                ├─▶ POST /approve ──▶ Telegram 📱
Claude Code  ──▶ PreToolUse hook ───────────────┘
```

### Setup

> **Using the VS Code extension?** Skip these steps — when you start the approval server the extension installs `~/.claude/hooks/gatekeeper-claude-approval.py` and registers the `PreToolUse` hook in your `~/.claude/settings.json` for you. It does this idempotently and with surgical edits, so your existing settings, comments, and formatting are preserved. The manual steps below are for a standalone bot or other editors.

**1. Add the hook script** at `~/.claude/hooks/gatekeeper-claude-approval.py` (Python stdlib only — no extra deps). It reads the `PreToolUse` payload on stdin and **defers to Claude's own permission rules**: anything already allowed or denied by your `settings.json`, file edits while in `acceptEdits` mode, and safe read-only shell commands all run **without** involving GateKeeper. Only the calls Claude would genuinely prompt for are POSTed to `/approve`. The canonical copy lives at [`vscode-extension/hooks/gatekeeper-claude-approval.py`](vscode-extension/hooks/gatekeeper-claude-approval.py); the full script is below:

<details>
<summary><strong>Show the full hook script</strong> (Python stdlib only)</summary>

```python
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
```

</details>

```bash
chmod +x ~/.claude/hooks/gatekeeper-claude-approval.py
```

**2. Register the hook** in `~/.claude/settings.json` (or a project's `.claude/settings.json`). The `matcher` decides which tools require approval — this set covers everything that normally prompts; read-only tools (Read/Grep/Glob) are left alone:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Bash|Edit|MultiEdit|Write|NotebookEdit|WebFetch)$|^mcp__",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/gatekeeper-claude-approval.py",
            "timeout": 320,
            "statusMessage": "Requesting approval via GateKeeper (Telegram)..."
          }
        ]
      }
    ]
  }
}
```

> Hooks load at session start, so changes take effect in your **next** Claude Code session. Keep `bot.py` running; if it's down the hook returns `ask` and Claude falls back to its normal local prompt.

**Behavior:**
- **Defers to your permission rules.** Commands matching your `permissions.allow` rules (in `~/.claude/settings.json` or a project's `.claude/settings.json`/`.local.json`) run as usual; `deny` matches are left for Claude to block; file edits in `acceptEdits` mode are auto-accepted. None of these touch GateKeeper — so it does **not** prompt for every terminal command.
- Safe read-only shell (`ls`, `git status`, `cat`, …) is auto-approved locally — no phone buzz. Chained commands (`&&`, `;`, `|`, `>`, `$(…)`) are **not**, so `ls && rm -rf x` still asks.
- Everything Claude would otherwise prompt for → Telegram. Approve → tool runs; reject/timeout → tool is blocked.
- Rule matching is an *approximation* of Claude's own glob matching: when in doubt it routes to the phone (over-routes), never auto-allows something Claude would have denied.
- Point at a different server with the `GATEKEEPER_URL` environment variable (the VS Code extension bakes the configured port into the installed copy automatically).

## License

MIT
