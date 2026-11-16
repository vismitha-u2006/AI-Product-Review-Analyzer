import React, { useState, useEffect } from 'react'
import { FileText, Download, Plus, CheckCircle, Clock, AlertCircle, ExternalLink, Sparkles } from 'lucide-react'
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
  const [lastGeneratedReport, setLastGeneratedReport] = useState<Report | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [autoDownload, setAutoDownload] = useState(true)

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
    setLastGeneratedReport(null)
    try {
      const res = await reportsApi.generateReport(selectedProductId ? Number(selectedProductId) : (undefined as any))
      const newReport = res.data
      setReports((prev) => [newReport, ...prev])
      setLastGeneratedReport(newReport)
      setSuccessMessage('Professional PDF Report compiled and generated successfully!')

      // If auto-download is enabled, immediately trigger download
      if (autoDownload) {
        handleDownload(newReport.id, newReport.report_name)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.detail || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (reportId: number, reportName: string) => {
    setDownloadingId(reportId)
    try {
      const res = await reportsApi.downloadReport(reportId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = reportName.endsWith('.pdf') ? reportName : `${reportName}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed', err)
      alert('Could not download the requested report file.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreview = async (reportId: number) => {
    try {
      const res = await reportsApi.downloadReport(reportId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Preview failed', err)
      alert('Could not preview the requested report.')
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
            className="btn-primary mt-auto flex items-center justify-center gap-2 py-2.5 px-5 shadow-md active:scale-95 cursor-pointer"
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

        {/* Options */}
        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={(e) => setAutoDownload(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 h-4 w-4 cursor-pointer"
            />
            <span>Automatically trigger download after report is generated</span>
          </label>
        </div>

        {/* Freshly Generated Report Download Banner */}
        {lastGeneratedReport && (
          <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-5 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Report Generated Successfully!
                    </h3>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      PDF Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Your executive dossier has been compiled with charts, aspect breakdown, and RoBERTa metrics.
                  </p>
                  <p className="text-xs font-mono text-cyan-400 mt-1 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {lastGeneratedReport.report_name}
                  </p>
                </div>
              </div>

              {/* Download & Preview Actions */}
              <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                <button
                  type="button"
                  onClick={() => handleDownload(lastGeneratedReport.id, lastGeneratedReport.report_name)}
                  disabled={downloadingId === lastGeneratedReport.id}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-md active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  {downloadingId === lastGeneratedReport.id ? 'Downloading...' : 'Download PDF Now'}
                </button>
                <button
                  type="button"
                  onClick={() => handlePreview(lastGeneratedReport.id)}
                  className="btn-outline flex items-center gap-1.5 py-2 px-3 text-xs font-medium cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                  Preview in Tab
                </button>
              </div>
            </div>
          </div>
        )}

        {successMessage && !lastGeneratedReport && (
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
                  const isDownloading = downloadingId === report.id
                  return (
                    <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        <span className="truncate max-w-xs">{report.report_name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {prod ? prod.name : 'All Products Overview'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(report.id, report.report_name)}
                            disabled={isDownloading}
                            className="btn-outline inline-flex items-center gap-1.5 py-1 px-3 text-xs cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-cyan-400" />
                            {isDownloading ? 'Downloading...' : 'Download PDF'}
                          </button>
                          <button
                            onClick={() => handlePreview(report.id)}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 text-slate-400 hover:text-white transition-colors"
                            title="Preview in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
