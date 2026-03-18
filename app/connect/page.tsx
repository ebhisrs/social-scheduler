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
  const [form, setForm] = useState({
    platform: 'facebook',
    username: '',
    accessToken: '',
    pageId: '',
    makeWebhookUrl: '',
    extraData: '',
  })
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.username) return toast.error('Enter a name')
    if (form.platform !== 'google_business' && !form.accessToken) return toast.error('Enter access token')
    if (form.platform === 'google_business' && !form.makeWebhookUrl) return toast.error('Enter Make.com webhook URL')

    setSaving(true)
    try {
      // For Google Business, store webhook URL in extraData
      const extraData = form.platform === 'google_business'
        ? JSON.stringify({ makeWebhookUrl: form.makeWebhookUrl })
        : form.extraData || undefined

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: form.platform,
          username: form.username,
          accessToken: form.accessToken || 'make-webhook',
          pageId: form.pageId || null,
          extraData,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Account connected! ✅')
      setForm({ platform: 'facebook', username: '', accessToken: '', pageId: '', makeWebhookUrl: '', extraData: '' })
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

          {/* Facebook fields */}
          {form.platform === 'facebook' && <>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Access Token *</label>
              <input placeholder="Page access token" value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} type="password" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Page ID *</label>
              <input placeholder="Facebook Page ID" value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} />
            </div>
            <div style={{ padding: 12, background: 'rgba(24,119,242,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
              💡 Get token from <a href="https://developers.facebook.com/tools/explorer" target="_blank" style={{ color: '#1877f2' }}>Graph API Explorer</a><br />
              Permissions: <code>pages_manage_posts</code>, <code>pages_read_engagement</code>
            </div>
          </>}

          {/* Twitter fields */}
          {form.platform === 'twitter' && <>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Access Token *</label>
              <input placeholder="OAuth 1.0a access token" value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} type="password" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Extra Keys (JSON)</label>
              <input placeholder='{"appKey":"...","appSecret":"...","accessSecret":"..."}' value={form.extraData} onChange={e => setForm(f => ({ ...f, extraData: e.target.value }))} />
            </div>
          </>}

          {/* Google Business fields */}
          {form.platform === 'google_business' && <>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Make.com Webhook URL *</label>
              <input
                placeholder="https://hook.eu1.make.com/xxxxxxxxxxxxx"
                value={form.makeWebhookUrl}
                onChange={e => setForm(f => ({ ...f, makeWebhookUrl: e.target.value }))}
              />
            </div>
            <div>
  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Location Name</label>
  <input
    placeholder="accounts/17540640580516601221/locations/8346233813110252496"
    value={form.pageId}
    onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))}
  />
</div>
            <div style={{ padding: 14, background: 'rgba(234,67,53,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 2 }}>
              <strong style={{ color: 'white', fontSize: 13 }}>📋 How to get your Make.com webhook URL:</strong><br />
              1. Go to <a href="https://make.com" target="_blank" style={{ color: '#ea4335' }}>make.com</a> → free account<br />
              2. Create new scenario<br />
              3. Add trigger: <strong style={{ color: 'white' }}>Webhooks → Custom webhook</strong> → copy the URL<br />
              4. Add action: <strong style={{ color: 'white' }}>Google Business Profile → Create Post</strong><br />
              5. Connect your Google account in Make.com<br />
              6. Map the field <strong style={{ color: 'white' }}>"text"</strong> from webhook to post summary<br />
              7. Activate the scenario<br />
              8. Paste the webhook URL above ✅<br /><br />
              <strong style={{ color: '#10b981' }}>✓ No API approval needed · No token expiry · Free up to 1000 posts/month</strong>
            </div>
          </>}

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