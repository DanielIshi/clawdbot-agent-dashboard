# Detaillierte Spezifikation: Issues #7-11 Event Handler

**Status:** In Bearbeitung (TDD)
**Datum:** 2026-02-25
**Referenz:** Event Contracts v2.1

## Übersicht

Diese Spezifikation beschreibt die Event Handler für Issues #7-11. Alle Handler folgen einem einheitlichen Pattern:
1. Event-Validierung (Payload-Struktur)
2. State-Transition-Validierung (State Machines)
3. Invarianten-Prüfung (Business Rules)
4. State-Update
5. Event-Broadcasting
6. Feed-Eintrag (wo anwendbar)

---

## Issue #7: `issue.state_changed` Event Handler

### Beschreibung
Handler für Issue-State-Transitions mit Validierung, Persistierung und Broadcasting.

### Event-Typ
`issue.state_changed`

### Payload-Schema
```typescript
{
  issue_id: string,          // ID des Issue (Pflicht)
  from_state: string,        // Vorheriger State (Pflicht)
  to_state: string,          // Neuer State (Pflicht)
  reason?: string,           // Grund für Transition (Optional)
  changed_by: string,        // Wer hat geändert: 'user' | 'agent' | 'system' (Pflicht)
  metadata?: object          // Zusätzliche Metadaten (Optional)
}
```

### Akzeptanzkriterien (AC)

#### AC1: Payload-Validierung
**GIVEN** ein `issue.state_changed` Event wird empfangen
**WHEN** das Payload validiert wird
**THEN**
- `issue_id` muss vorhanden sein (String)
- `from_state` muss vorhanden sein (String)
- `to_state` muss vorhanden sein (String)
- `changed_by` muss vorhanden sein und einer der Werte: 'user', 'agent', 'system'
- Bei fehlendem Pflichtfeld → Error 400 mit spezifischer Fehlermeldung

**Test:** `handlers.test.js::AC1: issue.state_changed payload validation`

#### AC2: State-Transition-Validierung
**GIVEN** ein Issue im State `from_state`
**WHEN** eine Transition zu `to_state` versucht wird
**THEN**
- Transition muss in `IssueStateMachine.getValidTransitions(from_state)` erlaubt sein
- Valide Transitions:
  - `backlog → analysis, wip` ✅
  - `wip → review, done, blocked` ✅
  - `done → wip` ❌ (Issue darf nicht reaktiviert werden)
- Bei unerlaubter Transition → Error 400 mit `validTransitions` Array

**Test:** `handlers.test.js::AC2: issue.state_changed validates transitions`

#### AC3: Issue-State in DB aktualisieren
**GIVEN** eine valide State-Transition
**WHEN** der Handler das Event verarbeitet
**THEN**
- `issue.state` wird auf `to_state` gesetzt
- `issue.updatedAt` wird auf aktuelle Zeit gesetzt
- `issue.stateChangedBy` wird auf `changed_by` gesetzt
- State-Objekt wird in `state.issues` Map aktualisiert

**Test:** `handlers.test.js::AC3: issue.state_changed updates database state`

#### AC4: Event broadcasten
**GIVEN** State wurde erfolgreich aktualisiert
**WHEN** Broadcasting durchgeführt wird
**THEN**
- Event wird via WebSocket an alle Subscriber von `topic:issues:{issue_id}` gesendet
- Event wird via WebSocket an alle Subscriber von `topic:project:{project_id}` gesendet
- Broadcast-Payload enthält vollständiges Issue-Objekt

**Test:** `handlers.test.js::AC4: issue.state_changed broadcasts event`

#### AC5: Feed-Eintrag erstellen
**GIVEN** State wurde erfolgreich aktualisiert
**WHEN** Feed-Eintrag erstellt wird
**THEN**
- Eintrag im Event-Log mit Typ `issue.state_changed`
- Feed-Text: `"Issue #{number}: {title} → {to_state}" (by {changed_by})`
- Timestamp gesetzt
- Verknüpfung zu Issue-ID

