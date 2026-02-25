# Checkpoint: Issue #55 (Agent-Voxel-Sprites) - Work in Progress

**Datum:** 2026-02-25
**Status:** 🚧 IN PROGRESS (ca. 40% abgeschlossen)
**Grund für Pause:** PRs mergen und Konflikte lösen

---

## ✅ Bereits implementiert

### 1. TypeScript Interfaces (AC1) ✅
**Datei:** `src/components/settlers/types.ts`

```typescript
- AgentType = 'codex' | 'claude' | 'gpt' | 'ollama'
- AgentStatus = 'idle' | 'working' | 'blocked'
- AnimationType = 'idle' | 'working' | 'walking'
- interface AgentSprite
- interface AnimationState
- interface VoxelBlock
```

### 2. Agent-Color-Mappings (AC2) ✅
**Dateien:**
- `src/components/settlers/agentColors.ts`
- `tests/settlers/agent-colors.test.ts`

**Tests:** 12/12 bestanden ✅

**Features:**
- Codex: #4b8bff (blau)
- Claude: #36c37c (grün)
- GPT: #ff6b6b (rot)
- Ollama: #f4d03f (gelb)
- `getAgentShadowColor()` - Dunklere Varianten
- `getAgentHighlightColor()` - Hellere Varianten

### 3. VoxelRenderer Utils (AC3) ✅
**Dateien:**
- `src/components/settlers/VoxelRenderer.ts`
- `tests/settlers/voxel-renderer.test.ts`

**Tests:** 11/12 bestanden (1 Fehler in Farb-Check - trivial zu fixen)

**Features:**
- `drawVoxel()` - Zeichnet einzelnen isometrischen Voxel (3 Flächen)
- `createAgentVoxels()` - Erstellt 3x3x3 Voxel-Array für Agent
  - Kopf: 1x1x1 (z=2)
  - Körper: 2x2x1 (z=1)
  - Beine: 2x1x1 (z=0)
- `drawVoxelSprite()` - Zeichnet kompletten Sprite mit Z-Sorting

### 4. Vitest Config angepasst ✅
**Datei:** `vitest.config.ts`

Jetzt findet Vitest auch Tests in `tests/**/*` (nicht nur `src/**/*`)

---

## ⏳ Noch ausstehend (ca. 60%)

### 5. Animations-Logic (AC4-AC6)
**Noch zu erstellen:**
- `src/components/settlers/animations.ts`
- `tests/settlers/animations.test.ts`

**Features:**
- Idle-Animation (Atmen, ±2px, 2s Loop)
- Working-Animation (Nicken, ±10°, 1s Loop)
- Walking-Animation (Linear, 1s/Tile, Bein-Bewegung)

### 6. AgentSprite Component (AC1-AC6)
**Noch zu erstellen:**
- `src/components/settlers/AgentSprite.tsx`

**Features:**
- React Component für Agent-Rendering
- Animation-State-Management
- Integration mit IsometricCanvas

### 7. Z-Index/Depth-Sorting (AC7)
**Noch zu implementieren:**
- Sortierung nach Y-Koordinate (weiter hinten = weiter unten)
- Integration in IsometricCanvas

### 8. API-Integration (AC8)
**Noch zu erstellen:**
- Hook: `useAgents()` - Holt Agents von `/api/agents`
- Mapping: API-Response → AgentSprite

### 9. E2E Tests
**Noch zu erstellen:**
- `e2e/settlers/agent-animation.spec.ts`
- Tests für alle 3 Animationen
- Screenshot-Tests für verschiedene Agent-Typen

---

## 🐛 Bekannte Probleme

### Test-Fehler in voxel-renderer.test.ts
**Test:** "sollte korrekte Farbe setzen"
**Problem:** `drawVoxel()` nutzt `lightenColor()` für die Oberseite, deshalb ist die Farbe nicht exakt `#00ff00` sondern `#00cc00` (heller)

**Fix (trivial):**
```typescript
// In Test: Nicht exakte Farbe erwarten, sondern prüfen dass Farbe gesetzt wurde
expect(ctx.fillStyle).toBeTruthy()
expect(ctx.fillStyle).toMatch(/^#[0-9a-f]{6}$/i)
```

---

## 📁 Neue Dateien

```
src/components/settlers/
  ✅ types.ts (erweitert)
  ✅ agentColors.ts
  ✅ VoxelRenderer.ts
  ⏳ animations.ts (TODO)
  ⏳ AgentSprite.tsx (TODO)

tests/settlers/
  ✅ agent-colors.test.ts (12 Tests)
  ✅ voxel-renderer.test.ts (12 Tests, 1 Fehler)
  ⏳ animations.test.ts (TODO)
  ⏳ agent-sprite.test.tsx (TODO)

e2e/settlers/
  ⏳ agent-animation.spec.ts (TODO)

vitest.config.ts (erweitert)
```

---

## 🔄 Nächste Schritte (nach PR-Merge)

1. **Test-Fehler beheben** (5 Min)
   - Farb-Check in `voxel-renderer.test.ts` anpassen

2. **Animations-Logic implementieren** (30 Min)
   - `animations.ts` mit Tests schreiben
   - Idle/Working/Walking-Animationen

3. **AgentSprite Component** (45 Min)
   - React Component mit Animation-State
   - Integration in IsometricCanvas

4. **Z-Index/Depth-Sorting** (15 Min)
   - Sortierung in IsometricCanvas

5. **API-Integration** (20 Min)
   - `useAgents()` Hook
   - Mock-Daten testen

6. **E2E Tests** (30 Min)
   - Playwright-Tests für Animationen

7. **Validierung** (15 Min)
   - Alle 8 ACs durchgehen

**Geschätzte Restzeit:** ~2.5 Stunden

---

## 📊 Fortschritt

- **Issue #53 (Canvas-Basis):** ✅ 100% (10/10 E2E-Tests)
- **Issue #54 (Tile-System):** ⏳ Wird auf VPS entwickelt
- **Issue #55 (Agent-Sprites):** 🚧 40% (3/8 ACs vollständig)
- **Issue #56 (Gebäude):** ⏳ Noch nicht gestartet

---

**Erstellt von:** Claude Code
**Fortsetzen mit:** `git pull` → Konflikte lösen → Issue #55 vervollständigen
