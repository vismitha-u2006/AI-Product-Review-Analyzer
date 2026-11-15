from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from ..database import get_db
from ..models.models import User, Product, Review, AnalysisResult
from ..schemas.schemas import (
    TranslateRequest, TranslateResponse,
    SentimentResponse,
    FakeDetectionResponse,
    AspectAnalysisResponse, AspectResultSchema,
    SummaryRequest, SummaryResponse,
    ChatRequest, ChatResponse
)
from ..utils.auth import get_current_user
from ..services.translation_service import translate_to_english
from ..services.sentiment_service import analyze_sentiment, get_sentiment_breakdown
from ..services.fake_review_service import analyze_fake_review
from ..services.absa_service import analyze_aspects, aggregate_aspects
from ..services.summary_service import generate_summary
from ..services.assistant_service import chat_with_assistant

router = APIRouter(tags=["ai"])


@router.post("/translate", response_model=TranslateResponse)
@router.post("/ai/translate", response_model=TranslateResponse)
def translate_text(req: TranslateRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    result = translate_to_english(req.text, req.target_language or "en")
    return TranslateResponse(
        original_text=result["original_text"],
        translated_text=result["translated_text"],
        detected_language=result["detected_language"],
        confidence=result.get("language_confidence", 0.95),
    )


@router.post("/sentiment", response_model=SentimentResponse)
@router.post("/ai/sentiment", response_model=SentimentResponse)
def get_sentiment(payload: Dict[str, str] = Body(...)):
    text = payload.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    result = analyze_sentiment(text)
    return SentimentResponse(
        sentiment=result["sentiment"],
        score=result["score"],
        confidence=result["confidence"],
        label=result["label"],
    )


@router.post("/fake-detection", response_model=FakeDetectionResponse)
@router.post("/ai/fake-detection", response_model=FakeDetectionResponse)
def detect_fake_review(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    text = payload.get("text", "").strip()
    product_id = payload.get("product_id")
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    other_reviews = []
    if product_id:
        revs = db.query(Review.original_text).filter(Review.product_id == product_id).limit(100).all()
        other_reviews = [r[0] for r in revs if r[0] != text]

    result = analyze_fake_review(text, other_reviews)
    return FakeDetectionResponse(
        label=result["label"],
        confidence=result["confidence"],
        reasons=result["reasons"],
        is_suspicious=result["is_suspicious"],
    )


@router.post("/aspect-analysis", response_model=AspectAnalysisResponse)
@router.post("/ai/aspect-analysis", response_model=AspectAnalysisResponse)
def get_aspect_analysis(payload: Dict[str, str] = Body(...)):
    text = payload.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    aspects = analyze_aspects(text)
    return AspectAnalysisResponse(
        aspects=[
            AspectResultSchema(
                aspect=a["aspect"],
                sentiment=a["sentiment"],
                confidence=a["confidence"],
                text_snippet=a.get("text_snippet"),
            )
            for a in aspects
        ]
    )


@router.post("/summary", response_model=SummaryResponse)
@router.post("/ai/summary", response_model=SummaryResponse)
def get_product_summary(
    req: SummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.id == req.product_id,
        Product.owner_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    reviews = db.query(Review).filter(Review.product_id == req.product_id).all()
    if not reviews:
        raise HTTPException(status_code=400, detail="No reviews found for this product to summarize")

    reviews_data = [
        {
            "id": r.id,
            "text": r.translated_text or r.original_text,
            "rating": r.rating,
        }
        for r in reviews
    ]

    analyses = db.query(AnalysisResult).filter(AnalysisResult.product_id == req.product_id).all()
    sent_breakdown = get_sentiment_breakdown(analyses)
    asp_breakdown = aggregate_aspects(analyses)
    analysis_summary = {
        "sentiment_breakdown": sent_breakdown,
        "aspect_breakdown": asp_breakdown,
        "total_analyzed": len(analyses),
        "total_reviews": len(reviews),
        "positive_pct": sent_breakdown.get("positive_pct", 0.0),
        "negative_pct": sent_breakdown.get("negative_pct", 0.0),
        "neutral_pct": sent_breakdown.get("neutral_pct", 0.0),
        "top_aspects": asp_breakdown.get("aspects", []),
    }

    summary_result = generate_summary(product.name, reviews_data, analysis_summary)
    return SummaryResponse(**summary_result)


@router.post("/assistant/chat", response_model=ChatResponse)
@router.post("/ai/assistant/chat", response_model=ChatResponse)
@router.post("/ai/chat", response_model=ChatResponse)
def chat_assistant(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = chat_with_assistant(
        message=req.message,
        product_id=req.product_id,
        db=db,
        user_id=current_user.id,
    )
    return ChatResponse(
        response=result.get("response", ""),
        sources=result.get("sources", []),
    )