**Test:** `handlers.test.js::AC5: issue.state_changed creates feed entry`

#### AC6: Idempotenz
**GIVEN** ein Issue ist bereits im State `to_state`
**WHEN** ein `issue.state_changed` Event mit `from_state=to_state` empfangen wird
**THEN**
- Transition wird übersprungen (No-Op)
- Kein Fehler, aber Warnung im Log
- Kein Event Broadcasting (nichts hat sich geändert)

**Test:** `handlers.test.js::AC6: issue.state_changed is idempotent`

---

## Issue #8: `issue.blocked` / `issue.unblocked` Events

### Beschreibung
Handler für Issue-Blockaden mit Grund-Tracking und automatischer Agent-Benachrichtigung.

### Event-Typen
- `issue.blocked`
- `issue.unblocked`

### Payload-Schema: `issue.blocked`
```typescript
{
  issue_id: string,              // ID des Issue (Pflicht)
  block_reason: string,          // Grund (Pflicht, min 10 Zeichen)
  block_category: string,        // Kategorie: 'dependency' | 'question' | 'technical' | 'resource' (Pflicht)
  expected_unblock_eta?: string, // ISO8601 Timestamp (Optional)
  blocked_by: string,            // Wer hat blockiert: 'user' | 'agent' | 'system' (Pflicht)
  external_incident_url?: string // Link zu externem Incident (Optional)
}
```

### Payload-Schema: `issue.unblocked`
```typescript
{
  issue_id: string,          // ID des Issue (Pflicht)
  resume_state: string,      // State in den zurückgekehrt wird (Pflicht)
  unblock_reason?: string,   // Grund für Unblock (Optional)
  unblocked_by: string       // Wer hat unblocked: 'user' | 'agent' | 'system' (Pflicht)
}
```

### Akzeptanzkriterien (AC)

#### AC1: Payload-Validierung für `issue.blocked`
**GIVEN** ein `issue.blocked` Event wird empfangen
**WHEN** das Payload validiert wird
**THEN**
- `issue_id` muss vorhanden sein
- `block_reason` muss vorhanden sein UND mindestens 10 Zeichen lang
- `block_category` muss einer der erlaubten Werte sein
- `blocked_by` muss vorhanden sein
- Bei Fehler → Error 400 mit spezifischer Fehlermeldung

**Test:** `handlers.test.js::AC1: issue.blocked payload validation`

#### AC2: Block Reason ist Pflichtfeld
**GIVEN** ein `issue.blocked` Event ohne `block_reason`
**WHEN** das Event verarbeitet wird
**THEN**
- Error 400: "block_reason ist Pflichtfeld (Invariant)"
- Issue bleibt unverändert

**Test:** `handlers.test.js::AC2: issue.blocked requires reason (invariant)`

#### AC3: Issue wird als blocked markiert
**GIVEN** ein valides `issue.blocked` Event
**WHEN** der Handler das Event verarbeitet
**THEN**
- `issue.isBlocked` wird auf `true` gesetzt
- `issue.blockReason` wird gespeichert
- `issue.blockCategory` wird gespeichert
- `issue.blockedAt` wird auf aktuelle Zeit gesetzt
- `issue.expectedUnblockEta` wird gespeichert (falls vorhanden)
- `issue.updatedAt` wird aktualisiert

**Test:** `handlers.test.js::AC3: issue.blocked marks issue as blocked`

#### AC4: Zugewiesener Agent wird ebenfalls blocked
**GIVEN** ein Issue ist einem Agent zugewiesen
**WHEN** das Issue blockiert wird
**THEN**
- `agent.status` wird auf `'blocked'` gesetzt
- `agent.blockReason` erhält Link zum Issue: `"Issue #{number} blocked: {block_reason}"`
- Agent behält `currentIssueId` (bleibt zugewiesen!)
- `agent.updatedAt` wird aktualisiert

**Test:** `handlers.test.js::AC4: issue.blocked blocks assigned agent`

