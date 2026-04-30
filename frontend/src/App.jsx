import React from 'react'
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { Home } from './pages/Home.jsx'
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx'
import { FacultyPortal } from './pages/faculty/FacultyPortal.jsx'
import { Login } from './pages/auth/Login.jsx'
import { Register } from './pages/auth/Register.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { user } = useAuth()
  const location = useLocation()
  const showNav = location.pathname !== '/'
  const isAuth = location.pathname.startsWith('/auth')

  function RequireRole({ role, children }) {
    if (!user) return <Navigate to={`/auth/${role}/login`} replace />
    if (user.role !== role) return <Navigate to={`/auth/${role}/login`} replace />
    return children
  }
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {showNav && (
        <nav className="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4 sm:px-8 lg:px-12">
            <Link to="/" className="font-semibold text-blue-600">Invigilator Allocation</Link>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/auth/admin/login" className="hover:text-blue-600">Admin</Link>
              <Link to="/auth/faculty/login" className="hover:text-blue-600">Faculty</Link>
              <Link to="/auth/admin/login" className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">Login</Link>
            </div>
          </div>
        </nav>
      )}
      <main className={showNav ? (isAuth ? "w-full px-4 min-h-[calc(100vh-56px)] grid place-items-center" : "max-w-5xl mx-auto px-4 py-6") : "py-6"}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
          <Route path="/faculty" element={<RequireRole role="faculty"><FacultyPortal /></RequireRole>} />
          <Route path="/auth/:role/login" element={<Login />} />
          <Route path="/auth/:role/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
