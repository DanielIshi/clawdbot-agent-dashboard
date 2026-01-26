# Development Guide

## Quick Start

### Option 1: Auto-Start (Windows)

```bash
# Startet API + Frontend gleichzeitig
dev-start.bat
```

### Option 2: Manuell

```bash
# Terminal 1: API starten
cd ../clawdbot-agent-dashboard-api
npm start

# Terminal 2: Frontend starten
cd clawdbot-agent-dashboard
npm run dev
```

## URLs

- **Frontend**: http://localhost:5173/agent-dashboard/
- **API**: http://localhost:3456
  - Health: http://localhost:3456/health
  - ClawdBot Status: http://localhost:3456/api/clawdbot-status
  - Projects: http://localhost:3456/api/projects

## API Proxy

Vite proxied `/api/*` Requests automatisch zu `localhost:3456` (siehe `vite.config.ts`).

## Lokale ClawdBot-Daten simulieren

Da die API auf VPS-Dateien zugreift (`/root/.clawdbot/...`), die lokal nicht existieren:

### Option 1: Mock-Daten

Erstelle `clawdbot-agent-dashboard-api/mock-auth-profiles.json`:

```json
{
  "version": 1,
  "profiles": {
    "anthropic:claude-cli": {
      "provider": "anthropic",
      "type": "oauth",
      "access": "sk-ant-oat01-...",
      "expires": 1769503302000
    },
    "anthropic:api-key-fallback": {
      "provider": "anthropic",
      "type": "api_key",
      "access": "sk-ant-api03-..."
    }
  },
  "lastGood": {"anthropic": "anthropic:claude-cli"},
  "usageStats": {}
}
```

Passe `clawdbot-monitor.js` an:

```javascript
const AUTH_PROFILES = process.env.NODE_ENV === 'development'
  ? './mock-auth-profiles.json'
  : '/root/.clawdbot/agents/main/agent/auth-profiles.json';
```

### Option 2: SSH Tunnel zum VPS

```bash
# Port-Forwarding vom VPS
ssh -L 3456:localhost:3456 root@148.230.71.150

# Dann localhost:3456 nutzt die VPS-API
```

## GitHub API Rate Limits

GitHub API erlaubt 60 Requests/Stunde ohne Auth. Für mehr:

```bash
# GitHub CLI authentifizieren
gh auth login

# API nutzt dann automatisch deine Credentials
```

## Hot Reload

- **Frontend**: Vite Hot Module Replacement (automatisch)
- **API**: Nutze `npm run dev` (nodemon) für Auto-Restart

## Debugging

### Frontend (Chrome DevTools)

```javascript
// In App.tsx
console.log('ClawdBot Status:', clawdBotStatus)
```

### API (Node Inspector)

```bash
node --inspect server.js
# Chrome: chrome://inspect
```

## Common Issues

### API gibt 404 für /api/clawdbot-status

**Ursache**: `clawdbot-monitor.js` ist nicht im Modul-Export korrekt.

**Lösung**: Prüfe ob `require('./clawdbot-monitor')` funktioniert:

```bash
node -e "console.log(require('./clawdbot-monitor').getClawdBotStatus())"
```

### CORS-Fehler

**Ursache**: API läuft nicht oder Vite-Proxy falsch konfiguriert.

**Lösung**:
1. Prüfe ob API läuft: `curl http://localhost:3456/health`
2. Prüfe Vite-Proxy in `vite.config.ts`

### Frontend zeigt keine Daten

**Ursache**: API-Pfad falsch oder API gibt Fehler.

**Lösung**: Öffne Browser DevTools → Network → Prüfe API-Requests

## Build for Production

```bash
# Frontend
npm run build
# Output: dist/

# API (keine Build nötig, nutzt Node direkt)
# Einfach server.js deployen
```

## Testing

```bash
# API Health Check
curl http://localhost:3456/health

# ClawdBot Status
curl http://localhost:3456/api/clawdbot-status | jq

# Projects
curl http://localhost:3456/api/projects | jq
```

## Environment Variables

### Frontend (.env.local)

```bash
# Nicht nötig, nutzt Vite-Proxy
```

### API (.env.local)

```bash
# Optional: Custom paths
CLAWDBOT_AUTH_PROFILES=/path/to/auth-profiles.json
CLAWDBOT_LOG=/path/to/clawdbot.log
```

## Deployment

Siehe README.md für Production Deployment.
