'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Pencil, X, Check, Eye, EyeOff } from 'lucide-react'

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877f2', twitter: '#1da1f2', google_business: '#ea4335',
  instagram: '#e1306c', wordpress: '#21759b'
}
const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', twitter: '𝕏', google_business: '🏢',
  instagram: '📸', wordpress: '🌐'
}

function EditAccountModal({ account, onClose, onSaved }: { account: any, onClose: () => void, onSaved: () => void }) {
  const [form, setForm] = useState({
    username: account.username || '',
    accessToken: account.accessToken || '',
    pageId: account.pageId || '',
    extraData: account.extraData || '',
  })
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)

  // Parse extraData for display
  const extra = (() => { try { const d = JSON.parse(typeof form.extraData === 'string' ? (form.extraData.startsWith('"') ? JSON.parse(form.extraData) : form.extraData) : JSON.stringify(form.extraData)); return d } catch { return {} } })()

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Account updated! ✅')
      onSaved(); onClose()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="glass" style={{ width: '100%', maxWidth: 520, borderRadius: 14, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{PLATFORM_ICONS[account.platform]} Edit {account.username}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Name</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          {account.platform !== 'google_business' && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                {account.platform === 'wordpress' ? 'Application Password' : 'Access Token'}
                <button onClick={() => setShowToken(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', marginLeft: 8, fontSize: 12 }}>
                  {showToken ? <><EyeOff size={12} style={{ display: 'inline' }} /> Hide</> : <><Eye size={12} style={{ display: 'inline' }} /> Show</>}
                </button>
              </label>
              <input type={showToken ? 'text' : 'password'} value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} style={{ fontFamily: showToken ? 'monospace' : undefined, fontSize: showToken ? 11 : undefined }} />
              {showToken && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>Current: {form.accessToken.substring(0, 60)}...</p>}
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
              {account.platform === 'google_business' ? 'Location Name' :
               account.platform === 'instagram' ? 'Instagram Account ID' :
               account.platform === 'wordpress' ? 'Site URL' : 'Page ID'}
            </label>
            <input value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} />
          </div>
          {account.platform === 'wordpress' && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>WordPress Username</label>
              <input value={extra.username || ''} onChange={e => setForm(f => ({ ...f, extraData: JSON.stringify({ ...extra, username: e.target.value }) }))} />
            </div>
          )}
          {account.platform === 'google_business' && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Make.com Webhook URL</label>
              <input value={extra.makeWebhookUrl || ''} onChange={e => setForm(f => ({ ...f, extraData: JSON.stringify({ makeWebhookUrl: e.target.value }) }))} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} />{saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConnectPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [form, setForm] = useState({ platform: 'facebook', username: '', accessToken: '', pageId: '', makeWebhookUrl: '', wpUsername: '', extraData: '' })
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.username) return toast.error('Enter a name')
    if (form.platform === 'google_business' && !form.makeWebhookUrl) return toast.error('Enter Make.com webhook URL')
    if (form.platform === 'google_business' && !form.pageId) return toast.error('Enter Location Name')
    if (form.platform === 'wordpress' && !form.pageId) return toast.error('Enter WordPress site URL')
    if (form.platform === 'wordpress' && !form.wpUsername) return toast.error('Enter WordPress username')
    if (form.platform === 'wordpress' && !form.accessToken) return toast.error('Enter Application Password')
    if (form.platform !== 'google_business' && form.platform !== 'wordpress' && !form.accessToken) return toast.error('Enter access token')
    if ((form.platform === 'facebook' || form.platform === 'instagram') && !form.pageId) return toast.error('Enter Page ID / Account ID')

    setSaving(true)
    try {
      let extraData: any
      if (form.platform === 'google_business') extraData = JSON.stringify({ makeWebhookUrl: form.makeWebhookUrl })
      else if (form.platform === 'wordpress') extraData = JSON.stringify({ username: form.wpUsername, siteUrl: form.pageId })
      else if (form.extraData) extraData = form.extraData

      const res = await fetch('/api/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: form.platform, username: form.username, accessToken: form.accessToken || 'make-webhook', pageId: form.pageId || null, extraData }),
      })
      if (!res.ok) throw new Error()
      toast.success('Account connected! ✅')
      setForm({ platform: 'facebook', username: '', accessToken: '', pageId: '', makeWebhookUrl: '', wpUsername: '', extraData: '' })
      load()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this account?')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    toast.success('Deleted'); load()
  }

  return (
    <div className="animate-in">
      {editingAccount && <EditAccountModal account={editingAccount} onClose={() => setEditingAccount(null)} onSaved={load} />}

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Connect Accounts</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Add your social media and website accounts</p>

      <div className="glass" style={{ padding: 24, marginBottom: 24, maxWidth: 580 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Platform</label>
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value, username: '', accessToken: '', pageId: '', makeWebhookUrl: '', wpUsername: '', extraData: '' }))}>
              <option value="facebook">📘 Facebook Page</option>
              <option value="instagram">📸 Instagram Business</option>
              <option value="twitter">𝕏 Twitter / X</option>
              <option value="google_business">🏢 Google Business Profile</option>
              <option value="wordpress">🌐 WordPress Website</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
              {form.platform === 'wordpress' ? 'Website name' : form.platform === 'google_business' ? 'Business name' : 'Username / Account name'} *
            </label>
            <input
              placeholder={form.platform === 'wordpress' ? 'Ex: Mon Site Web' : form.platform === 'instagram' ? 'Ex: @moncompte' : form.platform === 'google_business' ? 'Ex: Labaume Pere et Fils' : 'Ex: Chasseland Artisans'}
              value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>

          {/* Facebook */}
          {form.platform === 'facebook' && <>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Access Token *</label><input type="password" placeholder="Page access token" value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} /></div>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Page ID *</label><input placeholder="Facebook Page ID" value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} /></div>
            <div style={{ padding: 12, background: 'rgba(24,119,242,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
              💡 Get permanent token from <a href="https://developers.facebook.com/tools/explorer" target="_blank" style={{ color: '#1877f2' }}>Graph API Explorer</a><br />
              Permissions: <code>pages_manage_posts</code>, <code>pages_read_engagement</code>
            </div>
          </>}

          {/* Instagram */}
          {form.platform === 'instagram' && <>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Access Token * <span style={{ opacity: 0.6 }}>(same as Facebook)</span></label><input type="password" placeholder="Facebook Page access token" value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} /></div>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Instagram Account ID *</label><input placeholder="Instagram Business Account ID" value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} /></div>
            <div style={{ padding: 12, background: 'rgba(225,48,108,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
              💡 Find ID: <code style={{ fontSize: 11 }}>graph.facebook.com/v19.0/YOUR_PAGE_ID?fields=instagram_business_account&access_token=TOKEN</code><br />
              Instagram must be Business/Creator account connected to your Facebook Page
            </div>
          </>}

          {/* Twitter */}
          {form.platform === 'twitter' && <>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Access Token *</label><input type="password" placeholder="OAuth 1.0a access token" value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} /></div>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Extra Keys (JSON)</label><input placeholder='{"appKey":"...","appSecret":"...","accessSecret":"..."}' value={form.extraData} onChange={e => setForm(f => ({ ...f, extraData: e.target.value }))} /></div>
          </>}

          {/* Google Business */}
          {form.platform === 'google_business' && <>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Make.com Webhook URL *</label><input placeholder="https://hook.eu1.make.com/xxxxxxxxxxxxx" value={form.makeWebhookUrl} onChange={e => setForm(f => ({ ...f, makeWebhookUrl: e.target.value }))} /></div>
            <div><label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Location Name *</label><input placeholder="accounts/123456789/locations/987654321" value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} /></div>
            <div style={{ padding: 12, background: 'rgba(234,67,53,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
              💡 Make.com: Webhooks → Custom webhook → Google Business → Create Post → map <strong style={{ color: 'white' }}>text</strong> to Summary
            </div>
          </>}

          {/* WordPress */}
          {form.platform === 'wordpress' && <>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>WordPress Site URL *</label>
              <input placeholder="https://yoursite.com" value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>WordPress Username *</label>
              <input placeholder="admin" value={form.wpUsername} onChange={e => setForm(f => ({ ...f, wpUsername: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>Application Password *</label>
              <input type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} />
            </div>
            <div style={{ padding: 14, background: 'rgba(33,117,155,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.9 }}>
              <strong style={{ color: 'white', fontSize: 13 }}>📋 How to get WordPress Application Password:</strong><br />
              1. Go to your WordPress admin → <strong style={{ color: 'white' }}>Users → Your Profile</strong><br />
              2. Scroll down to <strong style={{ color: 'white' }}>"Application Passwords"</strong><br />
              3. Type name: <code>social-scheduler</code> → click <strong style={{ color: 'white' }}>"Add New"</strong><br />
              4. Copy the password shown (format: xxxx xxxx xxxx xxxx)<br />
              5. Paste it above — it <strong style={{ color: 'white' }}>never expires</strong> ✅<br /><br />
              <strong style={{ color: '#10b981' }}>✓ Auto-generates full SEO blog posts with H1/H2/H3, FAQ, schema markup, meta tags · Works with Yoast SEO & Rank Math</strong>
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
                  {acc.pageId && <span style={{ marginLeft: 8, opacity: 0.5 }}>· {acc.pageId.substring(0, 30)}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                  {acc.platform !== 'google_business' && `Token: ${acc.accessToken.substring(0, 20)}...`}
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: (PLATFORM_COLORS[acc.platform] || '#6366f1') + '22', color: PLATFORM_COLORS[acc.platform] || '#6366f1', fontSize: 12 }}>
                Connected
              </span>
              <button onClick={() => setEditingAccount(acc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><Pencil size={15} /></button>
              <button onClick={() => del(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}