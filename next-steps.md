# Issue #55: Agent-Voxel-Sprites - Next Steps

## ✅ Abgeschlossen
- [x] AC1: Agent-Sprite-Datenstruktur (TypeScript Interfaces + Tests)
- [x] AC2: Farb-Kodierung (agentColors.ts bereits vorhanden)
- [x] AC3: Voxel-Rendering Basis (drawVoxel, createAgentVoxels, drawVoxelSprite)

## 🔄 In Arbeit
- [ ] AC4: Idle-Animation (Atmen/Warten)
- [ ] AC5: Working-Animation (Hämmern/Tippen)
- [ ] AC6: Walking-Animation (Bewegen zwischen Tiles)
- [ ] AC7: Z-Index/Depth-Sorting (mehrere Agents)
- [ ] AC8: Agent-Sprite von API-Daten ableiten

## 📋 Implementierungs-Reihenfolge

### 1. Animations-System (AC4, AC5, AC6)
**Dateien:**
- `src/components/settlers/animations.ts` - Animation Logic
- `tests/settlers/animations.test.ts` - Unit Tests
- `e2e/settlers/agent-animation.spec.ts` - E2E Tests (Playwright)

**Vorgehen (TDD):**
1. Tests ZUERST schreiben (aus AC ableiten)
2. Basis-Animation-Loop implementieren (`updateAnimation()`)
3. AC4: Idle (sin-wave, ±2px, 2s loop)
4. AC5: Working (nicken, ±10°, 1s loop)
5. AC6: Walking (linear, Beine, Richtung, 1s/tile)

### 2. AgentSprite Component (React)
**Dateien:**
- `src/components/settlers/AgentSprite.tsx`
- `tests/settlers/agent-sprite-component.test.tsx`

**Integration:**
- Nutzt `VoxelRenderer.drawVoxelSprite()`
- Nutzt `animations.ts` für Animation-Updates
- Rendert auf IsometricCanvas

### 3. Z-Index/Depth-Sorting (AC7)
**Dateien:**
- `src/components/settlers/AgentLayer.tsx` - Layer für alle Agents
- `tests/settlers/depth-sorting.test.ts` - Screenshot-Test

**Logik:**
- Sortiere Agents nach `position.y` (höher y = weiter vorne)
- Render-Reihenfolge: niedrig → hoch

### 4. API-Integration (AC8)
**Dateien:**
- `src/components/settlers/agentSpriteFactory.ts` - Factory aus API-Daten
- `tests/settlers/agent-sprite-factory.test.ts` - Mock-API-Tests

**Mapping:**
```typescript
API Agent → AgentSprite
- id → id
- name → name
- type → type (codex|claude|gpt|ollama)
- status → status + animation
- currentIssueId → position (später aus Issue-Position ableiten)
```

### 5. Performance-Test (Definition of Done)
**Datei:** `e2e/settlers/performance.spec.ts`

**Anforderung:** 60 FPS mit 10 Agents

## 🧪 Test-Strategie
- **Unit Tests:** Jede Funktion einzeln (90% Coverage)
- **Integration Tests:** Components mit Mocks
- **E2E Tests (Playwright):** Visuell + Performance
- **Screenshot Tests:** Farben, Z-Index, Animationen

## ⚠️ Wichtige Regel
**Tests dürfen NICHT angepasst werden!** Sie sind von den ACs abgeleitet.
Nur die Implementierung wird geändert, um Tests zu erfüllen.
