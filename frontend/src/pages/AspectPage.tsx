import React, { useState, useEffect } from 'react'
import { Tags, ThumbsUp, ThumbsDown, Filter, Info, Layers } from 'lucide-react'
import { productsApi, reviewsApi, analysisApi } from '../services/api'
import type { Product, Review, AnalysisResult } from '../types'
import AspectBarChart from '../components/charts/AspectBarChart'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ConfidenceBar from '../components/ui/ConfidenceBar'

export default function AspectPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [selectedAspectFilter, setSelectedAspectFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (selectedProductId) {
      loadData(Number(selectedProductId))
    }
  }, [selectedProductId])

  const loadProducts = async () => {
    try {
      const res = await productsApi.getProducts()
      setProducts(res.data)
      if (res.data.length > 0) {
        setSelectedProductId(res.data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async (pId: number) => {
    setLoading(true)
    try {
      const [revRes, histRes] = await Promise.all([
        reviewsApi.getReviews(pId),
        analysisApi.getAnalysisHistory(),
      ])
      const revData = Array.isArray(revRes?.data) ? revRes.data : []
      const histData = Array.isArray(histRes?.data) ? histRes.data : []
      setReviews(revData)
      let prodAnalyses = histData.filter((a) => a && a.product_id === pId)
      if (prodAnalyses.length === 0 && revData.length > 0) {
        prodAnalyses = revData.map((r: any) => r.analysis).filter(Boolean)
      }
      setAnalyses(prodAnalyses)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Aggregate all aspects across reviews
  const aspectStats: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {}

  analyses.forEach((a) => {
    if (a.aspect_results && Array.isArray(a.aspect_results)) {
      a.aspect_results.forEach((asp: any) => {
        const name = (asp.aspect || '').capitalize ? (asp.aspect || '').capitalize() : (asp.aspect || '').charAt(0).toUpperCase() + (asp.aspect || '').slice(1).toLowerCase()
        if (!name) return
        if (!aspectStats[name]) {
          aspectStats[name] = { positive: 0, negative: 0, neutral: 0, total: 0 }
        }
        const s = (asp.sentiment || '').toLowerCase()
        if (s === 'positive') aspectStats[name].positive++
        else if (s === 'negative') aspectStats[name].negative++
        else aspectStats[name].neutral++
        aspectStats[name].total++
      })
    }
  })

  const aspectList = Object.entries(aspectStats).sort((a, b) => b[1].total - a[1].total)

  // Chart data
  const posChartData = aspectList
    .filter(([_, stats]) => stats.positive > 0)
    .map(([name, stats]) => ({ aspect: name, count: stats.positive }))
    .slice(0, 6)

  const negChartData = aspectList
    .filter(([_, stats]) => stats.negative > 0)
    .map(([name, stats]) => ({ aspect: name, count: stats.negative }))
    .slice(0, 6)

  // Reviews filtered by selected aspect
  const combined = reviews.map((r) => {
    const a = analyses.find((an) => an.review_id === r.id)
    return { ...r, analysis: a }
  })

  const filteredReviews = combined.filter((item) => {
    if (selectedAspectFilter === 'all') return true
    if (!item.analysis?.aspect_results) return false
    return item.analysis.aspect_results.some(
      (asp: any) => (asp.aspect || '').toLowerCase() === selectedAspectFilter.toLowerCase()
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Aspect-Based Sentiment Analysis (ABSA)</h1>
        <p className="mt-1 text-sm text-slate-400">
          Deconstructs reviews into individual product features (Battery, Camera, Display, Sound, Price) and evaluates granular sentiment per aspect.
        </p>
      </div>

      {/* Product Selection */}
      <div className="card">
        <label className="block text-xs font-medium text-slate-400 mb-1">Select Product</label>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(Number(e.target.value))}
          className="input max-w-md text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Aspect Analytics Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4" /> Most Appreciated Features
            </h2>
            <span className="text-xs text-slate-400">Positive Mentions</span>
          </div>
          <div className="h-64">
            <AspectBarChart data={posChartData} color="#10b981" />
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
              <ThumbsDown className="h-4 w-4" /> Most Complained-About Features
            </h2>
            <span className="text-xs text-slate-400">Negative Mentions</span>
          </div>
          <div className="h-64">
            <AspectBarChart data={negChartData} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Aspect Summary Table */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          Aspect-Level Sentiment Metrics Table
        </h2>
        {aspectList.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            No aspect features extracted for this product yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2">Feature Aspect</th>
                  <th className="py-2">Total Mentions</th>
                  <th className="py-2">Positive Ratio</th>
                  <th className="py-2">Negative Ratio</th>
                  <th className="py-2">Sentiment Sentiment Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {aspectList.map(([name, stats]) => {
                  const posPct = ((stats.positive / stats.total) * 100).toFixed(0)
                  const negPct = ((stats.negative / stats.total) * 100).toFixed(0)
                  const neuPct = ((stats.neutral / stats.total) * 100).toFixed(0)

                  return (
                    <tr
                      key={name}
                      onClick={() => setSelectedAspectFilter(name.toLowerCase())}
                      className="cursor-pointer hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2 font-medium text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        {name}
                      </td>
                      <td className="py-2 font-semibold">{stats.total}</td>
                      <td className="py-2 text-emerald-400">
                        {stats.positive} ({posPct}%)
                      </td>
                      <td className="py-2 text-rose-400">
                        {stats.negative} ({negPct}%)
                      </td>
                      <td className="py-2 min-w-[140px]">
                        <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-800">
                          <div style={{ width: `${posPct}%` }} className="bg-emerald-500" />
                          <div style={{ width: `${neuPct}%` }} className="bg-amber-500" />
                          <div style={{ width: `${negPct}%` }} className="bg-rose-500" />
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

      {/* Filter and Review Snippets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter by Aspect:
            </span>
            <button
              onClick={() => setSelectedAspectFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedAspectFilter === 'all'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Aspects
            </button>
            {aspectList.map(([name]) => (
              <button
                key={name}
                onClick={() => setSelectedAspectFilter(name.toLowerCase())}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedAspectFilter === name.toLowerCase()
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="card py-8 text-center text-xs text-slate-400">
            No reviews mention this aspect.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map((item) => (
              <div
                key={item.id}
                className="card p-4 space-y-2 border border-slate-700/60 bg-slate-800/30"
              >
                <p className="text-xs text-slate-300">"{item.original_text}"</p>
                {item.analysis?.aspect_results && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                    {item.analysis.aspect_results.map((asp: any, idx: number) => (
                      <span
                        key={idx}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium border ${
                          asp.sentiment === 'positive'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : asp.sentiment === 'negative'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {asp.aspect}: {asp.sentiment.toUpperCase()} ({(asp.confidence * 100).toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
