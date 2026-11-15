import React, { useState, useEffect } from 'react'
import { FileText, Download, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { reportsApi, productsApi } from '../services/api'
import type { Report, Product } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [reportsRes, productsRes] = await Promise.all([
        reportsApi.getReports(),
        productsApi.getProducts(),
      ])
      setReports(reportsRes.data)
      setProducts(productsRes.data)
      if (productsRes.data.length > 0) {
        setSelectedProductId(productsRes.data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setSuccessMessage('')
    try {
      const res = await reportsApi.generateReport(selectedProductId ? Number(selectedProductId) : (undefined as any))
      setReports((prev) => [res.data, ...prev])
      setSuccessMessage('Professional PDF Report compiled and generated successfully!')
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.detail || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (reportId: number, reportName: string) => {
    try {
      const res = await reportsApi.downloadReport(reportId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = reportName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed', err)
      alert('Could not download the requested report file.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Executive PDF Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate comprehensive, publication-grade PDF executive dossiers featuring sentiment distribution, aspect breakdown, fraud metrics, and AI recommendations.
        </p>
      </div>

      {/* Report Generator Box */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-white">Generate New Product Intelligence Report</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Select Product Dossier Target:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
              className="input text-sm"
            >
              <option value="">All Products Overview</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary mt-auto flex items-center justify-center gap-2 py-2.5 px-5"
          >
            {generating ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Compiling ReportLab PDF...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Generate PDF Dossier</span>
              </>
            )}
          </button>
        </div>

        {successMessage && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}
      </div>

      {/* Generated Reports Table */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-white">Generated Reports Archive</h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText className="mx-auto mb-2 h-10 w-10 text-slate-600" />
            <p className="font-medium text-slate-300">No Reports Generated Yet</p>
            <p className="text-xs">Select a product above to compile your first executive review report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs">
                  <th className="py-3 px-4">Report File Name</th>
                  <th className="py-3 px-4">Associated Product</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 text-xs">
                {reports.map((report) => {
                  const prod = products.find((p) => p.id === report.product_id)
                  return (
                    <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        {report.report_name}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {prod ? prod.name : 'All Products Overview'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDownload(report.id, report.report_name)}
                          className="btn-outline inline-flex items-center gap-1.5 py-1 px-3 text-xs"
                        >
                          <Download className="h-3.5 w-3.5 text-cyan-400" />
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
