-- Event Log Schema for Multi-Agent Command Center
-- SQLite Database

-- Events Table - stores all events for replay and audit
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    project_id TEXT NOT NULL,
    agent_id TEXT,
    issue_id TEXT,
    seq INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for fast event replay by sequence
CREATE INDEX IF NOT EXISTS idx_events_seq ON events(seq);

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Index for filtering by project
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);

-- Index for filtering by agent
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);

-- Agents Table - current state of all agents
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'working', 'blocked')),
    current_issue_id TEXT,
    block_reason TEXT,
    last_activity TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Issues Table - current state of all issues
CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    project_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'backlog' CHECK(state IN ('backlog', 'analysis', 'development', 'testing', 'review', 'done', 'cancelled')),
    assigned_agent_id TEXT,
    is_blocked INTEGER DEFAULT 0,
    block_reason TEXT,
    priority TEXT DEFAULT 'P2',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
);

-- Index for filtering issues by state
CREATE INDEX IF NOT EXISTS idx_issues_state ON issues(state);

-- Index for filtering issues by project
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);

-- Subscriptions Table - tracks WebSocket topic subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    subscribed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(client_id, topic)
);

-- Sequence counter for event ordering
CREATE TABLE IF NOT EXISTS sequence_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_seq INTEGER NOT NULL DEFAULT 0
);

-- Initialize sequence counter
INSERT OR IGNORE INTO sequence_counter (id, current_seq) VALUES (1, 0);
