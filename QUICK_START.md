# 🚀 Quick Start

## Option 1: Auto-Start (Empfohlen)

```bash
# Doppelklick auf:
dev-start.bat
```

Das startet automatisch:
1. API-Server (localhost:3456)
2. Frontend Dev-Server (localhost:5173)

## Option 2: Manuell

### Terminal 1: API starten

```bash
cd ..\clawdbot-agent-dashboard-api
npm start
```

### Terminal 2: Frontend starten

```bash
npm run dev
```

## URLs

- **Dashboard**: http://localhost:5173/agent-dashboard/
- **API Health**: http://localhost:3456/health

## Erste Schritte

1. Öffne http://localhost:5173/agent-dashboard/
2. Du siehst:
   - GitHub Issues von Thai-Blitz, Icon-Selection, ORCHESTRATOR
   - ClawdBot Auth Status (wird "error" zeigen, da VPS-Dateien fehlen)

## ClawdBot-Daten lokal testen

### Option A: SSH Tunnel (Einfach)

```bash
ssh -L 3456:localhost:3456 root@148.230.71.150
# Lasse Terminal offen
```

Dann zeigt localhost:3456 echte VPS-Daten!

### Option B: Mock-Daten (Offline)

Siehe `DEVELOPMENT.md`

## Production Build

```bash
npm run build
# Output: dist/
```

## Hilfe

- **Dokumentation**: `README.md`, `DEVELOPMENT.md`
- **GitHub Issues**: https://github.com/DanielIshi/clawdbot-agent-dashboard/issues
- **Live Demo**: https://apps.srv947487.hstgr.cloud/agent-dashboard/
