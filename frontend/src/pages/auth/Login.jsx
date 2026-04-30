import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export function Login() {
  const { setAuth } = useAuth()
  const nav = useNavigate()
  const { role = 'admin' } = useParams()
  const [email, setEmail] = useState(role === 'admin' ? 'admin@example.com' : '')
  const [password, setPassword] = useState(role === 'admin' ? 'admin123' : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.login(email, password)
      setAuth(res)
      const r = (res?.user?.role || role)
      nav(r === 'admin' ? '/admin' : '/faculty')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 sm:p-10 border rounded-lg shadow-sm bg-white">
      <h1 className="text-3xl font-semibold mb-6">{role === 'admin' ? 'Admin' : 'Faculty'} Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded px-4 py-3 text-base" type="email" placeholder={role === 'admin' ? 'admin@example.com' : 'you@college.edu'} value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input className="w-full border rounded px-4 py-3 text-base" type="password" placeholder={role === 'admin' ? 'admin123' : 'Your password'} value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button disabled={loading} className="px-4 py-2.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="mt-3 text-sm text-gray-700">
        Don't have an account?{' '}
        <Link className="text-blue-600 hover:underline" to={`/auth/${role}/register`}>Register</Link>
      </div>
    </div>
  )
}
