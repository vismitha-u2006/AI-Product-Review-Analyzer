# AI Product Review Analyzer

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![PyTorch](https://img.shields.io/badge/AI-PyTorch%20%7C%20RoBERTa-EE4C2C?style=flat-square&logo=pytorch)](https://pytorch.org)
[![HuggingFace](https://img.shields.io/badge/NLP-Hugging%20Face%20Transformers-FFD21E?style=flat-square&logo=huggingface)](https://huggingface.co)
[![Google Gemini](https://img.shields.io/badge/AI%20Assistant-Google%20Gemini%20API-4285F4?style=flat-square&logo=google)](https://ai.google.dev)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind%20CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)

A full-stack, enterprise-grade AI-powered product review intelligence platform. Designed for both consumers assessing product quality and e-commerce sellers diagnosing customer satisfaction bottlenecks, detecting suspicious reviews, comparing competitors, ingesting multi-format review documents (Word/Notepad/CSV), and generating executive PDF dossiers.

---

## 🌟 Key Application Features (All 12 Modules)

1. **Interactive Analytics Dashboard**: Real-time aggregation of total reviews, positive/negative/neutral proportions, fraud rate, average sentiment score, product count, active seller alerts, review trends, and rating distributions.
2. **Review Translation Engine**: Automatic foreign language detection and translation into English preserving original review text, supporting Spanish, French, German, Hindi, and more.
3. **Product Comparison Matrix**: Side-by-side comparison of 2 or more products with multi-metric bars, aspect satisfaction breakdowns, and evidence-grounded AI winner recommendations.
4. **Intelligent Seller Alert System**: Automated alert generation when negative review rates exceed 30% or when specific product features (e.g. Battery, Display, Sound) receive consistently negative sentiment. Features HIGH, MEDIUM, and LOW priority escalation with status tracking (New, In Progress, Resolved).
5. **Calibrated Confidence Score Engine**: Probabilistic model certainty metrics across sentiment classification, fake review detection, aspect analysis, and language detection.
6. **Deep Learning Sentiment Analysis**: 3-class sentiment classification (Positive, Neutral, Negative) powered by Cardiff NLP's pretrained `cardiffnlp/twitter-roberta-base-sentiment-latest` RoBERTa transformer pipeline with calibrated certainty scores.
7. **Explainable Fake Review Detection**: Multi-signal anti-fraud classifier analyzing repeated review texts, excessive promotional hype keywords, unnatural capitalisation patterns, brief generic feedback, and cross-review duplication.
8. **Dynamic Interactive Charts**: Integrated Recharts components including Sentiment Pie Charts, Grouped Product Comparison Bars, Temporal Review Trend Lines, Star Rating Histograms, and Horizontal Aspect Frequency Charts.
9. **Multi-Format Document Review Ingestion**: Ingest review documents from Microsoft Word (.docx, .doc), Notepad (.txt), and CSV formats, extracting raw reviews and routing directly into the sentiment pipeline.
10. **Evidence-Based AI Summaries**: Synthesizes customer opinions, product strengths, weaknesses, and suggested seller improvements using the Google Gemini API (`gemini-3.8-flash`) with reliable local fallback.
11. **Executive PDF Report Export**: Generates downloadable, publication-grade multi-page PDF reports using ReportLab with tables, aspect breakdowns, seller alerts, and executive summaries.
12. **Context-Aware AI Chat Assistant**: In-app conversational chatbot powered by Google Gemini that answers granular questions about customer opinions, complaints, and product improvements grounded directly in stored review data.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS | Dark navy theme (`#0B1120`, `#151F32`), Lucide React icons, Recharts |
| **Backend** | Python 3.12, FastAPI, Uvicorn | High-performance async REST APIs, Pydantic v2 schemas |
| **Database** | SQLite (Dev) / PostgreSQL (Prod), SQLAlchemy ORM | Relational models with declarative relationships and indexing |
| **Deep Learning** | PyTorch, Hugging Face Transformers | Pretrained RoBERTa sentiment, transformer-based ABSA |
| **AI LLM** | Google Gemini API (`google-genai` SDK) | `gemini-3.8-flash` model for summaries and conversational assistant |
| **PDF Engine** | ReportLab | Flowables, styled tables, executive layout formatting |
| **Authentication** | PyJWT + Bcrypt | Cryptographically salted password hashing, JWT bearer tokens |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ and npm

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env
copy .env.example .env

# Seed the database with sample products, reviews, and pre-computed analyses
python data/seed.py
```

### 3. Run the Backend API

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be live at `http://127.0.0.1:8000`  
Interactive Swagger documentation: `http://127.0.0.1:8000/docs`

### 4. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be running at `http://localhost:5173` (with `/api` proxied automatically to `http://127.0.0.1:8000`).

---

## 🔑 Demo Login Credentials

The database seed script (`backend/data/seed.py`) automatically registers a default demo user and populates 3 product catalogs with realistic reviews, ABSA extractions, and alerts:

- **Email**: `demo@example.com`
- **Password**: `DemoPassword123!`

You can also register a new account on the `/register` page at any time.

---

## 🧪 Running Automated Tests

The backend includes a comprehensive 14-test verification suite testing all core functionality:

```bash
cd backend
python -m pytest tests/test_api.py -v
```

**Test Coverage Highlights:**
- `test_health_endpoint`: API and database connectivity
- `test_user_registration_and_login`: JWT generation, password hashing, and authentication
- `test_create_and_get_product`: Product CRUD and ownership
- `test_review_submission`: Manual review submission
- `test_ai_translation_endpoint`: Multilingual translation and language detection
- `test_ai_sentiment_endpoint`: RoBERTa sentiment classification and calibrated confidence
- `test_ai_fake_detection_endpoint`: Heuristic anti-fraud evaluation
- `test_ai_aspect_analysis_endpoint`: Granular aspect-level extraction
- `test_bulk_csv_upload`: CSV dataset validation and batch parsing
- `test_analysis_pipeline_execution`: End-to-end multi-model pipeline
- `test_seller_alerts_endpoint`: Automated alert rules and thresholds
- `test_product_comparison_endpoint`: Side-by-side product metrics comparison
- `test_dashboard_stats_and_charts`: Statistical aggregation and trend generation
- `test_pdf_report_generation`: ReportLab PDF compiling and file streaming

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT bearer token |
| `GET` | `/api/products` | List all products owned by current user |
| `POST` | `/api/products` | Create a new product catalog entry |
| `GET` | `/api/reviews` | List customer reviews (supports `?product_id=`) |
| `POST` | `/api/reviews` | Add a single customer review |
| `POST` | `/api/reviews/bulk-upload` | Upload CSV or Excel review dataset with validation |
| `POST` | `/api/analyze` | Execute complete AI analysis pipeline on reviews |
| `GET` | `/api/analysis-history` | Retrieve historical analysis audit logs |
| `POST` | `/api/translate` | Translate foreign review into English |
| `POST` | `/api/sentiment` | Run RoBERTa sentiment classification |
| `POST` | `/api/fake-detection` | Run explainable fake review detection |
| `POST` | `/api/aspect-analysis` | Extract aspects and classify aspect sentiments |
| `POST` | `/api/reviews/upload-document` | Upload Word (.docx, .doc) or Notepad (.txt) review file |
| `POST` | `/api/summary` | Generate natural-language product summary via Gemini |
| `POST` | `/api/assistant/chat` | Chat with AI Assistant grounded in review data |
| `POST` | `/api/compare` | Compare 2+ products side by side with recommendation |
| `GET` | `/api/alerts` | Get seller alerts (supports `?priority=` and `?status=`) |
| `PATCH` | `/api/alerts/{id}` | Update alert status (`New`, `In Progress`, `Resolved`) |
| `POST` | `/api/reports/generate` | Compile and save executive PDF dossier |
| `GET` | `/api/reports` | List generated PDF reports |
| `GET` | `/api/reports/{id}/download` | Stream and download PDF report |
| `GET` | `/api/dashboard/stats` | Aggregated metrics for dashboard cards |
| `GET` | `/api/dashboard/charts` | Temporal and categorical data for all dashboard charts |

---

## 📁 Project Directory Structure

```
AI product review analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application factory & router mounting
│   │   ├── config.py               # Pydantic BaseSettings configuration
│   │   ├── database.py             # SQLAlchemy engine & session factory
│   │   ├── models/
│   │   │   └── models.py           # User, Product, Review, Analysis, Alert, Report models
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   ├── utils/
│   │   │   └── auth.py             # Bcrypt password hashing & JWT auth handlers
│   │   ├── ml/
│   │   │   ├── model_loader.py     # Lazy singleton model loader (RoBERTa)
│   │   │   └── inference.py        # Sentiment, ABSA, fake detection inference logic
│   │   ├── services/
│   │   │   ├── translation_service.py # Deep translation and language detection
│   │   │   ├── sentiment_service.py   # RoBERTa sentiment processing
│   │   │   ├── fake_review_service.py # Anti-fraud explainable heuristics
│   │   │   ├── absa_service.py        # Aspect extraction & sentiment aggregation
│   │   │   ├── summary_service.py     # Gemini API evidence-grounded summary
│   │   │   ├── comparison_service.py  # Product comparison & AI recommendation
│   │   │   ├── alert_service.py       # Threshold-based seller alert generation
│   │   │   ├── assistant_service.py   # Conversational Gemini assistant
│   │   │   └── report_service.py      # ReportLab publication-grade PDF generation
│   │   └── routers/
│   │       ├── auth.py, products.py, reviews.py, analysis.py, ai.py,
│   │       ├── comparison.py, alerts.py, reports.py, dashboard.py
│   │   └── tests/
│   │       └── test_api.py         # Complete pytest automated test suite
│   ├── data/
│   │   ├── sample_reviews.json     # Seed dataset covering various products & aspects
│   │   └── seed.py                 # DB seeder populating demo products & analyses
│   ├── uploads/                    # Local storage for audio and generated PDF reports
│   ├── requirements.txt            # Tested Python dependencies
│   ├── .env.example                # Template configuration
│   └── .env                        # Active environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/             # Sidebar, Header, and Master Layout
│   │   │   ├── ui/                 # StatCard, Badge, ConfidenceBar, Toast, Modal, Spinner
│   │   │   └── charts/             # SentimentPieChart, ProductCompareChart, TrendLineChart, AspectBarChart, RatingDistributionChart
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx, RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx   # Module 1 & 8: Executive metrics & charts
│   │   │   ├── AnalysisPage.tsx    # Module 2, 5, 6, 7: Manual, multi & CSV input
│   │   │   ├── SentimentPage.tsx   # Module 6: RoBERTa sentiment filter & view
│   │   │   ├── FakeDetectionPage.tsx # Module 7: Explainable suspicious review detection
│   │   │   ├── AspectPage.tsx      # Module 4: Aspect-Based Sentiment Analysis
│   │   │   ├── ComparisonPage.tsx  # Module 3: Side-by-side product comparison
│   │   │   ├── AlertsPage.tsx      # Module 4: Seller alert monitoring & resolution
│   │   │   ├── AssistantPage.tsx   # Module 12: Gemini conversational chatbot
│   │   │   ├── ReportsPage.tsx     # Module 11: PDF dossier compilation & download
│   │   │   ├── HistoryPage.tsx     # Historical analysis audit log
│   │   │   └── SettingsPage.tsx    # API configuration & alert threshold sliders
│   │   ├── services/
│   │   │   └── api.ts              # Axios client with JWT interceptor & API endpoints
│   │   ├── hooks/                  # useAuth, useToast custom hooks
│   │   ├── types/                  # TypeScript interface definitions
│   │   ├── utils/                  # Formatting & colour helpers
│   │   ├── App.tsx                 # Protected routing table
│   │   ├── main.tsx                # React DOM entry point
│   │   └── index.css               # Tailwind CSS theme directives
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

---

## 🎓 Academic / Final-Year Project Demonstration Checklist

1. **User Authentication**: Log in with demo account (`demo@example.com` / `DemoPassword123!`).
2. **Dashboard Overview**: Show real-time statistics, sentiment distribution pie chart, rating distribution, and aspect rankings.
3. **Review Analysis**:
   - Enter a review in Spanish/French to demonstrate automatic translation.
   - Enter a promotional review (`"BEST PRODUCT EVER 5 STARS BUY IT NOW!!!"`) to see fake review detection flag it as `SUSPICIOUS` with explainable reasons.
   - Enter an aspect-rich review (`"The camera quality is excellent, but the battery drains quickly."`) to verify dual positive/negative aspect extraction.
4. **Product Comparison**: Select 2 products to view comparative sentiment bars and the Gemini-generated comparative recommendation.
5. **Seller Alert System**: Inspect triggered HIGH priority alerts (e.g. Battery drainage spike > 30%) and demonstrate updating alert status from `New` to `Resolved`.
6. **Document Review Upload**: Upload Notepad (.txt) or Word (.docx, .doc) review files and verify automatic text extraction and direct redirection to sentiment analysis.
7. **AI Assistant**: Open the chat assistant and click suggested prompts such as *"What are the most common customer complaints?"* to demonstrate grounded answers.
8. **PDF Report Export**: Click *Generate PDF Dossier* and download the report to inspect ReportLab tables, metrics, and layout.
9. **Automated Test Suite**: Run `pytest tests/test_api.py -v` in terminal to show 16/16 automated tests passing.
