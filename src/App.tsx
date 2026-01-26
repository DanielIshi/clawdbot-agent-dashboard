import { useState, useEffect } from 'react'

interface Issue {
  number: number
  title: string
  state: string
  labels: { name: string; color: string }[]
  created_at: string
  updated_at: string
}

interface Project {
  name: string
  repo: string
  issues: Issue[]
  loading: boolean
  error?: string
}

interface ClawdBotStatus {
  status: string
  timestamp: string
  auth: {
    activeProfile: string
    oauthToken: {
      exists: boolean
      expires: string
      hoursRemaining: number
      minutesRemaining: number
      isValid: boolean
      needsRenewal: boolean
    }
    apiKeyFallback: {
      exists: boolean
      type: string
    }
  }
  rateLimit: {
    detected: boolean
    occurrences: number
    lastDetected: string | null
    recentErrors: string[]
  }
  recommendations: Array<{
    severity: string
    message: string
    action: string
  }>
}

const PROJECTS = [
  { name: 'Thai-Blitz', repo: 'DanielIshi/thai-blitz-ai-language-coach' },
  { name: 'Icon-Selection', repo: 'DanielIshi/icon-selection-ui' },
  { name: 'ORCHESTRATOR', repo: 'DanielIshi/ORCHESTRATOR' },
]

const REFRESH_INTERVAL = 10000 // 10 Sekunden
const API_BASE = ''
  ? 'http://localhost:3456'
  : 'http://127.0.0.1:3456'

