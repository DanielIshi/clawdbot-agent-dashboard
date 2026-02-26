/**
 * useSessionOutputDiff - Pollt tmux-Output pro Session und erkennt neue Aktivität via Diff
 *
 * - Pollt alle 2s `/api/sessions/:name/tmux-output` pro Session
 * - Stripped ANSI-Codes + Status-Bar-Noise
 * - Extrahiert bis zu MAX_LINES sinnvolle Content-Zeilen
 * - Gibt Map<sessionName, { lines, type, ts }> zurück
 */

import { useState, useEffect, useRef } from 'react'

export type BubbleType = 'input' | 'tool' | 'output'

export interface SessionActivity {
  lines: string[]   // Multi-line content (up to MAX_LINES)
  type: BubbleType
  ts: number
}

const MAX_LINES = 6  // Maximale Anzahl Zeilen in der Sprechblase

// Strip ANSI escape codes + carriage returns
const stripAnsi = (s: string): string =>
  s.replace(/\x1b\[[0-9;]*[mGKHFJA-Za-z]/g, '').replace(/\r/g, '')

// Noise-Zeilen überspringen (Status-Bar, Trennlinien, tmux-Chrome)
const NOISE_LINE = /^[\s─═\-=|╔╗╚╝╠╣╦╩╬❯>$#*+⏵⏸⏺]+$/ // Nur Sonderzeichen
const NOISE_CONTENT = /bypass permissions|shift\+tab|esc to interrupt|Auto-update failed|claude doctor|npm i -g @anthropic|Pontificating…|thought for \d|api\/sessions/i
const NOISE_SHORT = 3 // Zeilen kürzer als N Zeichen überspringen

function isNoise(line: string): boolean {
  if (line.length < NOISE_SHORT) return true
  if (NOISE_LINE.test(line)) return true
  if (NOISE_CONTENT.test(line)) return true
  return false
}

// Typ einer Zeile bestimmen
function lineType(line: string): BubbleType {
  const l = line.trim()
  // User-Eingabe: ❯ prefix oder klassische Prompt-Marker
  if (/^[❯>]\s/.test(l) || /^(Human:|User:|Input:)/i.test(l)) return 'input'
  // Tool-Result: ⎿ prefix oder bekannte Tool-Namen
  if (/^⎿/.test(l) || /^(Bash|Read|Write|Edit|Glob|Grep|WebFetch|WebSearch|Task\()/i.test(l)) return 'tool'
  // Claude-Antwort: ● prefix oder langer Satz
  return 'output'
}

// Dominant-Typ der extrahierten Zeilen bestimmen
function dominantType(lines: string[]): BubbleType {
  const counts: Record<BubbleType, number> = { input: 0, tool: 0, output: 0 }
  lines.forEach(l => counts[lineType(l)]++)
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as BubbleType)
}

// Letzte MAX_LINES sinnvolle Content-Zeilen extrahieren (bottom-up)
function extractContentLines(rawOutput: string): string[] {
  const lines = rawOutput.split('\n')
  const result: string[] = []

  for (let i = lines.length - 1; i >= 0 && result.length < MAX_LINES; i--) {
    const clean = stripAnsi(lines[i]).trim()
    if (!isNoise(clean)) {
      // Zeile truncaten auf max 55 Zeichen
      result.unshift(clean.length > 55 ? clean.slice(0, 52) + '…' : clean)
    }
  }

  return result
}

export function useSessionOutputDiff(sessionNames: string[]): Map<string, SessionActivity> {
  const [activities, setActivities] = useState<Map<string, SessionActivity>>(new Map())
  const prevOutputRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (sessionNames.length === 0) return

    const poll = async () => {
      const updates = new Map<string, SessionActivity>()

      await Promise.all(
        sessionNames.map(async (name) => {
          try {
            const res = await fetch(`/api/sessions/${encodeURIComponent(name)}/tmux-output`)
            if (!res.ok) return
            const data = await res.json()
            const raw: string = data.output || ''

            const prev = prevOutputRef.current.get(name) ?? ''

            if (raw !== prev) {
              prevOutputRef.current.set(name, raw)

              const lines = extractContentLines(raw)
              if (lines.length > 0) {
                updates.set(name, {
                  lines,
                  type: dominantType(lines),
                  ts: Date.now(),
                })
              }
            }
          } catch {
            // Ignore fetch errors silently
          }
        })
      )

      if (updates.size > 0) {
        setActivities(prev => {
          const next = new Map(prev)
          updates.forEach((v, k) => next.set(k, v))
          return next
        })
      }
    }

    poll()
    const iv = setInterval(poll, 2000)
    return () => clearInterval(iv)
  }, [sessionNames.join(',')])

  return activities
}
