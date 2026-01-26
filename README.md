# ClawdBot Agent Dashboard - API

Backend API für ClawdBot Multi-Agent Dashboard mit ClawdBot Auth-Monitoring und GitHub Integration.

## Features

- 📊 **GitHub Integration**: Issues & PRs via GitHub CLI
- 🔐 **ClawdBot Monitoring**: OAuth Token Status, Rate-Limit Detection
- 🚨 **Real-time Analytics**: Log-Analyse, Error-Tracking
- 💡 **Smart Recommendations**: Automatische Handlungsempfehlungen
- 🔄 **Auto-Recovery Support**: Daten für Auto-Fallback-System

## API Endpoints

### `GET /api/projects`

Returns GitHub Issues & PRs for configured projects.

**Response:**
```json
[
  {
    "name": "Thai-Blitz",
    "repo": "DanielIshi/thai-blitz-ai-language-coach",
    "emoji": "🇹🇭",
    "issues": [...],
    "prs": [...]
  }
]
```

### `GET /api/clawdbot-status`

Returns ClawdBot authentication and rate-limit status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T12:40:15.528Z",
  "auth": {
    "activeProfile": "anthropic:claude-cli",
    "oauthToken": {
      "exists": true,
      "expires": "2026-01-27T08:41:42.000Z",
      "hoursRemaining": 20,
      "minutesRemaining": 1,
      "isValid": true,
      "needsRenewal": false
    },
    "apiKeyFallback": {
      "exists": true,
      "type": "api_key"
    }
  },
  "rateLimit": {
    "detected": false,
    "occurrences": 0,
    "lastDetected": null,
    "recentErrors": []
  },
  "usage": {
    "anthropic:claude-cli": {
      "lastUsed": 1769427492167,
      "errorCount": 0
    }
  },
  "recommendations": []
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "time": "2026-01-26T12:40:15.528Z"
}
```

## Installation

```bash
npm install
```

## Configuration

### Required Files (VPS)

- `/root/.clawdbot/agents/main/agent/auth-profiles.json` - ClawdBot Auth Config
- `/var/log/clawdbot.log` - ClawdBot Logs

### Environment Variables

```bash
# GitHub CLI must be authenticated
gh auth status

# Optional: Custom log path
export CLAWDBOT_LOG=/path/to/clawdbot.log
```

## Development

```bash
# Start server (localhost:3456)
node server.js

# Or with nodemon for auto-reload
npm run dev
```

## Production Deployment

### VPS Setup

```bash
# Kill existing process
pkill -f "node server.js.*3456"

# Start in background
cd /root/clawd/agent-dashboard-api
nohup node server.js > /var/log/dashboard-api.log 2>&1 &

# Verify
curl http://127.0.0.1:3456/health
```

### Systemd Service (Optional)

```ini
[Unit]
Description=ClawdBot Dashboard API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/clawd/agent-dashboard-api
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/dashboard-api.log
StandardError=append:/var/log/dashboard-api.log

[Install]
WantedBy=multi-user.target
```

## Monitoring Module

`clawdbot-monitor.js` provides:

### Functions

- `getClawdBotStatus()` - Main monitoring function
- `generateRecommendations()` - Smart alert generation

### Checks

1. **Auth Profile Parsing**: Liest `/root/.clawdbot/agents/main/agent/auth-profiles.json`
2. **Token Expiry Calculation**: Berechnet verbleibende Zeit
3. **Log Analysis**: Durchsucht letzte 100 Zeilen nach Rate-Limits
4. **Error Detection**: Findet kritische Fehler
5. **Recommendation Generation**: Erstellt Handlungsempfehlungen

### Alert Severities

- `critical` - Rate-Limit aktiv, sofortige Aktion
- `high` - Token <4h, Erneuerung empfohlen
- `medium` - API-Key aktiv (kostet Geld)

## Tech Stack

- **Node.js** - Runtime
- **HTTP Module** - Native HTTP Server
- **child_process** - GitHub CLI & Shell Commands
- **fs** - File System Access

## Project Structure

```
.
├── server.js              # HTTP Server & Routing
├── clawdbot-monitor.js    # ClawdBot Monitoring Logic
├── package.json           # Dependencies
└── README.md
```

## Related Systems

### Auto-Fallback Script

`/root/clawdbot-rate-limit-fallback.sh` (VPS):
- Läuft alle 5 Min via Cron
- Nutzt Daten von `/api/clawdbot-status`
- Schaltet automatisch auf API-Key bei Rate-Limit
- Auto-Recovery nach 2h zurück auf OAuth

### Frontend

- **Repo**: https://github.com/DanielIshi/clawdbot-agent-dashboard (main branch)
- **Live**: https://apps.srv947487.hstgr.cloud/agent-dashboard/

## Security

- API läuft auf `127.0.0.1` (localhost only)
- Zugriff über Caddy Reverse Proxy
- Keine Secrets in Logs
- Auth-Dateien nur von root lesbar

## License

Private - Daniel Ishimwe

## Author

Daniel Ishimwe - ClawdBot Multi-Agent Team 2026
