'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock, Zap, Globe, ChevronDown, ChevronUp } from 'lucide-react'

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877f2', twitter: '#1da1f2', google_business: '#ea4335',
  instagram: '#e1306c', wordpress: '#21759b'
}
const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', twitter: '𝕏', google_business: '🏢',
  instagram: '📸', wordpress: '🌐'
}

export default function DebugPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, today: 0 })

  const load = async () => {
    setLoading(true)
    try {
      const [logsRes, accountsRes] = await Promise.all([
        fetch('/api/debug-logs'),
        fetch('/api/accounts'),
      ])
      const logsData = await logsRes.json()
      const accountsData = await accountsRes.json()
      setAccounts(Array.isArray(accountsData) ? accountsData : [])

      const allLogs = Array.isArray(logsData) ? logsData : []
      setLogs(allLogs)

      const today = new Date().toDateString()
      setStats({
        total: allLogs.length,
        success: allLogs.filter((l: any) => l.success).length,
        failed: allLogs.filter((l: any) => !l.success).length,
        today: allLogs.filter((l: any) => new Date(l.sentAt).toDateString() === today).length,
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const getAccountName = (accountsJson: string) => {
    try {
      const names: string[] = JSON.parse(accountsJson)
      return names
    } catch { return [] }
  }

  const getAccountInfo = (name: string) => {
    return accounts.find(a => a.username === name)
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return {
      day: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      relative: getRelativeTime(d),
    }
  }

  const getRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}min ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>📊 Activity Log</h1>
          <p style={{ color: 'var(--muted)' }}>All sent posts, errors and automation history</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Posts', value: stats.total, icon: Zap, color: '#6366f1' },
          { label: 'Successful', value: stats.success, icon: CheckCircle, color: '#10b981' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: '#ef4444' },
          { label: 'Today', value: stats.today, icon: Clock, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      {loading ? (
        <div className="glass" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>
      ) : !logs.length ? (
        <div className="glass" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No posts sent yet. Create an automation to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.map((log: any) => {
            const date = formatDate(log.sentAt)
            const accountNames = getAccountName(log.accounts)
            const isExpanded = expandedId === log.id

            return (
              <div key={log.id} className="glass" style={{
                borderRadius: 12, overflow: 'hidden',
                borderLeft: `3px solid ${log.success ? '#10b981' : '#ef4444'}`,
              }}>
                {/* Header */}
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Status icon */}
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {log.success
                      ? <CheckCircle size={18} color="#10b981" />
                      : <XCircle size={18} color="#ef4444" />
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Date + time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'white', textTransform: 'capitalize' }}>
                        {date.day}
                      </span>
                      <span style={{ fontSize: 12, color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: 6 }}>
                        🕐 {date.time}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {date.relative}
                      </span>
                    </div>

                    {/* Accounts posted to */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: log.error ? 8 : 0 }}>
                      {accountNames.length > 0 ? accountNames.map((name: string, i: number) => {
                        const acc = getAccountInfo(name)
                        const color = acc ? (PLATFORM_COLORS[acc.platform] || '#6366f1') : '#6366f1'
                        const icon = acc ? (PLATFORM_ICONS[acc.platform] || '📱') : '📱'
                        return (
                          <span key={i} style={{ fontSize: 12, color, background: color + '18', padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {icon} {name}
                          </span>
                        )
                      }) : (
                        <span style={{ fontSize: 12, color: '#ef4444' }}>No accounts posted</span>
                      )}
                      {/* Automation name */}
                      {log.schedule && (
                        <span style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 20 }}>
                          ⚡ {log.schedule.name}
                        </span>
                      )}
                    </div>

                    {/* Error message */}
                    {log.error && (
                      <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
                          ⚠️ <strong>Error:</strong> {log.error}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Expand button */}
                  {log.article && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, flexShrink: 0 }}
                      title="View article"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>

                {/* Article content — expandable */}
                {isExpanded && log.article && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Article sent:</span>
                      <span style={{ fontSize: 12, color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                        {log.article.topic} · {log.article.language}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {log.article.content.length} chars
                      </span>
                    </div>
                    <div style={{
                      padding: 14,
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--text)',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 400,
                      overflowY: 'auto',
                    }}>
                      {log.article.content}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}