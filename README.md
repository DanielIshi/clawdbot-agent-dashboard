# ClawdBot Agent Dashboard - Frontend

Live Dashboard für ClawdBot Multi-Agent System mit Echtzeit-Monitoring, Rate-Limit Detection und Auto-Fallback.

## Features

- 🤖 **Multi-Agent Monitoring**: Überwacht GitHub Issues über mehrere Projekte
- 🔐 **ClawdBot Auth Status**: OAuth Token Countdown, aktives Profil, Rate-Limit Detection
- 📊 **Real-time Updates**: Auto-refresh alle 10 Sekunden
- 🚨 **Intelligent Alerts**: Warnungen bei Token-Ablauf oder Rate-Limits
- 💡 **Recommendations**: Automatische Handlungsempfehlungen

## Live Demo

🌐 **Production**: https://apps.srv947487.hstgr.cloud/agent-dashboard/

## Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS 3** - Styling
- **GitHub API** - Issue Tracking
- **ClawdBot API** - Auth & Rate-Limit Monitoring

## Installation

```bash
npm install
```

## Development

```bash
# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment

Das Dashboard nutzt die API unter `/api/*` (proxied via Caddy in Production).

Für lokale Entwicklung muss die API auf `http://localhost:3456` laufen (siehe API-Repo).

## Project Structure

```
src/
├── App.tsx           # Main Dashboard Component
├── main.tsx          # React Entry Point
└── index.css         # Global Styles

public/               # Static Assets
```

## API Integration

### Endpoints

- `GET /api/projects` - GitHub Issues & PRs
- `GET /api/clawdbot-status` - Auth & Rate-Limit Status

### ClawdBot Status Response

```typescript
interface ClawdBotStatus {
  status: string
  timestamp: string
  auth: {
    activeProfile: string  // "anthropic:claude-cli" | "anthropic:api-key-fallback"
    oauthToken: {
      hoursRemaining: number
      minutesRemaining: number
      isValid: boolean
      needsRenewal: boolean
    }
  }
  rateLimit: {
    detected: boolean
    occurrences: number
    lastDetected: string | null
  }
  recommendations: Array<{
    severity: "critical" | "high" | "medium" | "low"
    message: string
    action: string
  }>
}
```

## Deployment

### Production (VPS)

```bash
npm run build
cp -r dist/* /var/www/html/agent-dashboard/
```

### Caddy Configuration

```caddyfile
apps.srv947487.hstgr.cloud {
    @dashboard path /agent-dashboard /agent-dashboard/*
    handle @dashboard {
        try_files {path} {path}/ /agent-dashboard/index.html
        file_server
    }

    @api path /api/*
    handle @api {
        reverse_proxy 127.0.0.1:3456
    }
}
```

## Monitoring Features

### GitHub Projects

- Thai-Blitz AI Language Coach
- Icon Selection UI
- ORCHESTRATOR

### ClawdBot Status Widget

- **OAuth Token Countdown**: Visueller Countdown bis Token-Ablauf
- **Rate Limit Detection**: Echtzeit-Erkennung von API-Limits
- **Active Profile Indicator**: Zeigt ob OAuth (kostenlos) oder API-Key (paid) genutzt wird
- **Recommendations**: Automatische Handlungsvorschläge

### Alert Levels

- 🔴 **Critical**: Rate-Limit aktiv, sofortige Aktion nötig
- 🟠 **High**: Token läuft in <4h ab
- 🟡 **Medium**: API-Key aktiv (kostet Geld)
- 🔵 **Low**: Informativ

## Related Repositories

- **API Backend**: https://github.com/DanielIshi/clawdbot-agent-dashboard/tree/api
- **ClawdBot**: https://github.com/clawdbot/clawdbot

## License

Private - Daniel Ishimwe

## Author

Daniel Ishimwe - ClawdBot Multi-Agent Team 2026
