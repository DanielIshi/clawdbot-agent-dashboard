/**
 * Session Log API Route
 * Returns chat messages in structured format
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LOGS_DIR = '/home/claude/.codex-agent/logs'
const CLAUDE_LOGS_DIR = '/home/claude/.claude-agent/logs'

interface ChatMessage {
  role: string
  text: string
  time?: string
}

/**
 * Parse log lines into structured chat messages
 */
function parseLogToChat(lines: string[]): ChatMessage[] {
  const chat: ChatMessage[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    // Try to detect role from line content
    let role = 'system'
    let text = line

    // Common patterns in agent logs
    if (line.includes('USER:') || line.includes('👤')) {
      role = 'user'
      text = line.replace(/^.*?(USER:|👤)\s*/, '')
    } else if (line.includes('AGENT:') || line.includes('ASSISTANT:') || line.includes('🤖')) {
      role = 'assistant'
      text = line.replace(/^.*?(AGENT:|ASSISTANT:|🤖)\s*/, '')
    } else if (line.includes('THINK:') || line.includes('💭')) {
      role = 'thinking'
      text = line.replace(/^.*?(THINK:|💭)\s*/, '')
    } else if (line.includes('TOOL:') || line.includes('🔧')) {
      role = 'tool'
      text = line.replace(/^.*?(TOOL:|🔧)\s*/, '')
    } else if (line.includes('✅') || line.includes('DONE:')) {
      role = 'tool_done'
      text = line.replace(/^.*?(DONE:|✅)\s*/, '')
    } else if (line.includes('📊') || line.includes('SUMMARY:')) {
      role = 'summary'
      text = line.replace(/^.*?(SUMMARY:|📊)\s*/, '')
    }

    // Extract timestamp if present (common format: [HH:MM:SS] or [YYYY-MM-DD HH:MM:SS])
    const timeMatch = line.match(/\[(\d{2}:\d{2}:\d{2})\]|\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/)
    const time = timeMatch ? (timeMatch[1] || timeMatch[2]) : undefined

    chat.push({ role, text: text.trim(), time })
  }

  return chat
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  // Try Codex logs
  let logPath = path.join(LOGS_DIR, `${name}.log`)
  if (!fs.existsSync(logPath)) {
    // Try Claude logs
    logPath = path.join(CLAUDE_LOGS_DIR, `${name}.log`)
  }

  if (!fs.existsSync(logPath)) {
    return NextResponse.json({ chat: [], name }, { status: 200 })
  }

  const content = fs.readFileSync(logPath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim()).slice(-100)
  const chat = parseLogToChat(lines)

  return NextResponse.json({ chat, name })
}
