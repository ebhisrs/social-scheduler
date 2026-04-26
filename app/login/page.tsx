'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') || '/dashboard'
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!secret) return
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      if (!res.ok) throw new Error('Wrong secret')
      toast.success('Logged in ✅')
      router.push(from)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <label className="block text-sm font-medium mb-2">Admin secret</label>
      <input
        type="password"
        value={secret}
        onChange={e => setSecret(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
        autoFocus
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Log in'}
      </button>
    </form>
  )
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
