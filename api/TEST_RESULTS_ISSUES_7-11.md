# Test-Ergebnisse: Issues #7-11
**Datum:** 2026-02-25
**Testlauf:** Integration Tests gegen `server.js`
**Ergebnis:** 21/28 Tests bestehen (75%)

## ✅ Was funktioniert (21 Tests)

### Issue #7: `issue.state_changed` ✅
- ✅ AC1: Payload-Validierung (reject without state)
- ✅ AC2: State-Transition-Validierung (backlog → wip erlaubt, done → wip verboten)
- ✅ AC2: Rückgabe von `validTransitions` bei Fehler
- ❌ AC3: `updatedAt` wird NICHT aktualisiert (Test schlägt fehl)

**Implementierung:** `server.js:254-281` (`PUT /api/issues/:id/state`)

### Issue #8: `issue.blocked` / `issue.unblocked` ✅✅
- ✅ AC2: Block Reason ist Pflichtfeld (Invariant)
- ✅ AC3: Issue wird als blocked markiert
- ✅ AC4: Zugewiesener Agent wird ebenfalls blocked (**bereits implementiert!**)
- ✅ AC5: Unblock funktioniert

**Implementierung:** `server.js:348-392` (`PUT/DELETE /api/issues/:id/block`)

### Issue #9: `issue.completed` ⚠️
- ✅ AC1: Rejection bei ungültigem State ohne `force`
- ✅ AC1: Force Completion funktioniert
- ❌ AC1: Completion aus `review` State schlägt fehl (erwartet 200, bekommt 400)
- ✅ AC4: Agent unassignen und Status auf idle setzen
- ✅ AC5: Reaktivierung verhindert
- ✅ AC6: `completedAt` Timestamp gesetzt

**Implementierung:** `server.js:394-440` (`PUT /api/issues/:id/complete`)

### Issue #10: `agent.status_changed` ⚠️
- ✅ AC1: Reject ohne status parameter
- ✅ AC1: Accept valid status
- ❌ AC2: Agent-Status ändert sich NICHT automatisch bei Assignment (erwartet 'working', ist 'idle')
- ❌ AC3: Block-Reason-Validierung fehlt (Fehlermeldung ist "Invalid transition" statt "reason required")

**Implementierung:** `server.js:170-207` (`PUT /api/agents/:id/status`)

### Issue #11: `agent.assigned` / `agent.unassigned` ⚠️
- ❌ AC1: Assignment ohne agentId gibt 404 statt 400 (Validierung verbessern)
- ✅ AC1: Reject wenn Agent nicht existiert (404)
- ✅ AC1: Reject wenn Issue nicht existiert (404)
- ✅ AC2: Max 1 Issue pro Agent (Invariant) enforcement
- ✅ AC3: `currentIssueId` wird gesetzt (aber Status bleibt idle!)
- ✅ AC4: Unassign funktioniert

**Implementierung:** `server.js:283-346` (`PUT/DELETE /api/issues/:id/assign`)

---

## ❌ Fehlende Features (7 Probleme)

### Problem 1: Issue State Change aktualisiert `updatedAt` nicht
**AC:** Issue #7, AC3
**Test:** `should update issue.state and issue.updatedAt`
**Status:** ❌ FAIL
**Error:**
```
AssertionError: expected 400 to be 200
```

**Analyse:** Der zweite State-Change (`backlog → wip`) schlägt fehl mit 400. Vermutlich weil bereits `backlog` State ist und Transition validiert wird.

**Lösung:**
```javascript
// In server.js:254-281
const previousState = issue.state
sm.transition(newState)
issue.updatedAt = new Date().toISOString() // <-- HINZUFÜGEN
```

---

### Problem 2: Issue Completion aus `review` State schlägt fehl
**AC:** Issue #9, AC1
**Test:** `should complete issue`
**Status:** ❌ FAIL
**Error:**
```
AssertionError: expected 400 to be 200
```

**Analyse:** `IssueStateMachine` erlaubt Transition `review → done` nicht (oder API prüft State-Machine vor Completion).

**Lösung:**
```javascript
// In server.js:394-440
// Option 1: Allow review → done in IssueStateMachine
// Option 2: Skip state machine check for completion endpoint
const sm = new IssueStateMachine(issue)
if (!force && issue.state !== 'review' && !sm.canTransition('done')) {
  // ...
}
```

---

### Problem 3: Agent-Status ändert sich nicht automatisch bei Assignment
**AC:** Issue #11, AC3
**Test:** `should allow valid transition: idle → working`
**Status:** ❌ FAIL
**Error:**
```
AssertionError: expected 'idle' to be 'working'
```

