import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileSearch, BarChart2, ShieldAlert, Tags,
  GitCompare, Bot, Bell, FileText, Clock, Settings,
  ChevronLeft, ChevronRight, LogOut, Zap
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Review Analysis', path: '/analysis', icon: <FileSearch className="w-5 h-5" /> },
  { label: 'Sentiment', path: '/sentiment', icon: <BarChart2 className="w-5 h-5" /> },
  { label: 'Fake Detection', path: '/fake-detection', icon: <ShieldAlert className="w-5 h-5" /> },
  { label: 'Aspect Analysis', path: '/aspect', icon: <Tags className="w-5 h-5" /> },
  { label: 'Product Compare', path: '/compare', icon: <GitCompare className="w-5 h-5" /> },
  { label: 'AI Assistant', path: '/assistant', icon: <Bot className="w-5 h-5" /> },
  { label: 'Seller Alerts', path: '/alerts', icon: <Bell className="w-5 h-5" /> },
  { label: 'Reports', path: '/reports', icon: <FileText className="w-5 h-5" /> },
  { label: 'History', path: '/history', icon: <Clock className="w-5 h-5" /> },
  { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={`flex flex-col bg-[#0D1526] border-r border-white/10 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } min-h-screen relative`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16 border-b border-white/10">
        <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-sm leading-tight">
            Review<br />Analyzer
          </span>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#151F32] border border-white/20 flex items-center justify-center text-white/60 hover:text-white z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                isActive
                  ? 'bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        {!collapsed ? (
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
        ) : null}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
