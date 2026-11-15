import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'
import type { User } from '../types'

const AUTH_EVENT = 'auth-state-change'

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(getStoredUser)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const syncAuth = () => {
      setToken(localStorage.getItem('token'))
      setUser(getStoredUser())
    }
    window.addEventListener(AUTH_EVENT, syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener(AUTH_EVENT, syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const accessToken = res.data.access_token
      const userObj: User = res.data.user || {
        id: 1,
        email,
        username: email.split('@')[0],
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(userObj))
      setToken(accessToken)
      setUser(userObj)
      window.dispatchEvent(new Event(AUTH_EVENT))
      return res.data
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, username: string, password: string) => {
    setLoading(true)
    try {
      const res = await authApi.register(email, username, password)
      const accessToken = res.data.access_token
      const userObj: User = res.data.user || {
        id: 1,
        email,
        username,
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(userObj))
      setToken(accessToken)
      setUser(userObj)
      window.dispatchEvent(new Event(AUTH_EVENT))
      return res.data
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    window.dispatchEvent(new Event(AUTH_EVENT))
  }, [])

  return { user, token, isAuthenticated: !!token, login, register, logout, loading }
}