#### AC5: Unblock setzt `resume_state`
**GIVEN** ein blockiertes Issue
**WHEN** `issue.unblocked` Event empfangen wird
**THEN**
- `issue.isBlocked` wird auf `false` gesetzt
- `issue.state` wird auf `resume_state` gesetzt
- `issue.blockReason`, `issue.blockCategory` werden auf `null` gesetzt
- `issue.unblockedAt` wird gesetzt
- `issue.updatedAt` wird aktualisiert

**Test:** `handlers.test.js::AC5: issue.unblocked sets resume_state`

#### AC6: Agent wird automatisch unblocked
**GIVEN** ein Issue mit zugewiesenem Agent wird unblocked
**WHEN** `issue.unblocked` Event verarbeitet wird
**THEN**
- `agent.status` wird auf `'working'` gesetzt (da noch zugewiesen)
- `agent.blockReason` wird auf `null` gesetzt
- Agent kann weiterarbeiten

**Test:** `handlers.test.js::AC6: issue.unblocked unblocks agent`

#### AC7: Link zu externem Incident speichern
**GIVEN** `issue.blocked` Event mit `external_incident_url`
**WHEN** Event verarbeitet wird
**THEN**
- `issue.externalIncidentUrl` wird gespeichert
- URL-Format wird validiert (muss https:// sein)
- Bei ungültiger URL → Warning im Log, aber kein Error

**Test:** `handlers.test.js::AC7: issue.blocked stores external incident link`

---

## Issue #9: `issue.completed` Event Handler

### Beschreibung
Handler für Issue-Abschluss mit Artifact-Tracking und automatischer Agent-Freigabe.

### Event-Typ
`issue.completed`

### Payload-Schema
```typescript
{
  issue_id: string,          // ID des Issue (Pflicht)
  final_state: string,       // 'done' | 'cancelled' (Pflicht)
  result?: string,           // Beschreibung des Ergebnisses (Optional)
  artifacts?: {              // Artefakte (Optional)
    commit?: string,         // Git Commit SHA
    build_id?: string,       // CI Build ID
    test_report_url?: string,// URL zum Test-Report
    pr_url?: string          // URL zum Pull Request
  },
  completed_by: string,      // Wer hat abgeschlossen: 'user' | 'agent' | 'system' (Pflicht)
  duration_seconds?: number  // Bearbeitungsdauer (Optional)
}
```

### Akzeptanzkriterien (AC)

#### AC1: Payload-Validierung
**GIVEN** ein `issue.completed` Event wird empfangen
**WHEN** das Payload validiert wird
**THEN**
- `issue_id` muss vorhanden sein
- `final_state` muss `'done'` oder `'cancelled'` sein
- `completed_by` muss vorhanden sein
- Bei Fehler → Error 400

**Test:** `handlers.test.js::AC1: issue.completed payload validation`

#### AC2: final_state = done oder cancelled
**GIVEN** ein `issue.completed` Event mit `final_state='in_progress'`
**WHEN** Event verarbeitet wird
**THEN**
- Error 400: "final_state must be 'done' or 'cancelled'"

**Test:** `handlers.test.js::AC2: issue.completed validates final_state`

#### AC3: Artifacts speichern
**GIVEN** ein `issue.completed` Event mit `artifacts`
**WHEN** Event verarbeitet wird
**THEN**
- `issue.artifacts` wird als JSON gespeichert
- Jedes Artifact-Feld wird validiert (Strings, URLs)
- `commit` wird auf SHA-Format geprüft (optional)

**Test:** `handlers.test.js::AC3: issue.completed stores artifacts`

#### AC4: Agent unassignen
**GIVEN** ein Issue ist einem Agent zugewiesen
**WHEN** `issue.completed` Event verarbeitet wird
**THEN**
- `issue.assignedAgentId` wird auf `null` gesetzt
- `agent.currentIssueId` wird auf `null` gesetzt
- `agent.status` wird auf `'idle'` gesetzt
- `agent.lastCompletedIssue` wird auf `issue.id` gesetzt
- `agent.completionCount` wird inkrementiert

**Test:** `handlers.test.js::AC4: issue.completed unassigns agent`

#### AC5: Issue darf nicht reaktiviert werden
**GIVEN** ein Issue im State `'done'`
**WHEN** ein `issue.state_changed` Event mit `to_state='wip'` empfangen wird
**THEN**
- Error 400: "Cannot reactivate completed issue"
- `IssueStateMachine` verbietet Transition von `done` zu anderen States

**Test:** `handlers.test.js::AC5: completed issue cannot be reactivated`

#### AC6: Completion-Timestamp und Dauer
**GIVEN** ein `issue.completed` Event
**WHEN** Event verarbeitet wird
**THEN**
- `issue.completedAt` wird auf aktuelle Zeit gesetzt
- `issue.durationSeconds` wird berechnet: `(completedAt - createdAt) / 1000`
- Falls `duration_seconds` im Payload → überschreibt Berechnung

**Test:** `handlers.test.js::AC6: issue.completed sets timestamp and duration`

---

## Issue #10: `agent.status_changed` Event Handler

### Beschreibung
Handler für Agent-Status-Changes mit Validierung und Health-Tracking.

### Event-Typ
`agent.status_changed`

### Payload-Schema
```typescript
{
  agent_id: string,          // ID des Agent (Pflicht)
  from_status: string,       // Vorheriger Status (Pflicht)
  to_status: string,         // Neuer Status: 'idle' | 'working' | 'blocked' (Pflicht)
  role?: string,             // Agent-Rolle: 'coder' | 'reviewer' | 'tester' (Optional)
  activity?: string,         // Aktuelle Aktivität (Optional, max 200 Zeichen)
  health?: {                 // Health-Status (Optional)
    status: string,          // 'healthy' | 'degraded' | 'unhealthy'
    lastHeartbeat: string,   // ISO8601 Timestamp
    errorCount: number       // Anzahl Fehler seit letztem Reset
  },
  reason?: string            // Grund für Status-Change (Optional)
}
```

### Akzeptanzkriterien (AC)

#### AC1: Payload-Validierung
**GIVEN** ein `agent.status_changed` Event wird empfangen
**WHEN** das Payload validiert wird
**THEN**
- `agent_id` muss vorhanden sein
- `from_status` muss vorhanden sein
- `to_status` muss einer der erlaubten Werte sein: `'idle'`, `'working'`, `'blocked'`
- Bei Fehler → Error 400

**Test:** `handlers.test.js::AC1: agent.status_changed payload validation`

#### AC2: Status-Transitions validieren
**GIVEN** ein Agent im Status `from_status`
**WHEN** Transition zu `to_status` versucht wird
**THEN**
- Transition muss in `AgentStateMachine.getValidTransitions(from_status)` erlaubt sein
- Valide Transitions:
  - `idle → working` ✅
  - `working → idle, blocked` ✅
  - `blocked → working, idle` ✅
- Bei unerlaubter Transition → Error 400

**Test:** `handlers.test.js::AC2: agent.status_changed validates transitions`

#### AC3: `working` erfordert `issue_id != null`
**GIVEN** ein Agent soll auf Status `'working'` gesetzt werden
**WHEN** `agent.currentIssueId === null`
**THEN**
- Error 400: "Cannot set status to 'working' without assigned issue (Invariant)"

**Test:** `handlers.test.js::AC3: working status requires assigned issue`

#### AC4: Health-Status tracken
**GIVEN** ein `agent.status_changed` Event mit `health`-Objekt
**WHEN** Event verarbeitet wird
**THEN**
- `agent.health.status` wird aktualisiert
- `agent.health.lastHeartbeat` wird gespeichert
- `agent.health.errorCount` wird aktualisiert
- Falls `health.status === 'unhealthy'` UND `errorCount > 5` → System-Alert

**Test:** `handlers.test.js::AC4: agent.status_changed tracks health`

#### AC5: Activity-Text speichern
**GIVEN** ein `agent.status_changed` Event mit `activity`
**WHEN** Event verarbeitet wird
**THEN**
- `agent.currentActivity` wird auf `activity` gesetzt
- Text wird auf max 200 Zeichen begrenzt (Truncate)
- Timestamp `agent.activityUpdatedAt` wird gesetzt

**Test:** `handlers.test.js::AC5: agent.status_changed stores activity`

#### AC6: Automatische Status-Sync bei Block
**GIVEN** ein Agent ist `'working'` und zugewiesenes Issue wird blockiert
**WHEN** `issue.blocked` Event verarbeitet wird
**THEN**
- Agent erhält automatisch `agent.status_changed` Event mit `to_status='blocked'`
- `agent.blockReason` erhält Link zum Issue

**Test:** `handlers.test.js::AC6: agent status syncs with issue block`

---

## Issue #11: `agent.assigned` / `agent.unassigned` Events

### Beschreibung
Handler für Agent-Zuweisungen mit Load-Balancing-Tracking und Invariant-Enforcement.

### Event-Typen
- `agent.assigned`
- `agent.unassigned`

### Payload-Schema: `agent.assigned`
```typescript
{
  agent_id: string,              // ID des Agent (Pflicht)
  issue_id: string,              // ID des Issue (Pflicht)
  role?: string,                 // Rolle für diese Zuweisung (Optional)
  assignment_reason: string,     // Grund: 'manual' | 'auto_load_balance' | 'failover' (Pflicht)
  assigned_by: string,           // Wer hat zugewiesen: 'user' | 'system' (Pflicht)
  priority?: number,             // Priorität 1-5 (Optional, default 3)
  expected_completion_eta?: string // ISO8601 Timestamp (Optional)
}
```

### Payload-Schema: `agent.unassigned`
```typescript
{
  agent_id: string,          // ID des Agent (Pflicht)
  issue_id: string,          // ID des Issue (Pflicht)
  unassigned_by: string,     // Wer hat unassigned: 'user' | 'agent' | 'system' (Pflicht)
  reason?: string,           // Grund für Unassignment (Optional)
  next_status: string        // Agent-Status nach Unassignment: 'idle' | 'working' (Pflicht)
}
```

### Akzeptanzkriterien (AC)

#### AC1: Payload-Validierung
**GIVEN** ein `agent.assigned` Event wird empfangen
**WHEN** das Payload validiert wird
**THEN**
- `agent_id` und `issue_id` müssen vorhanden sein
- `assignment_reason` muss einer der erlaubten Werte sein
- `assigned_by` muss vorhanden sein
- Agent und Issue müssen in DB existieren
- Bei Fehler → Error 404 oder 400

**Test:** `handlers.test.js::AC1: agent.assigned payload validation`

#### AC2: Max 1 Issue pro Agent (Invariant!)
**GIVEN** ein Agent hat bereits ein zugewiesenes Issue
**WHEN** ein weiteres `agent.assigned` Event für diesen Agent empfangen wird
**THEN**
- Error 400: "Agent already has assigned issue (Invariant: max 1 issue per agent)"
- `validateAssignment()` schlägt fehl

**Test:** `handlers.test.js::AC2: max one issue per agent (invariant)`

#### AC3: Assigned → Status = working
**GIVEN** ein Agent wird einem Issue zugewiesen
**WHEN** `agent.assigned` Event verarbeitet wird
**THEN**
- `agent.currentIssueId` wird auf `issue.id` gesetzt
- `agent.status` wird automatisch auf `'working'` gesetzt
- `agent.assignedAt` wird auf aktuelle Zeit gesetzt
- `issue.assignedAgentId` wird auf `agent.id` gesetzt

**Test:** `handlers.test.js::AC3: assigned sets agent status to working`

#### AC4: Unassigned → Status = idle (oder working)
**GIVEN** ein Agent wird von einem Issue getrennt
**WHEN** `agent.unassigned` Event verarbeitet wird
**THEN**
- `agent.currentIssueId` wird auf `null` gesetzt
- `agent.status` wird auf `next_status` gesetzt (aus Payload)
- Falls `next_status='working'` → anderes Issue muss bereits zugewiesen sein (Validation)
- `issue.assignedAgentId` wird auf `null` gesetzt

**Test:** `handlers.test.js::AC4: unassigned updates agent status`

#### AC5: Load-Balancing Reason tracken
**GIVEN** ein `agent.assigned` Event mit `assignment_reason='auto_load_balance'`
**WHEN** Event verarbeitet wird
**THEN**
- `agent.lastAssignmentReason` wird gespeichert
- `agent.autoAssignmentCount` wird inkrementiert
- Metrik für Load-Balancing-Statistik wird aktualisiert

**Test:** `handlers.test.js::AC5: tracks load balancing assignments`

#### AC6: Assignment blockiert wenn Agent blocked
**GIVEN** ein Agent im Status `'blocked'`
**WHEN** `agent.assigned` Event empfangen wird
**THEN**
- Error 400: "Cannot assign issue to blocked agent"
- Assignment wird abgelehnt

**Test:** `handlers.test.js::AC6: cannot assign to blocked agent`

#### AC7: Failover-Assignment
**GIVEN** ein `agent.assigned` Event mit `assignment_reason='failover'`
**WHEN** Event verarbeitet wird
**THEN**
- `issue.previousAgentId` wird auf vorherigen Agent gesetzt
- `issue.failoverCount` wird inkrementiert
- System-Alert wird ausgelöst: "Failover assignment detected"

**Test:** `handlers.test.js::AC7: tracks failover assignments`

---

## Gemeinsame Test-Strategien

### 1. Unit-Tests pro Event Handler
- Datei: `api/websocket/handlers.test.js`
- Framework: Vitest
- Mocking: In-Memory State, Mock WebSocket Broadcast

### 2. Integration-Tests
- Datei: `api/e2e/workflows.test.js`
- End-to-End Workflows:
  - Issue Creation → Assignment → State Changes → Completion
  - Agent Block → Unblock → Resume
  - Multi-Agent Load Balancing

### 3. Invarianten-Tests
- Datei: `api/state/invariants.test.js`
- Validierung aller Business Rules

### 4. Performance-Tests
- 1000 Events in < 1 Sekunde verarbeiten
- Kein Memory-Leak bei Event-Broadcasting

---

## Technische Notizen

### Event-Handler-Pattern
```javascript
async function handleIssueStateChanged(event) {
  // 1. Validate Payload
  const validation = validatePayload(event.payload, issueStateChangedSchema)
  if (!validation.valid) {
    throw new ValidationError(validation.errors)
  }

  // 2. Get Entities
  const issue = state.issues.get(event.payload.issue_id)
  if (!issue) throw new NotFoundError('Issue not found')

  // 3. Validate State Transition
  const sm = new IssueStateMachine(issue)
  if (!sm.canTransition(event.payload.to_state)) {
    throw new InvalidTransitionError(sm.getValidTransitions())
  }

  // 4. Update State
  sm.transition(event.payload.to_state)
  issue.updatedAt = new Date().toISOString()

  // 5. Broadcast Event
  await broadcast(event)

  // 6. Create Feed Entry (optional)
  await createFeedEntry(event)

  return { success: true, issue }
}
```

### Error-Handling
- Validation Errors → 400
- Not Found Errors → 404
- Invariant Violations → 400 mit spezifischem Fehlercode
- Alle anderen Errors → 500 mit Stack-Trace im Log

---

## Nächste Schritte

1. ✅ Spezifikation finalisieren
2. ⏳ Tests schreiben (TDD)
3. ⏳ Handler-Implementierung
4. ⏳ Integration in `server.js`
5. ⏳ E2E-Tests durchführen
6. ⏳ Dokumentation aktualisieren

**Verantwortlich:** TDD-Agent
**Deadline:** 2026-02-25 EOD
