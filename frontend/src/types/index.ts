export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  category?: string;
  created_at: string;
  review_count?: number;
}

export interface Review {
  id: number;
  product_id: number;
  reviewer_id?: string;
  original_text: string;
  translated_text?: string;
  original_language?: string;
  rating?: number;
  review_date?: string;
  source: string;
  created_at: string;
}

export interface AnalysisResult {
  id: number;
  review_id: number;
  product_id: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  sentiment_confidence: number;
  is_suspicious: boolean;
  fake_confidence?: number;
  fake_reasons?: string[];
  fake_label?: string;
  aspect_results?: AspectResult[];
  language_confidence?: number;
  created_at: string;
}

export interface AspectResult {
  aspect: string;
  sentiment: string;
  confidence: number;
  text_snippet?: string;
}

export interface SellerAlert {
  id: number;
  product_id: number;
  alert_type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'New' | 'In Progress' | 'Resolved';
  title: string;
  message: string;
  issue?: string;
  negative_percentage?: number;
  recommendations?: string[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface DashboardStats {
  total_reviews: number;
  positive_reviews: number;
  negative_reviews: number;
  neutral_reviews: number;
  suspicious_reviews: number;
  avg_sentiment_score: number;
  total_products: number;
  active_alerts: number;
}

export interface DashboardCharts {
  sentiment_distribution: any;
  rating_distribution: any;
  review_trends: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  top_positive_aspects: Array<{ aspect: string; count: number }>;
  top_negative_aspects: Array<{ aspect: string; count: number }>;
  fake_vs_genuine: any;
}

export interface Report {
  id: number;
  report_name: string;
  product_id?: number;
  file_path: string;
  created_at: string;
}

export interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface CompareResult {
  products: any[];
  comparison?: Array<{ metric: string; [key: string]: any }>;
  ai_recommendation?: string;
  recommendation?: string;
  winner?: string;
  summary?: string;
}