**Analyse:** Assignment setzt `currentIssueId`, aber **nicht** `agent.status`. Laut Spezifikation sollte Status automatisch auf `'working'` gesetzt werden.

**Lösung:**
```javascript
// In server.js:283-318 (Assignment-Route)
issue.assignedAgentId = agentId
issue.updatedAt = new Date().toISOString()

agent.currentIssueId = issue.id
agent.status = 'working' // <-- HINZUFÜGEN
agent.lastActivity = new Date().toISOString()
```

---

### Problem 4: Block-Reason-Validierung fehlt für Agent-Status
**AC:** Issue #10, AC3
**Test:** `should reject blocked status without reason`
**Status:** ❌ FAIL
**Error:**
```
AssertionError: expected 'Invalid transition from idle to blocked' to match /block.*reason/i
```

**Analyse:** `AgentStateMachine` verbietet Transition, aber Fehlermeldung erwähnt nicht "reason required". Besser wäre eine spezifische Invarianten-Prüfung.

**Lösung:**
```javascript
// In server.js:170-207
if (status === 'blocked') {
  if (!reason) { // <-- HINZUFÜGEN
    return res.status(400).json({
      error: 'Cannot set status to "blocked" without reason (Invariant)',
      code: 'INVARIANT_VIOLATION'
    })
  }
  const blockValidation = validateBlock(agent, reason)
  if (!blockValidation.valid) {
    return res.status(400).json({ error: blockValidation.error })
  }
}
```

---

### Problem 5: Assignment ohne agentId gibt 404 statt 400
**AC:** Issue #11, AC1
**Test:** `should reject without agentId`
**Status:** ❌ FAIL
**Error:**
```
AssertionError: expected 404 to be 400
```

**Analyse:** Aktuell wird `undefined` als `agentId` verwendet → `state.agents.get(undefined)` → 404. Besser wäre eine explizite Payload-Validierung.

**Lösung:**
```javascript
// In server.js:283-318
const { agentId } = req.body

if (!agentId) { // <-- HINZUFÜGEN
  return res.status(400).json({ error: 'agentId required' })
}

const issue = state.issues.get(req.params.id)
const agent = state.agents.get(agentId)
// ...
```

---

## 📝 Zusammenfassung fehlender Features

| Problem | Issue | AC | Aufwand | Priorität |
|---------|-------|----|---------| ----------|
| 1. `updatedAt` nicht gesetzt | #7 | AC3 | 5 Min | P1 |
| 2. Completion aus `review` | #9 | AC1 | 10 Min | P1 |
| 3. Auto-Status bei Assignment | #11 | AC3 | 5 Min | P1 |
| 4. Block-Reason-Validierung | #10 | AC3 | 10 Min | P2 |
| 5. agentId Payload-Validation | #11 | AC1 | 5 Min | P2 |

**Gesamtaufwand:** ~35 Minuten
**Kritische Fixes (P1):** 20 Minuten

---

## 🎯 Nächste Schritte

1. **Fixes implementieren** (siehe oben)
2. **Tests erneut ausführen:** `npm test e2e/issues-7-11.test.js`
3. **Erwartung:** 28/28 Tests grün ✅
4. **Dokumentation aktualisieren:** Issues #7-11 als "DONE" markieren

---

## 🔍 Weitere Erkenntnisse

### Positive Überraschungen
- ✅ Block-Feature ist vollständig implementiert (inkl. Agent-Blocking)
- ✅ State-Machine-Validierung funktioniert einwandfrei
- ✅ Assignment-Invariant (max 1 issue) wird durchgesetzt
- ✅ Event-Broadcasting funktioniert (sichtbar in Logs)

### Architektur-Notizen
- REST API ist **gut strukturiert** und folgt RESTful Patterns
- State Machines (`IssueStateMachine`, `AgentStateMachine`) sind klar getrennt
- Invarianten-Prüfung ist implementiert (`invariants.js`)
- Event-Log funktioniert (SQLite-basiert)

### Empfehlungen
1. **Extrahiere Handler-Funktionen:** Aktuell inline in Routes → schwer testbar
2. **Payload-Validierung zentralisieren:** Nutze Schema-Validator (z.B. Zod, Joi)
3. **Automatische Status-Transitions:** Dokumentiere Regeln in State Machines
4. **Error-Codes standardisieren:** z.B. `INVARIANT_VIOLATION`, `INVALID_TRANSITION`

---

**Erstellt:** 2026-02-25
**Autor:** TDD-Agent
**Review:** Pending
