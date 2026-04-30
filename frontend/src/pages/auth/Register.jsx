import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export function Register() {
  const { setAuth } = useAuth()
  const nav = useNavigate()
  const { role = 'faculty' } = useParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState(role === 'admin' ? 'ADMIN' : '')
  const [designation, setDesignation] = useState(role === 'admin' ? 'ADMIN' : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.register({ name, email, password, department: department || undefined, designation: designation || undefined, role })
      setAuth(res)
      nav(role === 'admin' ? '/admin' : '/faculty')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 border rounded-lg shadow-sm bg-white">
      <h1 className="text-3xl font-semibold mb-4">{role === 'admin' ? 'Admin' : 'Faculty'} Register</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Department</label>
          <input className="w-full border rounded px-3 py-2" value={department} onChange={e=>setDepartment(e.target.value)} placeholder={role === 'admin' ? 'ADMIN' : 'e.g., CSE'} />
        </div>
        <div>
          <label className="block text-sm mb-1">Designation</label>
          <input className="w-full border rounded px-3 py-2" value={designation} onChange={e=>setDesignation(e.target.value)} placeholder={role === 'admin' ? 'ADMIN' : 'e.g., Assistant Professor'} />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button disabled={loading} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <div className="mt-3 text-sm text-gray-700">
        Already have an account?{' '}
        <Link className="text-blue-600 hover:underline" to={`/auth/${role}/login`}>Login</Link>
      </div>
    </div>
  )
}
