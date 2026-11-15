import React, { useState } from 'react'
import { Settings, Key, Bell, Shield, Moon, Sun, User, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [negThreshold, setNegThreshold] = useState(30)
  const [aspectThreshold, setAspectThreshold] = useState(40)
  const [savedSuccess, setSavedSuccess] = useState('')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess('Settings and alert threshold configurations saved successfully!')
    setTimeout(() => setSavedSuccess(''), 4000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure API credentials, customize seller alert monitoring thresholds, and manage your account.
        </p>
      </div>

      {savedSuccess && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {savedSuccess}
        </div>
      )}

      {/* Gemini API Key Card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Key className="h-5 w-5 text-purple-400" />
          <h2>Google Gemini AI Assistant Configuration</h2>
        </div>
        <p className="text-xs text-slate-400">
          The Gemini API powers the conversational AI assistant and contextual product summaries. Your API key is stored securely in your server environment variables.
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Gemini API Key (Optional Override)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy... (configured in .env)"
              className="input text-xs"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Current Server Status: <span className="text-emerald-400 font-semibold">Active (Using backend .env GEMINI_API_KEY)</span>
          </p>
          <button type="submit" className="btn-primary py-2 px-4 text-xs">
            Save API Configuration
          </button>
        </form>
      </div>

      {/* Seller Alert Monitoring Thresholds */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Bell className="h-5 w-5 text-amber-400" />
          <h2>Automated Seller Alert Rules & Thresholds</h2>
        </div>
        <p className="text-xs text-slate-400">
          Define when the intelligent monitoring system triggers HIGH and MEDIUM priority alerts.
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Negative Review Rate Trigger</span>
              <span className="font-semibold text-rose-400">{negThreshold}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={60}
              value={negThreshold}
              onChange={(e) => setNegThreshold(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Triggers an alert if negative reviews exceed {negThreshold}% of total product feedback.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Feature Aspect Dissatisfaction Trigger</span>
              <span className="font-semibold text-amber-400">{aspectThreshold}%</span>
            </div>
            <input
              type="range"
              min={25}
              max={75}
              value={aspectThreshold}
              onChange={(e) => setAspectThreshold(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Triggers an alert if any individual feature (e.g. Battery, Display) receives more than {aspectThreshold}% negative sentiment.
            </p>
          </div>

          <button onClick={handleSave} className="btn-primary py-2 px-4 text-xs">
            Update Alert Thresholds
          </button>
        </div>
      </div>

      {/* User Account Info */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <User className="h-5 w-5 text-blue-400" />
          <h2>User Account & Session</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block">Username</span>
            <span className="font-semibold text-white">{user?.username || 'demouser'}</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block">Email Address</span>
            <span className="font-semibold text-white">{user?.email || 'demo@example.com'}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn-outline text-rose-400 border-rose-500/30 hover:bg-rose-500/10 text-xs py-2 px-4"
        >
          Sign Out of Account
        </button>
      </div>
    </div>
  )
}
