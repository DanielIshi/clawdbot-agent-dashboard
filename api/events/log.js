/**
 * Event Log - SQLite-based event storage
 * Provides persistent storage for events with replay capability
 */
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class EventLog {
  constructor(dbPath = ':memory:') {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initSchema()
  }

  /**
   * Initialize database schema
   */
  initSchema() {
    const schemaPath = join(__dirname, '..', 'db', 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    this.db.exec(schema)
    console.log('[EventLog] Schema initialized')
  }

  /**
   * Get next sequence number (atomic)
   * @returns {number}
   */
  getNextSeq() {
    const stmt = this.db.prepare(`
      UPDATE sequence_counter
      SET current_seq = current_seq + 1
      WHERE id = 1
      RETURNING current_seq
    `)
    const result = stmt.get()
    return result.current_seq
  }

  /**
   * Get current sequence number without incrementing
   * @returns {number}
   */
  getCurrentSeq() {
    const stmt = this.db.prepare('SELECT current_seq FROM sequence_counter WHERE id = 1')
    const result = stmt.get()
    return result?.current_seq || 0
  }

  /**
   * Append an event to the log
   * @param {Object} event - Event envelope
   * @returns {Object} Stored event with seq
   */
  append(event) {
    const stmt = this.db.prepare(`
      INSERT INTO events (event_id, event_type, timestamp, project_id, agent_id, issue_id, seq, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      event.event_id,
      event.event_type,
      event.timestamp,
      event.project_id,
      event.agent_id || null,
      event.issue_id || null,
      event.seq,
      JSON.stringify(event.payload)
    )

    console.log(`[EventLog] Appended: ${event.event_type} (seq: ${event.seq})`)
    return event
  }

  /**
   * Get events since a sequence number (for replay/sync)
   * @param {number} sinceSeq - Sequence number to start from (exclusive)
   * @param {number} limit - Max events to return
   * @returns {Object[]} Array of events
   */
  getEventsSince(sinceSeq = 0, limit = 1000) {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE seq > ?
      ORDER BY seq ASC
      LIMIT ?
    `)
    const rows = stmt.all(sinceSeq, limit)
    return rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    }))
  }

  /**
   * Get events by type
   * @param {string} eventType
   * @param {number} limit
   * @returns {Object[]}
   */
  getEventsByType(eventType, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE event_type = ?
      ORDER BY seq DESC
      LIMIT ?
    `)
    const rows = stmt.all(eventType, limit)
    return rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    }))
  }

  /**
   * Get events for a specific agent
   * @param {string} agentId
   * @param {number} limit
   * @returns {Object[]}
   */
  getEventsByAgent(agentId, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE agent_id = ?
      ORDER BY seq DESC
      LIMIT ?
    `)
    const rows = stmt.all(agentId, limit)
    return rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    }))
  }

  /**
   * Get events for a specific issue
   * @param {string} issueId
   * @param {number} limit
   * @returns {Object[]}
   */
  getEventsByIssue(issueId, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE issue_id = ?
      ORDER BY seq DESC
      LIMIT ?
    `)
    const rows = stmt.all(issueId, limit)
    return rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    }))
  }

  /**
   * Get event by ID
   * @param {string} eventId
   * @returns {Object|null}
   */
  getEvent(eventId) {
    const stmt = this.db.prepare('SELECT * FROM events WHERE event_id = ?')
    const row = stmt.get(eventId)
    if (!row) return null
    return {
      ...row,
      payload: JSON.parse(row.payload)
    }
  }

  /**
   * Get total event count
   * @returns {number}
   */
  getEventCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM events')
    return stmt.get().count
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close()
    console.log('[EventLog] Database closed')
  }
}

export default EventLog
