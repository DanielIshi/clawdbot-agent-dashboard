/**
 * Sessions API Route
 * Liefert alle aktiven Codex/Claude Agent Sessions
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const SESSIONS_DIR = '/home/claude/.codex-agent/sessions'
const CLAUDE_SESSIONS_DIR = '/home/claude/.claude-agent/sessions'

function getSessions(dir: string) {
  try {
    if (!fs.existsSync(dir)) return []
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    return files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
        return data
      } catch { return null }
    }).filter(Boolean)
  } catch { return [] }
}

export async function GET() {
  const codexSessions = getSessions(SESSIONS_DIR)
  const claudeSessions = getSessions(CLAUDE_SESSIONS_DIR)
  
  const allSessions = [...codexSessions, ...claudeSessions].map(s => ({
    name: s.name || s.id,
    type: s.name?.includes('codex') ? 'codex' : 'claude',
    status: s.status || 'active',
    project: s.project || s.prompt?.substring(0, 50) || 'unknown',
    startedAt: s.start_time || s.startedAt || new Date().toISOString(),
    lastActivity: s.lastActivity || new Date().toISOString(),
    lastOutput: s.lastOutput || s.prompt || '',
    tool: s.tool || 'coder'
  }))

  return NextResponse.json(allSessions)
}
