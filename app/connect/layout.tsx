import Sidebar from '@/components/Sidebar'
import { Toaster } from 'react-hot-toast'
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e1e24', color: '#e8e8f0', border: '1px solid rgba(255,255,255,0.08)' } }} />
        {children}
      </main>
    </div>
  )
}
