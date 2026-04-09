'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, PenTool, Clock, Link2, Image, FileText, Bug } from 'lucide-react'

const nav = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calendar',   icon: Calendar,         label: 'Auto-Calendar' },
  { href: '/composer',   icon: PenTool,          label: 'Composer' },
  { href: '/articles',   icon: FileText,         label: 'Articles' },
  { href: '/scheduler',  icon: Clock,            label: 'Scheduler' },
  { href: '/photos',     icon: Image,            label: 'Photos' },
  { href: '/connect',    icon: Link2,            label: 'Connect' },
  { href: '/debug',      icon: Bug,              label: 'Activity Log' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside style={{ width: 220, minHeight: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 12px', flexShrink: 0 }}>
      <div style={{ padding: '0 8px 28px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          SocialPilot
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>AI Social Scheduler</div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isDebug = href === '/debug'
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
              background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: active ? '#a5b4fc' : isDebug ? '#f59e0b' : 'var(--muted)',
              fontWeight: active ? 600 : 400, fontSize: 13,
              transition: 'all 0.15s',
              marginTop: isDebug ? 8 : 0,
              borderTop: isDebug ? '1px solid var(--border)' : 'none',
              paddingTop: isDebug ? 17 : 9,
            }}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}