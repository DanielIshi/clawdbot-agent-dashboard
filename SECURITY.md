# Security Audit Report - Agent Dashboard

**Datum:** 2026-02-26
**Auditor:** Claude Code Security Agent
**Projekt:** agent-dashboard
**Scope:** Vollstaendiger Code-Audit (XSS, Injection, Secrets, Auth, API, Dependencies)

---

## Zusammenfassung

| Schweregrad | Anzahl |
|-------------|--------|
| CRITICAL    | 2      |
| HIGH        | 1      |
| MEDIUM      | 4      |
| LOW         | 2      |

---

## CRITICAL Findings

### C1: Command Injection via `exec()` in server.cjs

**Datei:** `server.cjs:97`
**Schweregrad:** CRITICAL

```javascript
exec(`tmux capture-pane -t ${sessionData.tmux_session} -p -S -100`, ...)
```

**Problem:** `sessionData.tmux_session` stammt aus einer externen JSON-Datei und wird ohne Sanitierung in `exec()` interpoliert. Ein manipulierter Session-Name wie `foo; rm -rf /` fuehrt zu **Remote Code Execution**.

**Fix:** `execFile()` statt `exec()` verwenden oder Session-Name gegen `/^[a-zA-Z0-9_-]+$/` validieren.

---

### C2: Path Traversal in server.cjs

**Datei:** `server.cjs:31-37, 82-89`
**Schweregrad:** CRITICAL

**Problem:** Dateisystempfade werden direkt aus URL-Parametern aufgebaut ohne Path-Traversal-Schutz. Angreifer koennen mit `../` auf beliebige Dateien des Servers zugreifen.

**Fix:** `path.resolve()` + Pruefen dass der resultierende Pfad innerhalb des erlaubten Verzeichnisses liegt.

---

## HIGH Findings

### H1: Keine Authentifizierung auf API und WebSocket

**Dateien:** `server.cjs`, `api/server.js` (alle Endpoints)
**Schweregrad:** HIGH

**Problem:** Saemtliche API-Endpoints (`/api/agents`, `/api/issues`, `/api/system/alert`, `/api/events`) und der WebSocket (`/ws/agentops`) haben **keinerlei Authentifizierung**. Jeder mit Netzwerkzugang kann:
- Agents erstellen/modifizieren
- Issues manipulieren
- System-Alerts senden
- Alle Events mitlesen

**Fix:** Mindestens API-Key-basierte Authentifizierung. WebSocket-Handshake mit Token-Validierung.

---

## MEDIUM Findings

### M1: Wildcard CORS

**Datei:** `api/server.js:31`
**Schweregrad:** MEDIUM

```javascript
res.header('Access-Control-Allow-Origin', '*')
```

**Problem:** Jede Website kann API-Requests senden. In Kombination mit fehlender Auth (H1) kann jede Website im Browser eines Nutzers die API missbrauchen.

**Fix:** CORS auf spezifische Origins beschraenken.

---

### M2: VPS-IP-Adresse in Dokumentation hartcodiert

**Dateien:** `DEVELOPMENT.md:77`, `QUICK_START.md:46`
**Schweregrad:** MEDIUM

```
ssh -L 3456:localhost:3456 root@148.230.71.150
```

**Problem:** Oeffentliche IP + `root`-User im Repo sichtbar. Erleichtert SSH Brute-Force und Port-Scanning.

**Fix:** IP durch Platzhalter `<VPS_IP>` ersetzen.

---

### M3: Produktions-Hostname in 12+ Stellen hartcodiert

**Dateien:** `src/test-minimal.tsx`, `e2e/*.spec.ts`, `README.md`, `.github/workflows/deploy.yml`, `playwright.prod.config.ts`
**Schweregrad:** MEDIUM

**Problem:** `apps.srv947487.hstgr.cloud` ist ueberall hartcodiert. Erschwert Umgebungswechsel und exponiert Infrastruktur.

**Fix:** Zentrale Environment-Variable `PROD_URL` verwenden.

---

### M4: Sensible Serverpfade im Code exponiert

**Datei:** `server.cjs:13-14`
**Schweregrad:** MEDIUM

```javascript
const SESSION_DIRS = ['/home/claude/.codex-agent/sessions', '/home/claude/.claude-agent/sessions'];
const LOG_DIRS = ['/home/claude/.codex-agent/logs', '/home/claude/.claude-agent/logs'];
```

**Problem:** Interne Dateisystem-Pfade des Servers sichtbar im oeffentlichen Repo.

**Fix:** In Environment-Variablen auslagern.

---

## LOW Findings

### L1: API-Key-Prefixe in Dokumentation

**Datei:** `DEVELOPMENT.md:51,57`
**Schweregrad:** LOW

Beispiel-Keys (`sk-ant-oat01-...`) verraten Key-Format/Provider.

**Fix:** Generische Platzhalter verwenden: `<YOUR_API_KEY>`.

---

### L2: SQLite-Datenbank in data/

**Datei:** `data/cost-data.sqlite`
**Schweregrad:** LOW

SQLite-DB mit Kostendaten. Zwar durch `.gitignore` (`*.db`) teilweise geschuetzt, aber `.sqlite` moeglicherweise nicht abgedeckt.

**Fix:** `*.sqlite` und `data/` explizit in `.gitignore` aufnehmen.

---

## Positiv-Befunde

| Bereich | Status |
|---------|--------|
| GitHub Actions Secrets | Korrekt via `${{ secrets.* }}` |
| `.env`-Dateien | Korrekt in `.gitignore` |
| React Frontend (JSX) | Auto-Escaping schuetzt gegen XSS |
| Keine hartcodierten API-Keys | Korrekt |
| Keine Private Keys im Repo | Korrekt |

---

## Priorisierte Handlungsempfehlungen

1. **SOFORT:** Command Injection in `server.cjs` fixen (C1)
2. **SOFORT:** Path Traversal in `server.cjs` fixen (C2)
3. **SOFORT:** API-Authentifizierung einfuehren (H1)
4. **KURZFRISTIG:** CORS einschraenken (M1)
5. **KURZFRISTIG:** VPS-IP aus Doku entfernen (M2)
6. **MITTELFRISTIG:** Hostname zentralisieren (M3)
7. **MITTELFRISTIG:** Serverpfade in Env-Vars (M4)
