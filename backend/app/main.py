from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import engine
from .models.models import Base
from .config import settings
from .routers import (
    auth,
    products,
    reviews,
    analysis,
    ai,
    comparison,
    alerts,
    reports,
    dashboard,
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Ensure upload directories exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/reports", exist_ok=True)
os.makedirs("uploads/audio", exist_ok=True)

app = FastAPI(
    title="AI Product Review Analyzer API",
    description="Intelligent AI-powered product review analysis platform with sentiment detection, fake review detection, aspect-based sentiment analysis, multilingual translation, and Gemini assistant.",
    version="1.0.0",
)

# CORS Middleware
origins = settings.cors_origins_list
if "*" not in origins:
    origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(comparison.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "AI Product Review Analyzer",
        "version": "1.0.0",
        "database": "connected",
    }
