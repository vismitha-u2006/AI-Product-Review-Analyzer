import React, { useState, useEffect } from 'react'
import { ShieldAlert, ShieldCheck, AlertTriangle, Info, Search, Filter } from 'lucide-react'
import { productsApi, reviewsApi, analysisApi } from '../services/api'
import type { Product, Review, AnalysisResult } from '../types'
import ConfidenceBar from '../components/ui/ConfidenceBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils'

export default function FakeDetectionPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [filterLabel, setFilterLabel] = useState<'all' | 'suspicious' | 'genuine' | 'insufficient_evidence'>('all')
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

  const combined = reviews.map((r) => {
    const a = analyses.find((an) => an.review_id === r.id) || (r as any).analysis
    return { ...r, analysis: a }
  })

  const filtered = combined.filter((item) => {
    if (filterLabel === 'all') return true
    if (filterLabel === 'suspicious') return item.analysis?.is_suspicious === true
    return item.analysis?.fake_label === filterLabel
  })

  const totalAnalyzed = analyses.length
  const suspiciousCount = analyses.filter((a) => a.is_suspicious).length
  const genuineCount = analyses.filter((a) => a.fake_label === 'genuine').length
  const insufficientCount = analyses.filter((a) => a.fake_label === 'insufficient_evidence').length

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Fake & Suspicious Review Detection</h1>
        <p className="mt-1 text-sm text-slate-400">
          Explainable NLP anti-fraud classification combining linguistic pattern heuristics, generic text identification, repetition detection, and confidence scoring.
        </p>
      </div>

      {/* Product Selector and Fraud Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="card space-y-3 lg:col-span-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Select Product</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(Number(e.target.value))}
            className="input text-sm"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Total reviews evaluated: <span className="font-semibold text-white">{totalAnalyzed}</span>
          </p>
        </div>

        {/* 3 Metric Cards */}
        <div className="card flex items-center gap-4">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Likely Genuine</p>
            <h3 className="text-2xl font-bold text-white">{genuineCount}</h3>
            <p className="text-xs text-emerald-400">
              {totalAnalyzed > 0 ? ((genuineCount / totalAnalyzed) * 100).toFixed(0) : 0}% of reviews
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="rounded-xl bg-rose-500/10 p-3 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Suspicious / Fake</p>
            <h3 className="text-2xl font-bold text-white">{suspiciousCount}</h3>
            <p className="text-xs text-rose-400">
              {totalAnalyzed > 0 ? ((suspiciousCount / totalAnalyzed) * 100).toFixed(0) : 0}% flag rate
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Insufficient Evidence</p>
            <h3 className="text-2xl font-bold text-white">{insufficientCount}</h3>
            <p className="text-xs text-amber-400">Neutral signal</p>
          </div>
        </div>
      </div>

      {/* Important Disclaimer Alert */}
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-200 space-y-1">
          <p className="font-semibold text-indigo-300">Explainable AI Disclaimer</p>
          <p>
            Suspicious review detection is an algorithmic prediction generated through multi-factor pattern heuristics (e.g. repeated review text, extreme promotional buzzwords, excessive capitalisation, review brevity, and duplication). It provides actionable risk intelligence, not definitive legal proof of fraudulent behaviour.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setFilterLabel('all')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            filterLabel === 'all'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          All Reviews ({totalAnalyzed})
        </button>
        <button
          onClick={() => setFilterLabel('suspicious')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            filterLabel === 'suspicious'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Suspicious Flags ({suspiciousCount})
        </button>
        <button
          onClick={() => setFilterLabel('genuine')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            filterLabel === 'genuine'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Likely Genuine ({genuineCount})
        </button>
      </div>

      {/* Review Cards */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center text-slate-400">
          <p>No reviews match this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`card p-5 space-y-3 border transition-colors ${
                item.analysis?.is_suspicious
                  ? 'border-rose-500/40 bg-rose-950/10 hover:border-rose-500/60'
                  : 'border-slate-700/60 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      item.analysis?.is_suspicious
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : item.analysis?.fake_label === 'genuine'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {item.analysis?.fake_label ? item.analysis.fake_label.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                  </span>
                  {item.reviewer_id && (
                    <span className="text-xs text-slate-500 font-mono">ID: {item.reviewer_id}</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
              </div>

              <div>
                <p className="text-sm text-slate-200">"{item.original_text}"</p>
                {item.translated_text && (
                  <p className="mt-1 text-xs text-cyan-300 italic">
                    Translated: "{item.translated_text}"
                  </p>
                )}
              </div>

              {item.analysis && (
                <div className="space-y-2 pt-2 border-t border-slate-700/60">
                  <ConfidenceBar
                    confidence={item.analysis.fake_confidence || 0.6}
                    label="Prediction Confidence"
                  />

                  {item.analysis.fake_reasons && item.analysis.fake_reasons.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <span className="text-xs font-medium text-slate-400">Analysis Breakdown & Indicators:</span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                        {item.analysis.fake_reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
