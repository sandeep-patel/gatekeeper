# Telegram Command Approval

Approve VS Code Copilot terminal commands from your phone via Telegram! 📱✅

## Features

- **Mobile Approval**: Approve or reject commands from anywhere via Telegram
- **Real-time Notifications**: Get instant alerts when Copilot wants to run a command
- **Quick Actions**: Approve all or reject all pending commands
- **Timeout Protection**: Commands auto-reject after 5 minutes of no response

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  VS Code        │────▶│  Telegram Bot    │────▶│  Telegram   │
│  Copilot        │     │  (Python)        │     │  App        │
│                 │◀────│                  │◀────│  (Phone)    │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

1. Copilot wants to run a command
2. Command is sent to your Telegram
3. You tap ✅ Approve or ❌ Reject
4. VS Code continues or cancels

## Requirements

1. **Telegram Bot** - Create one via [@BotFather](https://t.me/BotFather)
2. **Python Bot Server** - Run the companion bot server

## Setup

### 1. Install the Bot Server

```bash
git clone https://github.com/patelsan/telegram-approval
cd telegram-approval
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure

```bash
cp config.json.example config.json
# Edit config.json with your bot token and chat ID
```

### 3. Run the Bot

```bash
python bot.py
```

### 4. Configure Extension

1. Open VS Code Settings
2. Search for "Telegram Approval"
3. Enable and set the server URL (default: `http://localhost:8765`)

## Extension Commands

- `Telegram Approval: Configure` - Open settings
- `Telegram Approval: Test Connection` - Verify bot is running
- `Telegram Approval: Enable` - Turn on approval routing
- `Telegram Approval: Disable` - Turn off approval routing

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message and Chat ID |
| `/status` | List pending approvals |
| `/approveall` | Approve all pending |
| `/rejectall` | Reject all pending |

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `telegramApproval.enabled` | Enable approval routing | `false` |
| `telegramApproval.serverUrl` | Bot HTTP server URL | `http://localhost:8765` |
| `telegramApproval.timeoutSeconds` | Approval timeout | `300` |

## Security

- HTTP server runs on localhost only
- Bot only accepts commands from your Chat ID
- Commands timeout after 5 minutes

## Links

- [Full Documentation](https://github.com/patelsan/telegram-approval)
- [Report Issues](https://github.com/patelsan/telegram-approval/issues)

## License

MIT
