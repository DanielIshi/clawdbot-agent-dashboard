# Settlers Dashboard - UI Konzept

## Überblick
Isometrisches 3D-Dashboard zur Visualisierung von Agenten und Projekten im Settlers-Stil.

## Visuelle Elemente

### Isometrische 3D-Karte
- 45° Isometrische Ansicht (Three.js)
- Grid-basierte Karte mit Tiles
- Verschiedene Tile-Typen: Gras, Wasser, Sand

### Agent-Figuren
- Voxel-basierte Charaktere
- Farbkodierung nach Typ:
  - **Codex** = Blau (#4b8bff)
  - **Claude** = Grün (#36c37c)
- Animationen: Laufen, Arbeiten, Warten
- Sprechblasen mit Live-Output

### Projekt-Gebäude
- Voxel-Häuser pro Projekt
- Farbe basierend auf Projektname (deterministisch)
- Status-Indikatoren:
  - Aktiv = Normal
  - Issue = Baustelle (Gerüst)
  - PR = Fahnenmast

### Session Sidebar
- Liste aller aktiven Sessions
- Status: Active, Done, Failed
- Live-Output Vorschau
- Klick → Detailansicht

## Komponenten

### Dateien
- `public/index.html` - Einstiegspunkt
- `public/three-scene.js` - Three.js 3D Scene
- `public/game.js` - 2D Canvas Fallback
- `public/agents.js` - Session Polling
- `public/style.css` - Dashboard Styling
- `server.js` - Express API für Sessions

### Zustandsmodell
```javascript
{
  sessions: Array<Session>,
  activeSession: Session | null,
  projectBuildings: Map<projectName, Building>,
  agentSprites: Array<Sprite>
}
```

## Features
1. Isometrische 3D-Karte
2. Live Agent-Positionierung
3. Projekt-Gebäude auf der Karte
4. Sprechblasen mit Output
5. Session Sidebar mit Logs
6. 2D Canvas Fallback
