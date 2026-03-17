'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877f2', twitter: '#1da1f2', google_business: '#ea4335'
}
const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', twitter: '𝕏', google_business: '🏢'
}

export default function ConnectPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [form, setForm] = useState({ platform: 'facebook', username: '', accessToken: '', pageId: '', extraData: '' })
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.username || !form.accessToken) return toast.error('Fill all required fields')
    setSaving(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Account connected! ✅')
      setForm({ platform: 'facebook', username: '', accessToken: '', pageId: '', extraData: '' })
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

  const helpText: Record<string, React.ReactNode> = {
    facebook: (
      <div style={{ marginTop: 12, padding: 12, background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
        💡 Get token from <a href="https://developers.facebook.com/tools/explorer" target="_blank" style={{ color: 'var(--accent)' }}>Graph API Explorer</a><br/>
        Permissions: <code>pages_manage_posts</code>, <code>pages_read_engagement</code>, <code>pages_show_list</code><br/>
        Page ID: found in your Facebook page URL or Settings → Page Info
      </div>
    ),
    twitter: (
      <div style={{ marginTop: 12, padding: 12, background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
        💡 Get keys from <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" style={{ color: 'var(--accent)' }}>Twitter Developer Portal</a><br/>
        Access Token = OAuth 1.0a Access Token<br/>
        Extra Data (JSON): <code>{"{"}"appKey":"...","appSecret":"...","accessSecret":"..."{"}"}</code>
      </div>
    ),
    google_business: (
      <div style={{ marginTop: 12, padding: 12, background: 'rgba(234,67,53,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
        💡 Get token from <a href="https://developers.google.com/oauthplayground" target="_blank" style={{ color: '#ea4335' }}>Google OAuth Playground</a><br/>
        Scope needed: <code>https://www.googleapis.com/auth/business.manage</code><br/>
        <strong style={{ color: 'white' }}>Access Token:</strong> OAuth 2.0 access token from OAuth Playground<br/>
        <strong style={{ color: 'white' }}>Page ID (Location):</strong> format is <code>accounts/123456789/locations/987654321</code><br/>
        Find it at: <a href="https://business.google.com" target="_blank" style={{ color: '#ea4335' }}>business.google.com</a> → your business → URL contains the ID<br/>
        ⚠️ Google tokens expire in 1 hour — for permanent access you need a refresh token setup
      </div>
    ),
  }

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Connect Accounts</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Add your social media accounts</p>

      <div className="glass" style={{ padding: 24, marginBottom: 24, maxWidth: 580 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Platform</label>
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
              <option value="facebook">📘 Facebook Page</option>
              <option value="twitter">𝕏 Twitter / X</option>
              <option value="google_business">🏢 Google Business Profile</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
              {form.platform === 'google_business' ? 'Business name' : 'Username / Page name'} *
            </label>
            <input
              placeholder={form.platform === 'google_business' ? 'Ex: Mon Commerce Lyon' : 'Ex: Chasseland Artisans'}
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
              Access Token *
            </label>
            <input
              placeholder={form.platform === 'google_business' ? 'OAuth 2.0 access token' : 'Access token'}
              value={form.accessToken}
              onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))}
              type="password"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
              {form.platform === 'google_business' ? 'Location Name (accounts/.../locations/...)' : 'Page ID'}
            </label>
            <input
              placeholder={form.platform === 'google_business' ? 'accounts/123456789/locations/987654321' : 'Facebook Page ID'}
              value={form.pageId}
              onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))}
            />
          </div>

          {form.platform === 'twitter' && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                Extra Data (JSON for Twitter keys)
              </label>
              <input
                placeholder='{"appKey":"...","appSecret":"...","accessSecret":"..."}'
                value={form.extraData}
                onChange={e => setForm(f => ({ ...f, extraData: e.target.value }))}
              />
            </div>
          )}

          {helpText[form.platform]}

          <button className="btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Plus size={14} />{saving ? 'Connecting...' : 'Connect Account'}
          </button>
        </div>
      </div>

      {accounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 580 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Connected Accounts</h2>
          {accounts.map((acc: any) => (
            <div key={acc.id} className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{PLATFORM_ICONS[acc.platform] || '📱'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{acc.username}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>
                  {acc.platform.replace('_', ' ')}
                  {acc.pageId && <span style={{ marginLeft: 8, opacity: 0.6 }}>· {acc.pageId.substring(0, 30)}...</span>}
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: (PLATFORM_COLORS[acc.platform] || '#6366f1') + '22', color: PLATFORM_COLORS[acc.platform] || '#6366f1', fontSize: 12 }}>
                Connected
              </span>
              <button onClick={() => del(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
