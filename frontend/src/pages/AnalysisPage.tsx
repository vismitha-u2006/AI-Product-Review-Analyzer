import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Languages,
  Plus,
  Trash2,
  FileEdit,
  Info
} from 'lucide-react'
import { productsApi, reviewsApi, aiApi, analysisApi } from '../services/api'
import type { Product, Review, AnalysisResult } from '../types'
import ConfidenceBar from '../components/ui/ConfidenceBar'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function AnalysisPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [activeTab, setActiveTab] = useState<'single' | 'multiple' | 'file'>('single')

  // Single review form
  const [singleText, setSingleText] = useState('')
  const [singleRating, setSingleRating] = useState<number>(5)
  const [singleReviewerId, setSingleReviewerId] = useState('')
  const [translating, setTranslating] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [detectedLang, setDetectedLang] = useState('')

  // Multi review form
  const [multiReviews, setMultiReviews] = useState<Array<{ text: string; rating: number }>>([
    { text: '', rating: 5 },
    { text: '', rating: 4 },
  ])

  // Document upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [textPreview, setTextPreview] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ total: number; success: number; failed: number } | null>(null)

  // Analysis result state
  const [analyzing, setAnalyzing] = useState(false)
  const [quickResult, setQuickResult] = useState<{
    sentiment?: { sentiment: string; score: number; confidence: number; label: string }
    fake?: { is_suspicious: boolean; confidence: number; label: string; reasons: string[] }
    aspects?: Array<{ aspect: string; sentiment: string; confidence: number; text_snippet?: string }>
  } | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // AI Summary state (Module 10)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [aiSummary, setAiSummary] = useState<{
    summary: string
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    overall_satisfaction: string
  } | null>(null)

  // New Product creation state
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdCategory, setNewProdCategory] = useState('')
  const [creatingProd, setCreatingProd] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id)
    }
  }, [products, selectedProductId])

  const loadProducts = async () => {
    try {
      const res = await productsApi.getProducts()
      const list = res.data || []
      setProducts(list)
      if (list.length > 0) {
        setSelectedProductId((prev) => (prev ? prev : list[0].id))
      }
    } catch (err) {
      console.error('Failed to load products', err)
    }
  }

  const handleTranslate = async () => {
    if (!singleText.trim()) return
    setTranslating(true)
    try {
      const res = await aiApi.translate(singleText)
      setTranslatedText(res.data.translated_text)
      setDetectedLang(res.data.detected_language)
    } catch (err) {
      console.error('Translation error', err)
    } finally {
      setTranslating(false)
    }
  }

  const handleSingleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!selectedProductId) {
      setFormError('Please select or create a target product in the dropdown above before analyzing.')
      return
    }

    if (!singleText.trim()) {
      setFormError('Please enter review text in the box above before clicking Analyze Review Now.')
      const el = document.getElementById('review-textarea')
      if (el) el.focus()
      return
    }

    setAnalyzing(true)
    setQuickResult(null)
    setSuccessMessage('')

    try {
      // 1. Auto-detect & translate to English if in another language and not yet translated
      let textForAnalysis = singleText
      let activeTranslatedText = translatedText
      let activeDetectedLang = detectedLang

      if (!activeTranslatedText) {
        try {
          const transRes = await aiApi.translate(singleText)
          if (
            transRes.data &&
            transRes.data.translated_text &&
            transRes.data.detected_language !== 'en' &&
            transRes.data.translated_text.trim().toLowerCase() !== singleText.trim().toLowerCase()
          ) {
            activeTranslatedText = transRes.data.translated_text
            activeDetectedLang = transRes.data.detected_language
            setTranslatedText(activeTranslatedText)
            setDetectedLang(activeDetectedLang)
            textForAnalysis = activeTranslatedText
          }
        } catch (tErr) {
          console.warn('Auto translation notice:', tErr)
        }
      } else {
        textForAnalysis = activeTranslatedText
      }

      let effectiveRating = singleRating
      const lower = textForAnalysis.toLowerCase()
      const strongNeg = [
        'not good', 'no good', 'not great', 'not worth', 'not working', 'not recommend',
        'bad', 'terrible', 'worst', 'awful', 'waste', 'poor', 'hate', 'defective',
        'broken', 'disappointed', 'disappointing', 'drain', 'overheat', 'horrible', 'useless'
      ]
      if (strongNeg.some((w) => lower.includes(w)) && singleRating >= 4) {
        effectiveRating = 1
      }

      // 2. Submit review to backend with full translation metadata
      const reviewRes = await reviewsApi.createReview({
        product_id: Number(selectedProductId),
        original_text: singleText,
        translated_text: activeTranslatedText || singleText,
        original_language: activeDetectedLang || 'en',
        rating: effectiveRating,
        reviewer_id: singleReviewerId || undefined,
        source: 'manual',
      })

      // 3. Run instant multi-model inference on English text & persist analysis in DB
      const [sentRes, fakeRes, aspectRes] = await Promise.all([
        aiApi.analyzeSentiment(textForAnalysis),
        aiApi.detectFake(textForAnalysis, Number(selectedProductId)),
        aiApi.analyzeAspects(textForAnalysis),
        analysisApi.analyzeProduct(Number(selectedProductId), [reviewRes.data.id]),
      ])

      setQuickResult({
        sentiment: {
          sentiment: sentRes.data.sentiment,
          score: sentRes.data.score,
          confidence: sentRes.data.confidence,
          label: (sentRes.data as any).label || sentRes.data.sentiment,
        },
        fake: {
          is_suspicious: (fakeRes.data as any).is_suspicious ?? (fakeRes.data as any).is_fake ?? false,
          confidence: fakeRes.data.confidence,
          label: fakeRes.data.label,
          reasons: fakeRes.data.reasons,
        },
        aspects: aspectRes.data.aspects,
      })

      setSuccessMessage('Review saved and deep learning pipeline executed successfully!')
      // Navigate directly to Sentiment page after review analysis
      navigate(`/sentiment?product_id=${selectedProductId}`)
    } catch (err) {
      console.error('Analysis error', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleMultiSubmit = async () => {
    if (!selectedProductId) return
    const valid = multiReviews.filter((r) => r.text.trim())
    if (valid.length === 0) return
    setAnalyzing(true)

    try {
      for (const item of valid) {
        await reviewsApi.createReview({
          product_id: Number(selectedProductId),
          original_text: item.text,
          rating: item.rating,
          source: 'manual-multi',
        })
      }
      // Run batch analysis on product
      await analysisApi.analyzeProduct(Number(selectedProductId))
      setSuccessMessage(`Successfully added and analyzed ${valid.length} reviews!`)
      setMultiReviews([{ text: '', rating: 5 }])
      navigate(`/sentiment?product_id=${selectedProductId}`)
    } catch (err) {
      console.error('Error submitting multiple reviews', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadResult(null)
    setTextPreview([])

    const name = file.name.toLowerCase()
    if (name.endsWith('.txt')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        if (text) {
          const blocks = text.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)
          if (blocks.length > 1) {
            setTextPreview(blocks.slice(0, 5))
          } else {
            const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
            setTextPreview(lines.slice(0, 5))
          }
        }
      }
      reader.readAsText(file)
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      setTextPreview([
        `Microsoft Word Document (${file.name}) loaded successfully.`,
        'All review paragraphs and entries will be automatically extracted and analyzed upon upload.'
      ])
    }
  }

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedProductId) return
    setUploading(true)
    setUploadResult(null)

    try {
      const res = await reviewsApi.bulkUpload(Number(selectedProductId), uploadFile)
      setUploadResult(res.data)
      // Trigger full analysis pipeline for new reviews
      await analysisApi.analyzeProduct(Number(selectedProductId))
      setSuccessMessage(`Upload complete: ${res.data.success} reviews added and analyzed.`)
      navigate(`/sentiment?product_id=${selectedProductId}`)
    } catch (err: any) {
      console.error('Bulk upload failed', err)
      alert(err.response?.data?.detail || 'Failed to process file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Review Analysis Engine</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter reviews manually, in bulk, or via CSV/Excel. The system runs RoBERTa sentiment, fake review detection, aspect extraction, and translation.
        </p>
      </div>

      {/* Product Selection & AI Summary */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Target Product for Analysis
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value ? Number(e.target.value) : '')
                setAiSummary(null)
                if (formError) setFormError('')
              }}
              className="input"
            >
              {products.length === 0 ? (
                <option value="">No products available — add one to begin</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category || 'General'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {products.length === 0 && (
              <button
                type="button"
                onClick={async () => {
                  setCreatingProd(true)
                  try {
                    const starter = await productsApi.createProduct({
                      name: 'Apex Smartphone Pro',
                      category: 'Electronics',
                      description: 'Flagship smartphone with high-refresh display and AI camera',
                    })
                    setProducts([starter.data])
                    setSelectedProductId(starter.data.id)
                  } catch (err) {
                    console.error('Failed to create starter product', err)
                  } finally {
                    setCreatingProd(false)
                  }
                }}
                className="btn-primary flex items-center gap-1.5 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Add Starter Product
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowNewProduct(!showNewProduct)}
              className="btn-outline flex items-center gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Product
            </button>
            <button
              type="button"
              disabled={!selectedProductId || loadingSummary}
              onClick={async () => {
                if (!selectedProductId) return
                setLoadingSummary(true)
                try {
                  const res = await aiApi.generateSummary(Number(selectedProductId))
                  setAiSummary(res.data as any)
                } catch (err: any) {
                  alert(err.response?.data?.detail || 'Could not generate summary')
                } finally {
                  setLoadingSummary(false)
                }
              }}
              className="btn-secondary flex items-center gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loadingSummary ? 'Generating AI Summary...' : 'Generate AI Product Summary'}
            </button>
          </div>
        </div>

        {showNewProduct && (
          <div className="flex flex-col sm:flex-row items-end gap-3 pt-3 border-t border-slate-700/60">
            <div className="flex-1 w-full">
              <label className="block text-xs text-slate-400 mb-1">Product Name</label>
              <input
                type="text"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="e.g. UltraBook Pro 16"
                className="input text-xs py-2"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <input
                type="text"
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value)}
                placeholder="e.g. Laptops"
                className="input text-xs py-2"
              />
            </div>
            <button
              type="button"
              disabled={creatingProd || !newProdName.trim()}
              onClick={async () => {
                setCreatingProd(true)
                try {
                  const res = await productsApi.createProduct({
                    name: newProdName.trim(),
                    category: newProdCategory.trim() || 'Electronics',
                  })
                  setProducts((prev) => [...prev, res.data])
                  setSelectedProductId(res.data.id)
                  setNewProdName('')
                  setNewProdCategory('')
                  setShowNewProduct(false)
                } finally {
                  setCreatingProd(false)
                }
              }}
              className="btn-primary text-xs py-2 px-4 whitespace-nowrap"
            >
              {creatingProd ? 'Adding...' : 'Create Product'}
            </button>
          </div>
        )}

        {aiSummary && (
          <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4 space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                AI-Generated Customer Opinion Summary
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                Satisfaction: {aiSummary.overall_satisfaction}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{aiSummary.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-3">
                <span className="font-semibold text-emerald-400 block mb-1">Product Strengths (What Customers Like)</span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {(aiSummary.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="rounded-lg bg-rose-950/30 border border-rose-500/20 p-3">
                <span className="font-semibold text-rose-400 block mb-1">Product Weaknesses (What Customers Dislike)</span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {(aiSummary.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
              <div className="rounded-lg bg-blue-950/30 border border-blue-500/20 p-3">
                <span className="font-semibold text-blue-400 block mb-1">Suggested Seller Improvements</span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {(aiSummary.suggestions || []).map((sg, i) => <li key={i}>{sg}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('single')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'single'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Single Review Analysis
        </button>
        <button
          onClick={() => setActiveTab('multiple')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'multiple'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Multiple Reviews
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'file'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Upload Review Document (Word / Notepad)
        </button>
      </div>

      {/* Single Review Input Tab */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Input Form */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">Enter Customer Review</h2>
            <form onSubmit={handleSingleAnalyze} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="review-textarea" className="block text-xs font-medium text-slate-400">
                    Review Text (English, Spanish, French, German, etc.)
                  </label>
                  {singleText.trim() && (
                    <span className="text-xs text-slate-500 font-mono">
                      {singleText.trim().length} chars
                    </span>
                  )}
                </div>
                <textarea
                  id="review-textarea"
                  rows={4}
                  value={singleText}
                  onChange={(e) => {
                    setSingleText(e.target.value)
                    if (formError) setFormError('')
                  }}
                  placeholder="e.g. The battery is not good and drains rapidly. Terrible experience, do not buy..."
                  className="input resize-none"
                />
              </div>

              {/* Quick Fill Test Samples */}
              <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-2.5 space-y-1.5">
                <span className="text-xs text-slate-400 font-medium block">
                  Quick Fill Test Samples (Click to load):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSingleText('The battery is not good and drains rapidly. Terrible experience, do not buy.')
                      setSingleRating(1)
                      setFormError('')
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚡</span> Negative Review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSingleText('Outstanding battery life, crystal-clear audio, and ultra-fast charging. Best purchase ever!')
                      setSingleRating(5)
                      setFormError('')
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>✨</span> Positive Review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSingleText('El sonido es increíble y la batería dura todo el día. Muy recomendable!')
                      setSingleRating(5)
                      setFormError('')
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>🌐</span> Spanish Review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSingleText('BEST PRODUCT EVER 5 STARS BUY IT NOW HIGHLY RECOMMEND AMAZING PERFECT PRODUCT!!!!!')
                      setSingleRating(5)
                      setFormError('')
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔍</span> Suspicious Review
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={translating || !singleText.trim()}
                  className="btn-outline flex items-center gap-2 text-xs"
                >
                  <Languages className="h-3.5 w-3.5 text-cyan-400" />
                  {translating ? 'Translating...' : 'Detect & Translate to English'}
                </button>
                {detectedLang && (
                  <span className="text-xs text-slate-400">
                    Detected language: <span className="text-cyan-400 font-semibold">{detectedLang.toUpperCase()}</span>
                  </span>
                )}
              </div>

              {translatedText && (
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3">
                  <p className="text-xs font-medium text-cyan-400 mb-1">Translated Review (English):</p>
                  <p className="text-sm text-slate-200">{translatedText}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Customer Rating</label>
                  <select
                    value={singleRating}
                    onChange={(e) => setSingleRating(Number(e.target.value))}
                    className="input"
                  >
                    <option value={5}>5 Stars (Excellent)</option>
                    <option value={4}>4 Stars (Good)</option>
                    <option value={3}>3 Stars (Average)</option>
                    <option value={2}>2 Stars (Poor)</option>
                    <option value={1}>1 Star (Terrible)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Reviewer ID (Optional)</label>
                  <input
                    type="text"
                    value={singleReviewerId}
                    onChange={(e) => setSingleReviewerId(e.target.value)}
                    placeholder="e.g. CUST-9021"
                    className="input"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/15 border border-rose-500/40 rounded-lg text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={analyzing}
                className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99]"
              >
                {analyzing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Running Deep Learning Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Analyze Review Now</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Card */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">AI Analysis Results</h2>
            {successMessage && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400">
                {successMessage}
              </div>
            )}

            {!quickResult ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="mx-auto mb-2 h-10 w-10 text-slate-600" />
                <p className="font-medium text-slate-300">Ready for Analysis</p>
                <p className="text-xs">
                  Submit a review to generate sentiment, fake detection, and aspect-based classification.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sentiment Result */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Overall Sentiment</span>
                    <Badge variant={quickResult.sentiment?.sentiment as any}>
                      {quickResult.sentiment?.label || 'Neutral'}
                    </Badge>
                  </div>
                  <ConfidenceBar
                    confidence={quickResult.sentiment?.confidence || 0.5}
                    sentiment={quickResult.sentiment?.sentiment as any}
                    label="Model Certainty (RoBERTa)"
                  />
                </div>

                {/* Fake Review Result */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Authenticity Classification</span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        quickResult.fake?.is_suspicious
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : quickResult.fake?.label === 'genuine'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {quickResult.fake?.label?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <ConfidenceBar
                    confidence={quickResult.fake?.confidence || 0.6}
                    label="Prediction Confidence"
                  />
                  {quickResult.fake?.reasons && quickResult.fake.reasons.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <span className="text-xs font-medium text-slate-400">Evidence / Reasons:</span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                        {quickResult.fake.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-slate-500 italic">
                    Note: Suspicious review detection is an AI prediction based on linguistic patterns, not definitive legal proof of fraud.
                  </p>
                </div>

                {/* ABSA Result */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                  <span className="text-xs font-medium text-slate-400 block mb-2">
                    Aspect-Based Sentiment Breakdown
                  </span>
                  {!quickResult.aspects || quickResult.aspects.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No specific predefined aspects (e.g. camera, battery, display) mentioned in this text.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-400">
                            <th className="py-1">Aspect</th>
                            <th className="py-1">Sentiment</th>
                            <th className="py-1">Confidence</th>
                            <th className="py-1">Snippet</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {quickResult.aspects.map((asp, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 font-medium text-white">{asp.aspect}</td>
                              <td className="py-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                    asp.sentiment === 'positive'
                                      ? 'text-emerald-400 bg-emerald-500/10'
                                      : asp.sentiment === 'negative'
                                      ? 'text-rose-400 bg-rose-500/10'
                                      : 'text-amber-400 bg-amber-500/10'
                                  }`}
                                >
                                  {asp.sentiment.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-1.5">{(asp.confidence * 100).toFixed(0)}%</td>
                              <td className="py-1.5 text-slate-400 italic truncate max-w-[150px]">
                                "{asp.text_snippet}"
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multiple Reviews Tab */}
      {activeTab === 'multiple' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Batch Review Entry</h2>
            <button
              onClick={() => setMultiReviews([...multiReviews, { text: '', rating: 5 }])}
              className="btn-outline flex items-center gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Review
            </button>
          </div>

          <div className="space-y-3">
            {multiReviews.map((rev, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                <span className="mt-2 text-xs font-bold text-slate-500">#{idx + 1}</span>
                <textarea
                  rows={2}
                  value={rev.text}
                  onChange={(e) => {
                    const updated = [...multiReviews]
                    updated[idx].text = e.target.value
                    setMultiReviews(updated)
                  }}
                  placeholder="Enter review text..."
                  className="input flex-1 resize-none text-sm"
                />
                <select
                  value={rev.rating}
                  onChange={(e) => {
                    const updated = [...multiReviews]
                    updated[idx].rating = Number(e.target.value)
                    setMultiReviews(updated)
                  }}
                  className="input w-28 text-xs"
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
                {multiReviews.length > 1 && (
                  <button
                    onClick={() => setMultiReviews(multiReviews.filter((_, i) => i !== idx))}
                    className="p-2 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleMultiSubmit}
            disabled={analyzing || !selectedProductId}
            className="btn-primary flex items-center gap-2"
          >
            {analyzing ? <LoadingSpinner size="sm" /> : <Sparkles className="h-4 w-4" />}
            Submit and Run Analysis on All Reviews
          </button>
        </div>
      )}

      {/* Word / Notepad Document Upload Tab */}
      {activeTab === 'file' && (
        <div className="card space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Upload Review Document</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Upload customer reviews from a <span className="text-cyan-400 font-semibold">Microsoft Word (.docx, .doc)</span> or <span className="text-cyan-400 font-semibold">Notepad (.txt)</span> document. Each paragraph, numbered review (e.g. 1., 2.), or bullet point entry will be automatically extracted and analyzed.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 text-center transition-colors bg-slate-900/40">
            <Upload className="mx-auto h-12 w-12 text-blue-400 mb-3" />
            <input
              type="file"
              id="file-upload"
              accept=".txt,.docx,.doc,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer btn-outline inline-flex items-center gap-2 text-sm font-medium mb-2 px-5 py-2.5"
            >
              <FileText className="h-4 w-4 text-cyan-400" />
              Choose Word or Notepad File (.docx, .doc, .txt)
            </label>
            <p className="text-xs text-slate-400">
              {uploadFile ? (
                <span className="text-emerald-400 font-medium">
                  Selected File: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                'Supports Microsoft Word (.docx, .doc) and Notepad plain text (.txt)'
              )}
            </p>
          </div>

          {/* Review Document Content Preview */}
          {textPreview.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                Document Content Preview:
              </span>
              <div className="space-y-2">
                {textPreview.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3 text-xs text-slate-200">
                    <span className="text-[10px] text-cyan-400 font-semibold block mb-1">Entry #{idx + 1}</span>
                    <p className="line-clamp-3 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                <CheckCircle className="h-4 w-4" />
                Document Processed and Reviews Analyzed
              </div>
              <p className="text-xs text-slate-300">
                Total Reviews Detected: <span className="font-semibold text-white">{uploadResult.total}</span> | Successfully Saved: <span className="font-semibold text-emerald-400">{uploadResult.success}</span> | Failed: <span className="font-semibold text-rose-400">{uploadResult.failed}</span>
              </p>
            </div>
          )}

          <button
            onClick={handleFileUpload}
            disabled={uploading || !uploadFile || !selectedProductId}
            className="btn-primary flex items-center gap-2"
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Processing & Analyzing Reviews...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Upload and Analyze Reviews from Document</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
