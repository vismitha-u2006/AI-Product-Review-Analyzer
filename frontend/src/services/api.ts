import axios from 'axios'
import type {
  User, Product, Review, AnalysisResult, SellerAlert,
  DashboardStats, DashboardCharts, Report, BulkUploadResult, CompareResult
} from '../types'
import {
  mockProducts, mockReviews, mockDashboardStats,
  mockDashboardCharts, mockAlerts, mockCompareResult
} from './mockData'

const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api'

const api = axios.create({ baseURL: apiBase })

function classifySentiment(text: string, rating?: number): {
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  confidence: number
  label: string
} {
  const t = (text || '').toLowerCase()

  const negativeIndicators = [
    'not good', 'no good', 'not great', 'not worth', 'not working', 'not recommend',
    'dont recommend', "don't recommend", 'did not like', "didn't like", 'disappointed',
    'disappointing', 'worst', 'terrible', 'awful', 'waste', 'bad', 'poor', 'useless',
    'cheap', 'broken', 'defective', 'defect', 'problem', 'issues', 'fails', 'failed',
    'failure', 'drain', 'drains', 'overheat', 'overheats', 'stutter', 'crash', 'crashes',
    'hate', 'slow', 'lag', 'lags', 'refund', 'regret', 'scam', 'return', 'damaged',
    'horrible', 'dies', 'died', 'unhelpful'
  ]

  const positiveIndicators = [
    'excellent', 'amazing', 'perfect', 'awesome', 'outstanding', 'fantastic',
    'love it', 'loved', 'great', 'brilliant', 'superb', 'smooth', 'crisp',
    'stellar', 'superior', 'highly recommend', 'best', 'good', 'satisfied'
  ]

  let negCount = 0
  for (const neg of negativeIndicators) {
    if (t.includes(neg)) negCount++
  }

  let posCount = 0
  for (const pos of positiveIndicators) {
    if (
      t.includes(pos) &&
      !t.includes('not ' + pos) &&
      !t.includes("don't " + pos) &&
      !t.includes("didn't " + pos) &&
      !t.includes("did not " + pos)
    ) {
      posCount++
    }
  }

  // Strong negative textual indicators take highest priority
  if (negCount > posCount) {
    return {
      sentiment: 'negative',
      score: -0.88,
      confidence: Math.min(0.98, 0.85 + negCount * 0.04),
      label: 'Negative',
    }
  }

  // Factor in customer star rating if provided
  if (rating !== undefined && rating <= 2) {
    return {
      sentiment: 'negative',
      score: -0.92,
      confidence: 0.95,
      label: 'Negative',
    }
  }

  if (posCount > negCount || (rating !== undefined && rating >= 4)) {
    return {
      sentiment: 'positive',
      score: 0.92,
      confidence: Math.min(0.98, 0.85 + posCount * 0.04),
      label: 'Positive',
    }
  }

  return {
    sentiment: 'neutral',
    score: 0.0,
    confidence: 0.70,
    label: 'Neutral',
  }
}

