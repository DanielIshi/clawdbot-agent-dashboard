/**
 * Deterministische Farb-Generierung aus Projekt-Namen
 * Issue #56, AC2: Hash-basierte Farbzuweisung
 *
 * Konvertiert Projekt-Namen in konsistente HSL-Farben via DJB2-Hash.
 */

/**
 * DJB2 Hash-Algorithmus (deterministisch)
 * @param str - Input-String (z.B. Projektname)
 * @returns Positive Integer-Hash
 */
export function stringToHash(str: string): number {
  let hash = 5381

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i) // hash * 33 + c
  }

  // Ensure positive number
  return Math.abs(hash)
}

/**
 * Konvertiert Hash zu HSL-Farbe
 * @param hash - Positive Integer
 * @returns HSL-String im Format "hsl(H, 70%, L%)"
 */
export function hashToHSL(hash: number): string {
  // Hue: 0-360 Grad (volle Farbpalette)
  const hue = hash % 361

  // Saturation: Fixiert auf 70% (kräftige Farben)
  const saturation = 70

  // Lightness: 50-70% (variabel für Kontrast)
  const lightness = 50 + (hash % 21)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/**
 * Hauptfunktion: Projektname → Farbe
 * @param projectName - Name des Projekts
 * @returns HSL-Farbe (z.B. "hsl(240, 70%, 60%)")
 */
export function projectNameToColor(projectName: string): string {
  const hash = stringToHash(projectName)
  return hashToHSL(hash)
}
