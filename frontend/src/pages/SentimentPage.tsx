import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart2, Filter, ThumbsUp, ThumbsDown, MinusCircle, Search } from 'lucide-react'
import { productsApi, reviewsApi, analysisApi } from '../services/api'
import type { Product, Review, AnalysisResult } from '../types'
import SentimentPieChart from '../components/charts/SentimentPieChart'
import ConfidenceBar from '../components/ui/ConfidenceBar'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils'

export default function SentimentPage() {
  const [searchParams] = useSearchParams()
  const queryProductId = searchParams.get('product_id')

  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | ''>(() =>
    queryProductId ? Number(queryProductId) : ''
  )
  const [reviews, setReviews] = useState<Review[]>([])
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (queryProductId) {
      setSelectedProductId(Number(queryProductId))
    }
  }, [queryProductId])

  useEffect(() => {
    if (selectedProductId) {
      loadReviews(Number(selectedProductId))
    }
  }, [selectedProductId])

  const loadData = async () => {
    try {
      const res = await productsApi.getProducts()
      setProducts(res.data)
      if (res.data.length > 0) {
        const targetId = queryProductId ? Number(queryProductId) : (selectedProductId || res.data[0].id)
        setSelectedProductId(targetId)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async (pId: number) => {
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

  // Combine review with its analysis
  const combined = reviews.map((r) => {
    const a = analyses.find((an) => an.review_id === r.id) || (r as any).analysis
    return { ...r, analysis: a }
  })

  const filtered = combined.filter((item) => {
    const matchesSentiment =
      filterSentiment === 'all' || item.analysis?.sentiment === filterSentiment
    const matchesSearch =
      !searchQuery ||
      item.original_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.translated_text && item.translated_text.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSentiment && matchesSearch
  })

  const posCount = analyses.filter((a) => a.sentiment === 'positive').length
  const negCount = analyses.filter((a) => a.sentiment === 'negative').length
  const neuCount = analyses.filter((a) => a.sentiment === 'neutral').length
  const total = posCount + negCount + neuCount || 1

  const pieData = [
    { name: 'Positive', value: posCount, color: '#22c55e' },
    { name: 'Neutral', value: neuCount, color: '#eab308' },
    { name: 'Negative', value: negCount, color: '#ef4444' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Sentiment Analysis</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pretrained RoBERTa deep learning sentiment classification with calibrated confidence certainty scores.
        </p>
      </div>

      {/* Selectors and Metrics Header */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Product selector & breakdown */}
        <div className="card space-y-4 lg:col-span-1">
          <div>
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
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-700/60">
            <span className="text-xs font-semibold text-slate-300">Sentiment Distribution Ratio</span>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ThumbsUp className="h-3.5 w-3.5" /> Positive:
              </span>
              <span className="font-semibold text-white">
                {posCount} ({((posCount / total) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-400">
                <MinusCircle className="h-3.5 w-3.5" /> Neutral:
              </span>
              <span className="font-semibold text-white">
                {neuCount} ({((neuCount / total) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-rose-400">
                <ThumbsDown className="h-3.5 w-3.5" /> Negative:
              </span>
              <span className="font-semibold text-white">
                {negCount} ({((negCount / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Sentiment Pie Chart */}
        <div className="card lg:col-span-2 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">Visual Breakdown</h2>
          <div className="h-64 min-h-[220px]">
            <SentimentPieChart data={pieData} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterSentiment('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterSentiment === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Sentiments ({analyses.length})
          </button>
          <button
            onClick={() => setFilterSentiment('positive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterSentiment === 'positive'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Positive ({posCount})
          </button>
          <button
            onClick={() => setFilterSentiment('neutral')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterSentiment === 'neutral'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Neutral ({neuCount})
          </button>
          <button
            onClick={() => setFilterSentiment('negative')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterSentiment === 'negative'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Negative ({negCount})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within reviews..."
            className="input pl-9 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center text-slate-400">
          <p>No reviews match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="card p-5 space-y-3 border border-slate-700/60 bg-slate-800/30 hover:border-slate-600 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  {item.rating && (
                    <span className="text-amber-400 font-semibold text-sm">
                      {'★'.repeat(Math.round(item.rating))}
                      {'☆'.repeat(5 - Math.round(item.rating))}
                    </span>
                  )}
                  {item.original_language && item.original_language !== 'en' && (
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] px-2 py-0.5 rounded">
                      {item.original_language.toUpperCase()} &rarr; EN
                    </span>
                  )}
                  {item.reviewer_id && (
                    <span className="text-xs text-slate-400 font-mono">{item.reviewer_id}</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {item.analysis && (
                    <Badge variant={item.analysis.sentiment as any}>
                      {item.analysis.sentiment.toUpperCase()}
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-200">{item.original_text}</p>
                {item.translated_text && (
                  <p className="mt-1 text-xs text-cyan-300 italic">
                    Translated: "{item.translated_text}"
                  </p>
                )}
              </div>

              {item.analysis && (
                <div className="pt-2 border-t border-slate-800">
                  <ConfidenceBar
                    confidence={item.analysis.sentiment_confidence}
                    label="RoBERTa Confidence Certainty"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
