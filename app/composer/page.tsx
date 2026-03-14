'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Send, Sparkles } from 'lucide-react'

export default function ComposerPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState(false)

  useEffect(() => { fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {}) }, [])

  const generate = async () => {
    if (!topic) return toast.error('Enter a topic')
    setGenerating(true)
    try {
      const res = await fetch('/api/generate/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) })
      const data = await res.json()
      if (data.content) setContent(data.content)
      else throw new Error(data.error)
    } catch (e: any) { toast.error(e.message || 'Generation failed') }
    finally { setGenerating(false) }
  }

  const post = async () => {
    if (!content) return toast.error('Write something')
    if (!selected.length) return toast.error('Select at least one account')
    setPosting(true)
    try {
      const res = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, accountIds: selected, scheduledAt: new Date().toISOString() }) })
      if (!res.ok) throw new Error()
      toast.success('Posted! ✅')
      setContent('')
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  return (
    <div className="animate-in" style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Composer</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Write or generate a post and publish now</p>

      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input placeholder="Topic to generate from..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} />
          <button className="btn-primary" onClick={generate} disabled={generating} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} />{generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your post here..." rows={8} style={{ resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{content.length} characters</span>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>Post to:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {accounts.map((acc: any) => (
              <button key={acc.id} onClick={() => setSelected(s => s.includes(acc.id) ? s.filter(x => x !== acc.id) : [...s, acc.id])} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: selected.includes(acc.id) ? 'rgba(99,102,241,0.2)' : 'var(--surface2)', color: selected.includes(acc.id) ? '#a5b4fc' : 'var(--muted)', outline: selected.includes(acc.id) ? '2px solid #6366f1' : 'none' }}>
                {acc.username} {selected.includes(acc.id) ? '✓' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn-primary" onClick={post} disabled={posting} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 }}>
        <Send size={15} />{posting ? 'Posting...' : 'Post Now'}
      </button>
    </div>
  )
}
