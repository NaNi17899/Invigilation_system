import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { api, setToken as setApiToken } from '../lib/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  function setAuth({ token, user }) {
    if (token) setApiToken(token)
    if (user) {
      setUser(user)
      localStorage.setItem('user', JSON.stringify(user))
    }
    if (token) localStorage.setItem('token', token)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = useMemo(() => ({ user, setAuth, logout }), [user])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
