# GateKeeper — Remote Command Approval

Approve VS Code Copilot (and Claude Code) terminal commands from your phone. 📱✅

Telegram is available today; Slack, WhatsApp, Discord, Email, SMS and more are coming soon.

## Features

- **One-click setup** — paste your bot token + chat ID, click Start.
- **Local-first approval** — a VS Code notification appears first; it escalates to Telegram only if you don't respond.
- **Approve from anywhere** — VS Code or phone; first response wins.
- **Interactive Q&A** — Copilot can ask you questions and get an answer from either channel.
- **Auto-approve safe commands** — define regex patterns for commands that never need approval.

## Quick Start (2 minutes)

**1. Create a Telegram bot** — open [@BotFather](https://t.me/BotFather), send `/newbot`, and copy the bot token.

**2. Get your chat ID** — start a chat with your new bot and send `/start`; copy the Chat ID from the reply.

**3. Configure the extension** — click the **GateKeeper** sidebar icon (or run `GateKeeper: Setup`), paste the token and chat ID, and click **🚀 Start Approval Server**.

That's it — the extension starts the server, registers its Copilot MCP tool, and (if you use Claude Code) installs the approval hook for you. No manual config files to edit.

## How It Works

1. Copilot wants to run a command.
2. A **VS Code notification** appears immediately with ✅ Approve / ❌ Reject.
3. If you don't respond within `localApprovalDelay` seconds (default 10), it **escalates to Telegram**.
4. Either channel can approve — **first response wins**. No response within 5 minutes → auto-reject.

Copilot can also ask questions (`ask_user`) and get the options as buttons in VS Code or Telegram.

## Make Copilot Use GateKeeper

By default Copilot uses its built-in terminal tool. To route commands through GateKeeper, tell Copilot to use `mcp_gatekeeper_run_approved_command`:

- **Per project** — create `.github/copilot-instructions.md`:
  ```markdown
  ## Terminal Commands
  Always use `mcp_gatekeeper_run_approved_command` for all shell commands.
  ```
- **All workspaces** — add to `settings.json`:
  ```json
  "github.copilot.chat.codeGeneration.instructions": [
    { "text": "Always use `mcp_gatekeeper_run_approved_command` for terminal commands instead of `run_in_terminal`." }
  ]
  ```

The tool **degrades gracefully**: server running → approval flow; server off → runs the command directly. So it's always safe to leave configured.

## Reference

**Extension commands** — `GateKeeper: Setup` (main UI), `Configure`, `Test Connection`, `Run Command with Approval`, `Manage Auto-Approve Patterns`, `Show Logs`.

**Telegram commands** — `/start`, `/status`, `/approveall`, `/rejectall`.

**Key settings**

| Setting | Description | Default |
|---------|-------------|---------|
| `gatekeeper.serverUrl` | Server HTTP URL | `http://localhost:8765` |
| `gatekeeper.timeoutSeconds` | Total approval timeout | `300` |
| `gatekeeper.localApprovalDelay` | Seconds to wait for VS Code before Telegram | `10` |
| `gatekeeper.autoApprovePatterns` | Regex patterns to auto-approve | `[]` |

```json
"gatekeeper.autoApprovePatterns": ["^ls\\b", "^git status\\b", "^pwd$"]
```

**Status bar** — 🟢 running · 🟡 configured (click to start) · ⚪ not configured · `(N pending)`.

## Requirements

- **Python 3.10+** on your `PATH` ([download](https://www.python.org/downloads/)).
- The extension bundles the bot and auto-installs its Python dependencies (`python-telegram-bot`, `aiohttp`, `mcp`) the first time you click Start.

## Security

- HTTP server binds to localhost only; the bot accepts commands only from your Chat ID.
- Bot token is kept in VS Code's secret storage. Commands auto-reject after 5 minutes.

## Troubleshooting

- **Server won't start?** Open `GateKeeper: Show Logs`; verify `python3 --version` is 3.10+ (`brew install python@3.12` on macOS, or grab it from python.org).
- **No Telegram messages?** Double-check your Chat ID and token, and that you've sent `/start` to the bot.

## Links

[Documentation](https://github.com/patelsan/gatekeeper) · [Report an issue](https://github.com/patelsan/gatekeeper/issues) · MIT License
