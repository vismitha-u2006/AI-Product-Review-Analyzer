import React, { useState, useEffect } from 'react'
import { Bell, AlertTriangle, CheckCircle, Clock, Filter, ArrowUpRight, ShieldAlert, Sparkles } from 'lucide-react'
import { alertsApi, productsApi } from '../services/api'
import api from '../services/api'
import type { SellerAlert, Product } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<SellerAlert[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    loadProducts()
    loadAlerts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await productsApi.getProducts()
      setProducts(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const res = await alertsApi.getAlerts()
      setAlerts(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (alertId: number, newStatus: string) => {
    setUpdatingId(alertId)
    try {
      await api.patch(`/alerts/${alertId}`, { status: newStatus })
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus as any } : a))
      )
    } catch (err) {
      console.error('Failed to update alert status', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredAlerts = alerts.filter((a) => {
    const matchesProduct = !selectedProductId || a.product_id === Number(selectedProductId)
    const matchesPriority = selectedPriority === 'all' || a.priority === selectedPriority
    const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus
    return matchesProduct && matchesPriority && matchesStatus
  })

  const highCount = alerts.filter((a) => a.priority === 'HIGH' && a.status !== 'Resolved').length
  const medCount = alerts.filter((a) => a.priority === 'MEDIUM' && a.status !== 'Resolved').length
  const resolvedCount = alerts.filter((a) => a.status === 'Resolved').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Seller Alert System</h1>
        <p className="mt-1 text-sm text-slate-400">
          Proactive monitoring for spikes in negative feedback, recurring customer complaints, and feature dissatisfaction.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 border-rose-500/30 bg-rose-950/10">
          <div className="rounded-xl bg-rose-500/20 p-3 text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-rose-300 font-medium">Critical (HIGH) Alerts</p>
            <h3 className="text-2xl font-bold text-white">{highCount}</h3>
            <p className="text-xs text-slate-400">Requires urgent action</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-amber-500/30 bg-amber-950/10">
          <div className="rounded-xl bg-amber-500/20 p-3 text-amber-400">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-amber-300 font-medium">Medium Priority</p>
            <h3 className="text-2xl font-bold text-white">{medCount}</h3>
            <p className="text-xs text-slate-400">Emerging trends</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-emerald-500/30 bg-emerald-950/10">
          <div className="rounded-xl bg-emerald-500/20 p-3 text-emerald-400">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-300 font-medium">Resolved Alerts</p>
            <h3 className="text-2xl font-bold text-white">{resolvedCount}</h3>
            <p className="text-xs text-slate-400">Action items cleared</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card flex flex-wrap items-center gap-4 py-4">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Filter by Product</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
            className="input py-1 text-xs"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Filter by Priority</label>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="input py-1 text-xs"
          >
            <option value="all">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Filter by Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input py-1 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card py-16 text-center text-slate-400 space-y-2">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="text-sm font-medium text-slate-300">No Alerts Found</p>
          <p className="text-xs">No active alerts match your current filter settings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`card p-5 space-y-4 border transition-all ${
                alert.status === 'Resolved'
                  ? 'opacity-70 border-slate-700 bg-slate-900/40'
                  : alert.priority === 'HIGH'
                  ? 'border-rose-500/50 bg-rose-950/15'
                  : alert.priority === 'MEDIUM'
                  ? 'border-amber-500/50 bg-amber-950/15'
                  : 'border-blue-500/50 bg-blue-950/15'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                        alert.priority === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : alert.priority === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      }`}
                    >
                      {alert.priority} PRIORITY
                    </span>
                    <h3 className="font-bold text-white text-base">{alert.title}</h3>
                    {alert.issue && (
                      <span className="text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800 px-2 py-0.5 rounded">
                        Issue: {alert.issue}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{alert.message}</p>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={alert.status}
                    onChange={(e) => handleStatusChange(alert.id, e.target.value)}
                    disabled={updatingId === alert.id}
                    className="input text-xs py-1"
                  >
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Negative percentage if present */}
              {alert.negative_percentage && (
                <div className="text-xs text-rose-400 font-medium">
                  Negative Feedback Rate: {alert.negative_percentage.toFixed(1)}% (Threshold: &gt; 30%)
                </div>
              )}

              {/* Actionable Recommendations */}
              {alert.recommendations && alert.recommendations.length > 0 && (
                <div className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Sparkles className="h-4 w-4" />
                    Recommended Seller Remediation Actions:
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {alert.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Alert Triggered: {formatDate(alert.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
