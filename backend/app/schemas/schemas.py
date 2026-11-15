from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime


# ---- Auth ----

class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    username: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


# ---- Products ----

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime
    review_count: Optional[int] = 0


# ---- Reviews ----

class ReviewCreate(BaseModel):
    product_id: int
    original_text: str
    rating: Optional[float] = None
    review_date: Optional[datetime] = None
    reviewer_id: Optional[str] = None
    source: Optional[str] = "manual"

class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    reviewer_id: Optional[str] = None
    original_text: str
    translated_text: Optional[str] = None
    original_language: Optional[str] = None
    rating: Optional[float] = None
    review_date: Optional[datetime] = None
    source: Optional[str] = None
    created_at: datetime

class BulkUploadResponse(BaseModel):
    total: int
    success: int
    failed: int
    errors: List[str] = []


# ---- Analysis ----

class AnalysisRequest(BaseModel):
    product_id: int
    review_ids: Optional[List[int]] = None

class AspectResultSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    aspect: str
    sentiment: str
    confidence: float
    text_snippet: Optional[str] = None

class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    review_id: int
    product_id: int
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_confidence: Optional[float] = None
    is_suspicious: Optional[bool] = None
    fake_confidence: Optional[float] = None
    fake_reasons: Optional[List[str]] = None
    fake_label: Optional[str] = None
    aspect_results: Optional[List[Dict[str, Any]]] = None
    language_confidence: Optional[float] = None
    created_at: datetime


# ---- Translation ----

class TranslateRequest(BaseModel):
    text: str
    target_language: Optional[str] = "en"

class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    detected_language: str
    confidence: Optional[float] = None


# ---- Sentiment ----

class SentimentResponse(BaseModel):
    sentiment: str
    score: float
    confidence: float
    label: str


# ---- Fake Detection ----

class FakeDetectionResponse(BaseModel):
    label: str
    confidence: float
    reasons: List[str]
    is_suspicious: bool


# ---- Aspect Analysis ----

class AspectAnalysisResponse(BaseModel):
    aspects: List[AspectResultSchema]


# ---- Summary ----

class SummaryRequest(BaseModel):
    product_id: int

class SummaryResponse(BaseModel):
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    overall_satisfaction: str


# ---- Comparison ----

class CompareRequest(BaseModel):
    product_ids: List[int]

class ProductCompareStats(BaseModel):
    product_id: int
    product_name: str
    total_reviews: int
    positive_pct: float
    negative_pct: float
    neutral_pct: float
    avg_rating: Optional[float] = None
    fake_pct: float
    top_aspects: List[Dict[str, Any]]

class CompareResponse(BaseModel):
    products: List[ProductCompareStats]
    recommendation: Optional[str] = None
    winner: Optional[str] = None


# ---- Alerts ----

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    priority: str
    status: str
    title: str
    message: str
    issue: Optional[str] = None
    negative_percentage: Optional[float] = None
    recommendations: Optional[List[str]] = None
    created_at: datetime

class AlertUpdate(BaseModel):
    status: str


# ---- Chat ----

class ChatRequest(BaseModel):
    message: str
    product_id: Optional[int] = None

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[str]] = None


# ---- Dashboard ----

class DashboardStats(BaseModel):
    total_reviews: int
    positive_reviews: int
    negative_reviews: int
    neutral_reviews: int
    suspicious_reviews: int
    avg_sentiment_score: float
    total_products: int
    active_alerts: int

class DashboardCharts(BaseModel):
    sentiment_distribution: Dict[str, int]
    rating_distribution: Dict[str, int]
    review_trends: List[Dict[str, Any]]
    top_positive_aspects: List[Dict[str, Any]]
    top_negative_aspects: List[Dict[str, Any]]
    fake_vs_genuine: Dict[str, int]


# ---- Reports ----

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_name: str
    product_id: Optional[int] = None
    file_path: str
    created_at: datetime
