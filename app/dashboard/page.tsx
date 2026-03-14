'use client'
import { useEffect, useState } from 'react'
import { Zap, FileText, Send, Clock } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({ accounts: 0, articles: 0, automations: 0, sent: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()).catch(() => []),
      fetch('/api/articles').then(r => r.json()).catch(() => []),
      fetch('/api/automation').then(r => r.json()).catch(() => []),
    ]).then(([accounts, articles, automations]) => {
      const sent = automations.reduce((s: number, a: any) => s + (a.autoPosts?.length || 0), 0)
      setStats({
        accounts: Array.isArray(accounts) ? accounts.length : 0,
        articles: Array.isArray(articles) ? articles.length : 0,
        automations: Array.isArray(automations) ? automations.filter((a: any) => a.active).length : 0,
        sent,
      })
    })
  }, [])

  const cards = [
    { icon: Send, label: 'Connected Accounts', value: stats.accounts, color: '#6366f1' },
    { icon: FileText, label: 'Articles Generated', value: stats.articles, color: '#10b981' },
    { icon: Zap, label: 'Active Automations', value: stats.automations, color: '#f59e0b' },
    { icon: Clock, label: 'Posts Sent', value: stats.sent, color: '#8b5cf6' },
  ]

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 32 }}>Your social media automation overview</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="glass" style={{ marginTop: 24, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Quick Start</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          1. <a href="/connect" style={{ color: 'var(--accent)' }}>Connect</a> your Facebook page<br/>
          2. <a href="/photos" style={{ color: 'var(--accent)' }}>Upload photos</a> to your library<br/>
          3. <a href="/calendar" style={{ color: 'var(--accent)' }}>Create an automation</a> — choose days, times and keyword<br/>
          4. Posts go out automatically every week ✅
        </p>
      </div>
    </div>
  )
}
