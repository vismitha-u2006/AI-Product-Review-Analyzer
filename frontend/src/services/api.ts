import axios from 'axios'
import type {
  User, Product, Review, AnalysisResult, SellerAlert,
  DashboardStats, DashboardCharts, Report, BulkUploadResult, CompareResult
} from '../types'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

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
