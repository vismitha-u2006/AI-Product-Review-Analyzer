import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check credentials.')
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setEmail('demo@example.com')
    setPassword('DemoPassword123!')
    try {
      await login('demo@example.com', 'DemoPassword123!')
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Demo login failed.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Review Analyzer</h1>
            <p className="text-xs text-white/40">Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input pl-10"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn-outline w-full text-xs py-2.5"
          >
            Quick Demo Sign In (demo@example.com)
          </button>

          <p className="text-center text-sm text-white/40">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#2563EB] hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
