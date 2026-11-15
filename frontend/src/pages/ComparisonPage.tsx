import React, { useState, useEffect } from 'react'
import {
  GitCompare,
  Trophy,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Plus,
  PackagePlus,
  X
} from 'lucide-react'
import { productsApi, comparisonApi, reviewsApi, analysisApi } from '../services/api'
import type { Product, CompareResult } from '../types'
import ProductCompareChart from '../components/charts/ProductCompareChart'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function ComparisonPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [comparing, setComparing] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState('')

  // New product addition state
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductCategory, setNewProductCategory] = useState('')
  const [newReviewText, setNewReviewText] = useState('')
  const [newRating, setNewRating] = useState<number>(5)
  const [addingProduct, setAddingProduct] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await productsApi.getProducts()
      setProducts(res.data)
      if (res.data.length >= 2) {
        const initialIds = [res.data[0].id, res.data[1].id]
        setSelectedIds(initialIds)
        setComparing(true)
        try {
          const compRes = await comparisonApi.compareProducts(initialIds)
          setResult(compRes.data)
        } finally {
          setComparing(false)
        }
      } else if (res.data.length === 1) {
        setSelectedIds([res.data[0].id])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleProduct = (id: number) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter((pId) => pId !== id))
      }
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleCompare = async (idsToCompare?: number[]) => {
    const targetIds = idsToCompare || selectedIds
    if (targetIds.length < 2) {
      setError('Please select at least 2 products to compare.')
      return
    }
    setError('')
    setComparing(true)

    try {
      const res = await comparisonApi.compareProducts(targetIds)
      setResult(res.data)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || 'Comparison failed')
    } finally {
      setComparing(false)
    }
  }

  const handleAddProductForComparison = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProductName.trim()) return
    setAddingProduct(true)
    setAddError('')

    try {
      // 1. Create product in database
      const res = await productsApi.createProduct({
        name: newProductName.trim(),
        category: newProductCategory.trim() || 'General',
      })
      const newProd = res.data

      // 2. If review text is provided, save & analyze so product has sentiment metrics
      if (newReviewText.trim()) {
        const revRes = await reviewsApi.createReview({
          product_id: newProd.id,
          original_text: newReviewText.trim(),
          rating: newRating,
          source: 'comparison_engine',
        })
        await analysisApi.analyzeProduct(newProd.id, [revRes.data.id])
      }

      // 3. Add to product catalog list
      const updatedProducts = [...products, newProd]
      setProducts(updatedProducts)

      // 4. Add to selected IDs and re-run comparison
      const updatedSelectedIds = [...selectedIds, newProd.id]
      setSelectedIds(updatedSelectedIds)

      await handleCompare(updatedSelectedIds)

      // Reset form
      setNewProductName('')
      setNewProductCategory('')
      setNewReviewText('')
      setNewRating(5)
      setShowAddProduct(false)
    } catch (err: any) {
      console.error('Error adding product for comparison:', err)
      setAddError(err.response?.data?.detail || 'Failed to add product for comparison')
    } finally {
      setAddingProduct(false)
    }
  }

  // Format chart data for comparison chart
  const chartData = (result?.products || []).map((p: any) => ({
    name: p.product_name,
    positive: Math.round(p.positive_pct),
    negative: Math.round(p.negative_pct),
    neutral: Math.round(p.neutral_pct),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Product Comparison Engine</h1>
        <p className="mt-1 text-sm text-slate-400">
          Compare customer satisfaction, positive/negative feature sentiments, and fake review ratios with evidence-based AI recommendations.
        </p>
      </div>

      {/* Product Selector Bar */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="block text-xs font-semibold text-slate-300">
            Select Products to Compare (Select 2 or more):
          </label>
          <button
            type="button"
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="btn-outline text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 inline-flex items-center gap-1.5 text-xs py-1.5 px-3 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Another Product for Comparison
          </button>
        </div>

        {/* Existing Products List & Quick Toggle */}
        <div className="flex flex-wrap gap-2">
          {products.map((p) => {
            const isSelected = selectedIds.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => handleToggleProduct(p.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600/30 border-blue-500 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-slate-500'}`}
                />
                {p.name}
              </button>
            )
          })}
        </div>

        {/* Inline Add Product Form */}
        {showAddProduct && (
          <div className="rounded-xl border border-cyan-500/40 bg-slate-900/90 p-4 space-y-4 mt-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <PackagePlus className="h-4 w-4 text-cyan-400" />
                Add Another Product to Compare
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProduct(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddProductForComparison} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Product Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g. Apex Smartphone Ultra 5G"
                    className="input text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    placeholder="e.g. Smartphones, Audio, Fitness"
                    className="input text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sample Customer Review / Feedback (Optional, for instant sentiment analysis)
                </label>
                <textarea
                  rows={2}
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="e.g. Outstanding battery life and vibrant screen, but speakers could be louder."
                  className="input text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Rating:</label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(Number(e.target.value))}
                    className="input text-xs py-1 w-24"
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingProduct || !newProductName.trim()}
                  className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4"
                >
                  {addingProduct ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating & Comparing...</span>
                    </>
                  ) : (
                    <>
                      <GitCompare className="h-3.5 w-3.5" />
                      <span>Save & Compare Product</span>
                    </>
                  )}
                </button>
              </div>

              {addError && <p className="text-xs text-rose-400">{addError}</p>}
            </form>
          </div>
        )}

        <button
          onClick={() => handleCompare()}
          disabled={comparing || selectedIds.length < 2}
          className="btn-primary mt-2 flex items-center gap-2 text-xs"
        >
          {comparing ? <LoadingSpinner size="sm" /> : <GitCompare className="h-4 w-4" />}
          Compare Selected ({selectedIds.length})
        </button>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>

      {comparing ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : !result || !result.products || result.products.length === 0 ? (
        <div className="card py-12 text-center text-slate-400">
          <p>Select products and click Compare to view side-by-side analysis.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Recommendation Banner */}
          {result.recommendation && (
            <div className="rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-blue-950/40 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-semibold text-white">AI Comparative Recommendation</h2>
                {result.winner && (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold ml-2">
                    Winner: {result.winner}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{result.recommendation}</p>
            </div>
          )}

          {/* Side-by-Side Chart */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Sentiment Distribution Comparison (%)</h2>
            <div className="h-72">
              <ProductCompareChart data={chartData} />
            </div>
          </div>

          {/* Side-by-Side Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.products.map((p: any) => (
              <div
                key={p.product_id}
                className={`card p-5 space-y-4 border ${
                  result.winner === p.product_name
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{p.product_name}</h3>
                    <p className="text-xs text-slate-400">Total Reviews: {p.total_reviews}</p>
                  </div>
                  {result.winner === p.product_name && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      <Trophy className="h-3 w-3" /> Top Pick
                    </span>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-700/60">
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 block">Avg Rating</span>
                    <span className="font-bold text-amber-400 text-sm">
                      {p.avg_rating ? `${p.avg_rating.toFixed(1)} ★` : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 block">Suspicious Ratio</span>
                    <span className={`font-bold text-sm ${p.fake_pct > 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {p.fake_pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 block">Positive Reviews</span>
                    <span className="font-bold text-emerald-400 text-sm">{p.positive_pct.toFixed(0)}%</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 block">Negative Reviews</span>
                    <span className="font-bold text-rose-400 text-sm">{p.negative_pct.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Top Features */}
                {p.top_aspects && p.top_aspects.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-300">Feature Mentions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.top_aspects.map((asp: any, idx: number) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700"
                        >
                          {asp.aspect}: {asp.count} mentions
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