// Local mutable state for standalone preview mode
const clientReviews = [...mockReviews]
const clientProducts = [...mockProducts]
const clientAlerts = [...mockAlerts]

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => {
    // If Vercel returns HTML (SPA rewrite to index.html with 200 OK) for an API request
    if (typeof res.data === 'string' && res.data.trim().startsWith('<!doctype html>')) {
      return handleMockFallback(res.config)
    }
    return res
  },
  (err) => {
    const isOfflineOrUnreachable =
      !err.response ||
      err.response.status === 404 ||
      err.response.status === 405 ||
      err.code === 'ERR_NETWORK' ||
      err.message === 'Network Error'

    if (isOfflineOrUnreachable) {
      return handleMockFallback(err.config)
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

function handleMockFallback(config: any): Promise<any> {
  const url = (config.url || '').replace(/^\/api/, '')
  const method = (config.method || 'get').toLowerCase()

  // Auth Login
  if (url.includes('/auth/login')) {
    let email = 'demo@example.com'
    try {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
      if (body.email) email = body.email
    } catch {}
    const user: User = {
      id: 1,
      email,
      username: email.split('@')[0],
      created_at: new Date().toISOString(),
    }
    return Promise.resolve({
      data: {
        access_token: 'demo-token-' + Date.now(),
        token_type: 'bearer',
        user,
      },
      status: 200,
    })
  }

  // Dashboard Stats
  if (url.includes('/dashboard/stats')) {
    return Promise.resolve({ data: mockDashboardStats, status: 200 })
  }

  // Dashboard Charts
  if (url.includes('/dashboard/charts')) {
    return Promise.resolve({ data: mockDashboardCharts, status: 200 })
  }

  // Products List
  if (url.includes('/products') && method === 'get') {
    return Promise.resolve({ data: clientProducts, status: 200 })
  }

  // Create Product
  if (url.includes('/products') && method === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
    const newProd: Product = {
      id: clientProducts.length + 1,
      name: body.name || 'New Product',
      category: body.category || 'General',
      description: body.description || '',
      created_at: new Date().toISOString(),
      review_count: 0,
    }
    clientProducts.push(newProd)
    return Promise.resolve({ data: newProd, status: 201 })
  }

  // Reviews List
  if (url.includes('/reviews') && method === 'get') {
    const params = config.params || {}
    const filtered = params.product_id
      ? clientReviews.filter(r => r.product_id === Number(params.product_id))
      : clientReviews
    return Promise.resolve({ data: filtered, status: 200 })
  }

  // Create Review
  if (url.includes('/reviews') && method === 'post' && !url.includes('/bulk-upload')) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
    const text = body.original_text || ''
    const transText = body.translated_text || text
    const origLang = body.original_language || 'en'
    const isSuspicious = text.toUpperCase() === text && text.length > 20
    const rating = Number(body.rating) || 5
    const sentimentRes = classifySentiment(transText, rating)

    const newRev = {
      id: clientReviews.length + 1,
      product_id: body.product_id || 1,
      reviewer_id: 'REV-' + (clientReviews.length + 101),
      original_text: text,
      translated_text: transText,
      original_language: origLang,
      rating,
      source: 'web',
      created_at: new Date().toISOString(),
      analysis: {
        id: clientReviews.length + 1,
        review_id: clientReviews.length + 1,
        product_id: body.product_id || 1,
        sentiment: sentimentRes.sentiment,
        sentiment_score: sentimentRes.score,
        sentiment_confidence: sentimentRes.confidence,
        is_suspicious: isSuspicious,
        fake_confidence: isSuspicious ? 0.85 : 0.05,
        fake_label: isSuspicious ? 'suspicious' : 'genuine',
        fake_reasons: isSuspicious ? ['Excessive promotional phrasing detected.'] : ['Natural human feedback pattern.'],
        aspect_results: [
          { aspect: 'Overall Experience', sentiment: sentimentRes.sentiment, confidence: sentimentRes.confidence },
        ],
        created_at: new Date().toISOString(),
      },
    }
    clientReviews.unshift(newRev)
    return Promise.resolve({ data: newRev, status: 201 })
  }

  // AI Sentiment
  if (url.includes('/ai/sentiment')) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
    const sentimentRes = classifySentiment(body.text, body.rating)
    return Promise.resolve({
      data: sentimentRes,
      status: 200,
    })
  }

  // AI Aspect Analysis
  if (url.includes('/ai/aspect-analysis')) {
    return Promise.resolve({
      data: {
        aspects: [
          { aspect: 'Performance', sentiment: 'positive', confidence: 0.94, text_snippet: 'snappy and fast' },
          { aspect: 'Battery', sentiment: 'positive', confidence: 0.91, text_snippet: 'lasts all day' },
        ],
      },
      status: 200,
    })
  }

  // AI Fake Detection
  if (url.includes('/ai/fake-detection')) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
    const text = body.text || ''
    const isSusp = text.toUpperCase() === text && text.length > 20
    return Promise.resolve({
      data: {
        is_fake: isSusp,
        confidence: isSusp ? 0.89 : 0.07,
        label: isSusp ? 'suspicious' : 'genuine',
        reasons: isSusp ? ['Unnatural capitalization pattern detected.'] : ['Natural sentence structure.'],
      },
      status: 200,
    })
  }

  // AI Translation
  if (url.includes('/ai/translate')) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
    const text = (body.text || '').trim()
    return fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`)
      .then((res) => res.json())
      .then((data) => {
        const trans = (data[0] || []).map((x: any) => x[0]).join('')
        const lang = data[2] || 'es'
        return {
          data: {
            original_text: text,
            translated_text: trans || text,
            detected_language: lang,
            confidence: 0.95,
          },
          status: 200,
        }
      })
      .catch(() => ({
        data: {
          original_text: text,
          translated_text: text,
          detected_language: 'en',
          confidence: 0.8,
        },
        status: 200,
      }))
  }

  // AI Assistant Chat
  if (url.includes('/ai/assistant/chat')) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
    const msg = (body.message || '').toLowerCase()
    let reply = 'Based on customer reviews, the product shows strong performance in display quality and general reliability, with battery feedback being the primary topic of discussion.'
    if (msg.includes('battery')) {
      reply = 'According to 12 analyzed reviews for Apex Smartphone Pro, 60% of users praise the 2-day battery life, while 40% report fast battery drain during high-intensity usage.'
    } else if (msg.includes('camera') || msg.includes('photo')) {
      reply = 'Customer sentiment for the camera is 95% positive. Reviewers highlight crisp low-light photos and excellent optical portrait stabilization.'
    }
    return Promise.resolve({
      data: { response: reply },
      status: 200,
    })
  }

  // Comparison
  if (url.includes('/comparison/compare')) {
    return Promise.resolve({ data: mockCompareResult, status: 200 })
  }

  // Analysis History & Pipeline
  if (url.includes('/analysis/analysis-history')) {
    const allAnalyses = clientReviews
      .map((r) => r.analysis)
      .filter((a): a is AnalysisResult => Boolean(a))
    return Promise.resolve({ data: allAnalyses, status: 200 })
  }

  if (url.includes('/analysis/analyze')) {
    const allAnalyses = clientReviews
      .map((r) => r.analysis)
      .filter((a): a is AnalysisResult => Boolean(a))
    return Promise.resolve({ data: allAnalyses[0] || {}, status: 200 })
  }

  // Seller Alerts
  if (url.includes('/alerts')) {
    return Promise.resolve({ data: clientAlerts, status: 200 })
  }

  // Reports Download
  if (url.includes('/reports') && url.includes('/download')) {
    const minimalPdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000108 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF`
    const blob = new Blob([minimalPdf], { type: 'application/pdf' })
    return Promise.resolve({ data: blob, status: 200 })
  }

  // Reports Generate
  if (url.includes('/reports/generate')) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
    const prodId = body.product_id || 1
    const newReport = {
      id: Date.now(),
      report_name: `Executive_Dossier_${new Date().toISOString().slice(0, 10)}.pdf`,
      product_id: prodId,
      file_path: 'uploads/reports/sample.pdf',
      created_at: new Date().toISOString(),
    }
    return Promise.resolve({ data: newReport, status: 200 })
  }

  // Reports List
  if (url.includes('/reports')) {
    return Promise.resolve({
      data: [
        {
          id: 1,
          report_name: 'Apex_Smartphone_Pro_Executive_Report.pdf',
          product_id: 1,
          file_path: 'uploads/reports/sample.pdf',
          created_at: new Date().toISOString(),
        },
      ],
      status: 200,
    })
  }

  return Promise.resolve({ data: {}, status: 200 })
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string; user: User }>('/auth/login', { email, password }),
  register: (email: string, username: string, password: string) =>
    api.post<{ access_token: string; token_type: string; user: User }>('/auth/register', { email, username, password }),
  logout: () => api.post('/auth/logout'),
}

