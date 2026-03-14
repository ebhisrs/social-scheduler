'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Clock, Trash2 } from 'lucide-react'

export default function SchedulerPage() {
  const [posts, setPosts] = useState<any[]>([])

  const load = () => fetch('/api/posts').then(r => r.json()).then(setPosts).catch(() => {})
  useEffect(() => { load() }, [])

  const del = async (id: string) => {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    setPosts(p => p.filter(x => x.id !== id))
  }

  const statusColor: Record<string, string> = { pending: '#f59e0b', sent: '#10b981', failed: '#ef4444', sending: '#6366f1' }

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Scheduler</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Scheduled and sent posts</p>

      {!posts.length ? (
        <div className="glass" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No scheduled posts. Use the Composer to schedule posts.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map((p: any) => (
            <div key={p.id} className="glass" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6, whiteSpace: 'pre-wrap' }}>{p.content.substring(0, 200)}{p.content.length > 200 ? '...' : ''}</p>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(p.scheduledAt).toLocaleString()}</div>
                {p.error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{p.error}</div>}
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: (statusColor[p.status] || '#666') + '22', color: statusColor[p.status] || '#666', fontSize: 12, whiteSpace: 'nowrap' }}>{p.status}</span>
              {p.status === 'pending' && (
                <button onClick={() => del(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
