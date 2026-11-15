import React, { useState, useEffect } from 'react'
import { Clock, Search, ChevronLeft, ChevronRight, Eye, ShieldAlert, ThumbsUp, ThumbsDown } from 'lucide-react'
import { analysisApi, productsApi } from '../services/api'
import type { AnalysisResult, Product } from '../types'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils'

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisResult[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProductFilter, setSelectedProductFilter] = useState<number | ''>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [histRes, prodRes] = await Promise.all([
        analysisApi.getAnalysisHistory(),
        productsApi.getProducts(),
      ])
      setHistory(histRes.data)
      setProducts(prodRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = history.filter((item) => {
    const matchesProduct = !selectedProductFilter || item.product_id === Number(selectedProductFilter)
    return matchesProduct
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Analysis History Log</h1>
        <p className="mt-1 text-sm text-slate-400">
          Permanent audit log of all completed deep learning analyses, model certainty scores, and aspect tags.
        </p>
      </div>

      {/* Filter Header */}
      <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 whitespace-nowrap">Filter by Product:</label>
          <select
            value={selectedProductFilter}
            onChange={(e) => {
              setSelectedProductFilter(e.target.value ? Number(e.target.value) : '')
              setCurrentPage(1)
            }}
            className="input text-xs py-1.5"
          >
            <option value="">All Products ({history.length})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-400">
          Showing {paginated.length} of {filtered.length} total records
        </span>
      </div>

      {/* History Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-slate-400 space-y-2">
          <Clock className="mx-auto h-12 w-12 text-slate-600" />
          <p className="text-sm font-medium text-slate-300">No Analysis History Found</p>
          <p className="text-xs">Submit reviews for analysis to start generating history records.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/60 text-slate-400">
                  <th className="py-3 px-4">Analysis ID</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Sentiment</th>
                  <th className="py-3 px-4">RoBERTa Certainty</th>
                  <th className="py-3 px-4">Fraud Status</th>
                  <th className="py-3 px-4">Extracted Aspects</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {paginated.map((item) => {
                  const prod = products.find((p) => p.id === item.product_id)
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-400">#{item.id}</td>
                      <td className="py-3 px-4 font-medium text-white">
                        {prod ? prod.name : `Product #${item.product_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={item.sentiment as any}>
                          {item.sentiment?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {(item.sentiment_confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-medium ${
                            item.is_suspicious
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {item.fake_label?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {item.aspect_results && item.aspect_results.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.aspect_results.map((asp: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                              >
                                {asp.aspect}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-800 p-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-outline flex items-center gap-1 py-1 px-3 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="text-xs text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-outline flex items-center gap-1 py-1 px-3 text-xs disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
