/**
 * useSessionOutputDiff - Pollt tmux-Output pro Session und erkennt neue Aktivität via Diff
 *
 * - Pollt alle 2s `/api/sessions/:name/tmux-output` pro Session
 * - Vergleicht mit vorherigem Output → neue letzte Zeile = Aktivität
 * - Stripped ANSI-Codes
 * - Erkennt Typ: 'input' | 'tool' | 'output'
 * - Gibt Map<sessionName, { text, type, ts }> zurück
 */

import { useState, useEffect, useRef } from 'react'

export type BubbleType = 'input' | 'tool' | 'output'

export interface SessionActivity {
  text: string
  type: BubbleType
  ts: number
}

// Stripped ANSI escape codes
const stripAnsi = (str: string): string =>
  str.replace(/\x1b\[[0-9;]*[mGKHFJA-Za-z]/g, '').replace(/\r/g, '')

// Detect bubble type from cleaned line
function detectType(line: string): BubbleType {
  const l = line.trim()
  if (/^(>|Human:|User:|Input:|\$\s)/i.test(l)) return 'input'
  if (/Tool.*use|Bash|Read|Write|Edit|Glob|Grep|WebFetch|WebSearch|Task\(/i.test(l)) return 'tool'
  return 'output'
}

// Extract best representative line from output block
function extractBestLine(lines: string[]): string | null {
  // Work backwards: find last non-empty, non-noise line
  const noise = /^[\s$>─═\-=|╔╗╚╝╠╣╦╩╬#*+]+$/
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = stripAnsi(lines[i]).trim()
    if (l.length > 3 && !noise.test(l)) {
      return l.length > 80 ? l.slice(0, 77) + '…' : l
    }
  }
  return null
}

export function useSessionOutputDiff(sessionNames: string[]): Map<string, SessionActivity> {
  const [activities, setActivities] = useState<Map<string, SessionActivity>>(new Map())
  const prevLinesRef = useRef<Map<string, string>>(new Map()) // sessionName → last raw output

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

            const prev = prevLinesRef.current.get(name) ?? ''

            // Only process if output changed
            if (raw !== prev) {
              prevLinesRef.current.set(name, raw)

              // Get last 10 non-empty lines for context
              const lines = raw.split('\n').filter(l => l.trim().length > 0).slice(-10)
              const bestLine = extractBestLine(lines)

              if (bestLine) {
                updates.set(name, {
                  text: bestLine,
                  type: detectType(bestLine),
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

    // Initial poll
    poll()
    const iv = setInterval(poll, 2000)
    return () => clearInterval(iv)
  }, [sessionNames.join(',')]) // Re-run when session list changes

  return activities
}