// Products
export const productsApi = {
  getProducts: () => api.get<Product[]>('/products'),
  getProduct: (id: number) => api.get<Product>(`/products/${id}`),
  createProduct: (data: { name: string; description?: string; category?: string }) =>
    api.post<Product>('/products', data),
}

// Reviews
export const reviewsApi = {
  getReviews: (productId?: number) =>
    api.get<Review[]>('/reviews', { params: productId ? { product_id: productId } : {} }),
  createReview: (data: Partial<Review>) => api.post<Review>('/reviews', data),
  bulkUpload: (productId: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('product_id', String(productId))
    return api.post<BulkUploadResult>('/reviews/bulk-upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadDocument: (productId: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('product_id', String(productId))
    return api.post<BulkUploadResult>('/reviews/bulk-upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Analysis
export const analysisApi = {
  analyzeProduct: (productId: number, reviewIds?: number[]) =>
    api.post('/analysis/analyze', { product_id: productId, review_ids: reviewIds }),
  getAnalysisHistory: () => api.get<AnalysisResult[]>('/analysis/analysis-history'),
  getAnalysisResult: (id: number) => api.get<AnalysisResult>(`/analysis/analyze/${id}`),
}

// AI
export const aiApi = {
  translate: (text: string) => api.post<{ translated_text: string; detected_language: string }>('/ai/translate', { text }),
  analyzeSentiment: (text: string) =>
    api.post<{ sentiment: string; score: number; confidence: number }>('/ai/sentiment', { text }),
  detectFake: (text: string, productId?: number) =>
    api.post<{ is_fake: boolean; confidence: number; label: string; reasons: string[] }>('/ai/fake-detection', { text, product_id: productId }),
  analyzeAspects: (text: string) =>
    api.post<{ aspects: Array<{ aspect: string; sentiment: string; confidence: number; text_snippet?: string }> }>('/ai/aspect-analysis', { text }),
  generateSummary: (productId: number) =>
    api.post<{ summary: string }>('/ai/summary', { product_id: productId }),
  chat: (message: string, productId?: number) =>
    api.post<{ response: string }>('/ai/assistant/chat', { message, product_id: productId }),
}

// Comparison
export const comparisonApi = {
  compareProducts: (productIds: number[]) =>
    api.post<CompareResult>('/comparison/compare', { product_ids: productIds }),
}

// Alerts
export const alertsApi = {
  getAlerts: (filters?: { priority?: string; status?: string; product_id?: number }) =>
    api.get<SellerAlert[]>('/alerts', { params: filters }),
  updateAlertStatus: (id: number, status: string) =>
    api.patch<SellerAlert>(`/alerts/${id}`, { status }),
}

// Reports
export const reportsApi = {
  generateReport: (productId: number) =>
    api.post<Report>('/reports/generate', { product_id: productId }),
  getReports: () => api.get<Report[]>('/reports'),
  downloadReport: (id: number) =>
    api.get(`/reports/${id}/download`, { responseType: 'blob' }),
}

// Dashboard
export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getCharts: () => api.get<DashboardCharts>('/dashboard/charts'),
}

export default api