function App() {
  const [projects, setProjects] = useState<Project[]>(
    PROJECTS.map(p => ({ ...p, issues: [], loading: true }))
  )
  const [clawdBotStatus, setClawdBotStatus] = useState<ClawdBotStatus | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [recentActivity, setRecentActivity] = useState<string[]>([])

  const fetchIssues = async (repo: string): Promise<Issue[]> => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&sort=updated`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          }
        }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      console.error(`Failed to fetch ${repo}:`, e)
      return []
    }
  }

  const fetchClawdBotStatus = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/api/clawdbot-status`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setClawdBotStatus(data)
    } catch (e) {
      console.error('Failed to fetch ClawdBot status:', e)
    }
  }

  const refreshData = async () => {
    const newProjects = await Promise.all(
      PROJECTS.map(async (p) => {
        const issues = await fetchIssues(p.repo)
        return { ...p, issues, loading: false }
      })
    )

    // Detect new/changed issues
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    const recent: string[] = []

    newProjects.forEach(p => {
      p.issues.forEach(issue => {
        const updated = new Date(issue.updated_at)
        if (updated > oneMinuteAgo) {
          recent.push(`${p.name} #${issue.number}: ${issue.title.slice(0, 40)}...`)
        }
      })
    })

    if (recent.length > 0) {
      setRecentActivity(prev => [...recent, ...prev].slice(0, 20))
    }

    setProjects(newProjects)
    await fetchClawdBotStatus()
    setLastUpdate(new Date())
  }

  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const getStatusCounts = (issues: Issue[]) => {
    const open = issues.filter(i => i.state === 'open').length
    const closed = issues.filter(i => i.state === 'closed').length
    return { open, closed, total: issues.length }
  }

  const getPriorityColor = (labels: { name: string }[]) => {
    if (labels.some(l => l.name === 'priority:P0')) return 'bg-red-600'
    if (labels.some(l => l.name === 'priority:P1')) return 'bg-orange-500'
    if (labels.some(l => l.name === 'priority:P2')) return 'bg-yellow-500'
    return 'bg-gray-600'
  }

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return 'bg-red-600'
    if (severity === 'high') return 'bg-orange-500'
    if (severity === 'medium') return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🤖 ClawdBot Multi-Agent Dashboard</h1>
        <div className="text-sm text-gray-400">
          Letzte Aktualisierung: {lastUpdate.toLocaleTimeString('de-DE')}
          <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </div>
      </div>

      {/* ClawdBot Status Widget */}
      {clawdBotStatus && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border-2 border-blue-500">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            🔐 ClawdBot Auth Status
            {clawdBotStatus.rateLimit.detected && (
              <span className="ml-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm animate-pulse">
                RATE LIMIT!
              </span>
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* OAuth Token */}
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-sm text-gray-400 mb-2">OAuth Token (Subscription)</h3>
              <div className="text-2xl font-bold mb-1">
                {clawdBotStatus.auth.oauthToken.hoursRemaining}h {clawdBotStatus.auth.oauthToken.minutesRemaining}m
              </div>
              <div className="text-xs text-gray-400">verbleibend</div>
              <div className="mt-2 bg-gray-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    clawdBotStatus.auth.oauthToken.hoursRemaining < 4 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (clawdBotStatus.auth.oauthToken.hoursRemaining / 24) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Active Profile */}
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-sm text-gray-400 mb-2">Aktives Profil</h3>
              <div className="text-lg font-mono">
                {clawdBotStatus.auth.activeProfile === 'anthropic:claude-cli' ? (
                  <span className="text-green-400">✅ OAuth (kostenlos)</span>
                ) : (
                  <span className="text-yellow-400">💳 API-Key (paid)</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {clawdBotStatus.auth.activeProfile}
              </div>
            </div>

            {/* Rate Limit Status */}
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-sm text-gray-400 mb-2">Rate Limit</h3>
              <div className="text-lg font-semibold">
                {clawdBotStatus.rateLimit.detected ? (
                  <span className="text-red-400">🚨 {clawdBotStatus.rateLimit.occurrences} Fehler</span>
                ) : (
                  <span className="text-green-400">✅ OK</span>
                )}
              </div>
              {clawdBotStatus.rateLimit.lastDetected && (
                <div className="text-xs text-gray-400 mt-1">
                  Zuletzt: {new Date(clawdBotStatus.rateLimit.lastDetected).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {clawdBotStatus.recommendations && clawdBotStatus.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Empfehlungen:</h3>
              {clawdBotStatus.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`${getSeverityColor(rec.severity)} bg-opacity-20 border-l-4 ${getSeverityColor(rec.severity)} p-3 rounded`}
                >
                  <div className="font-semibold">{rec.message}</div>
                  <div className="text-sm text-gray-300 mt-1 font-mono">{rec.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {projects.map(project => {
          const stats = getStatusCounts(project.issues)
          return (
            <div key={project.name} className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-green-400">✅ {stats.closed} done</span>
                <span className="text-yellow-400">🔄 {stats.open} open</span>
              </div>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total ? (stats.closed / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Activity Feed */}
      <div className="bg-gray-800 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold mb-3">📡 Live Activity</h2>
        <div className="max-h-40 overflow-y-auto text-sm space-y-1">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500">Warte auf Aktivität...</p>
          ) : (
            recentActivity.map((activity, i) => (
              <div key={i} className="text-gray-300 border-l-2 border-blue-500 pl-2">
                {activity}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Kanban-style boards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.name} className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {project.name}
              {project.loading && <span className="animate-spin">⏳</span>}
            </h2>

            {/* Open Issues */}
            <div className="mb-4">
              <h3 className="text-sm text-gray-400 mb-2">🔄 Open ({project.issues.filter(i => i.state === 'open').length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {project.issues
                  .filter(i => i.state === 'open')
                  .slice(0, 15)
                  .map(issue => (
                    <div
                      key={issue.number}
                      className={`p-2 rounded text-sm ${getPriorityColor(issue.labels)} bg-opacity-20 border-l-4 ${getPriorityColor(issue.labels)}`}
                    >
                      <span className="text-gray-400">#{issue.number}</span>{' '}
                      <span className="text-white">{issue.title.slice(0, 50)}{issue.title.length > 50 ? '...' : ''}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Recently Closed */}
            <div>
              <h3 className="text-sm text-gray-400 mb-2">✅ Recently Closed</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {project.issues
                  .filter(i => i.state === 'closed')
                  .slice(0, 5)
                  .map(issue => (
                    <div key={issue.number} className="text-sm text-gray-500 line-through">
                      #{issue.number} {issue.title.slice(0, 40)}...
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        Auto-refresh alle {REFRESH_INTERVAL / 1000}s • ClawdBot Rate-Limit-Monitoring aktiv
      </div>
    </div>
  )
}

export default App
