'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Link2 } from 'lucide-react'

const PLATFORM_COLORS: Record<string, string> = { facebook: '#1877f2', twitter: '#1da1f2', instagram: '#e1306c' }
const PLATFORM_ICONS: Record<string, string> = { facebook: '📘', twitter: '𝕏', instagram: '📸' }

export default function ConnectPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [form, setForm] = useState({ platform: 'facebook', username: '', accessToken: '', pageId: '' })
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.username || !form.accessToken) return toast.error('Fill all fields')
    setSaving(true)
    try {
      const res = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success('Account connected! ✅')
      setForm({ platform: 'facebook', username: '', accessToken: '', pageId: '' })
      load()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this account?')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    toast.success('Deleted')
    load()
  }

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Connect Accounts</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Add your social media accounts</p>

      <div className="glass" style={{ padding: 24, marginBottom: 24, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
            <option value="facebook">📘 Facebook Page</option>
            <option value="twitter">𝕏 Twitter / X</option>
          </select>
          <input placeholder="Username / Page name" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          <input placeholder="Access Token" value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} type="password" />
          {form.platform === 'facebook' && (
            <input placeholder="Facebook Page ID" value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} />
          )}
          <button className="btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} />{saving ? 'Connecting...' : 'Connect Account'}
          </button>
        </div>
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
          💡 For Facebook: get a Page Access Token from <a href="https://developers.facebook.com/tools/explorer" target="_blank" style={{ color: 'var(--accent)' }}>Graph API Explorer</a>. Permissions needed: <code>pages_manage_posts</code>, <code>pages_read_engagement</code>
        </div>
      </div>

      {accounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
          {accounts.map((acc: any) => (
            <div key={acc.id} className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{PLATFORM_ICONS[acc.platform] || '📱'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{acc.username}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{acc.platform}</div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: (PLATFORM_COLORS[acc.platform] || '#6366f1') + '22', color: PLATFORM_COLORS[acc.platform] || '#6366f1', fontSize: 12 }}>Connected</span>
              <button onClick={() => del(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
