import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import { ToastContainer } from './components/ui/Toast'
import { useToast } from './hooks/useToast'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AnalysisPage from './pages/AnalysisPage'
import SentimentPage from './pages/SentimentPage'
import FakeDetectionPage from './pages/FakeDetectionPage'
import AspectPage from './pages/AspectPage'
import ComparisonPage from './pages/ComparisonPage'
import AssistantPage from './pages/AssistantPage'
import AlertsPage from './pages/AlertsPage'
import ReportsPage from './pages/ReportsPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const { toasts, removeToast } = useToast()

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
        <Route path="/sentiment" element={<ProtectedRoute><SentimentPage /></ProtectedRoute>} />
        <Route path="/fake-detection" element={<ProtectedRoute><FakeDetectionPage /></ProtectedRoute>} />
        <Route path="/aspect" element={<ProtectedRoute><AspectPage /></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><ComparisonPage /></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
