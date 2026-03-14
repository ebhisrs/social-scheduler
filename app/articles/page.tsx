'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Trash2, Send, RefreshCw } from 'lucide-react'

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('French')

  const load = () => {
    fetch('/api/articles').then(r => r.json()).then(setArticles).catch(() => {})
    fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const generate = async () => {
    if (!topic) return toast.error('Enter a topic')
    setGenerating(true)
    try {
      const res = await fetch('/api/generate/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: topic, language, tone: 'professional', count: 3 }) })
      if (!res.ok) throw new Error()
      toast.success('Articles generated! ✅')
      load()
    } catch { toast.error('Generation failed') }
    finally { setGenerating(false) }
  }

  const publish = async (articleId: string, accountId: string) => {
    try {
      const res = await fetch(`/api/articles/${articleId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountIds: [accountId] }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('Published! ✅')
      load()
    } catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const del = async (id: string) => {
    await fetch(`/api/articles/${id}`, { method: 'DELETE' })
    setArticles(a => a.filter(x => x.id !== id))
  }

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Articles</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Generate and publish articles</p>

      <div className="glass" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input placeholder="Topic / keyword (e.g. vitrier à Chassieu)" value={topic} onChange={e => setTopic(e.target.value)} />
        </div>
        <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: 140 }}>
          <option value="French">🇫🇷 French</option>
          <option value="English">🇬🇧 English</option>
          <option value="Spanish">🇪🇸 Spanish</option>
        </select>
        <button className="btn-primary" onClick={generate} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <RefreshCw size={14} className={generating ? 'spin' : ''} />
          {generating ? 'Generating...' : 'Generate 3 Articles'}
        </button>
      </div>

      {!articles.length ? (
        <div className="glass" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>No articles yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map((a: any) => (
            <div key={a.id} className="glass" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(a.createdAt).toLocaleString()} · {a.language}</div>
                </div>
                <button onClick={() => del(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', flexShrink: 0 }}><Trash2 size={15} /></button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{a.content}</p>
              {accounts.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {accounts.map((acc: any) => (
                    <button key={acc.id} onClick={() => publish(a.id, acc.id)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Send size={11} /> Post to {acc.username}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
