import React from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/analysis': 'Review Analysis',
  '/sentiment': 'Sentiment Analysis',
  '/fake-detection': 'Fake Detection',
  '/aspect': 'Aspect Analysis',
  '/compare': 'Product Comparison',
  '/assistant': 'AI Assistant',
  '/alerts': 'Seller Alerts',
  '/reports': 'Reports',
  '/history': 'Analysis History',
  '/settings': 'Settings',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || 'AI Review Analyzer'

  return (
    <div className="flex min-h-screen bg-[#0B1120]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center px-6 border-b border-white/10 bg-[#0B1120]">
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
