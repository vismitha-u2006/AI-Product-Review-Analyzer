from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.models import User, Review, Product, AnalysisResult, AspectResult
from ..schemas.schemas import AnalysisRequest, AnalysisResponse
from ..utils.auth import get_current_user
from ..services.translation_service import translate_to_english
from ..services.sentiment_service import analyze_sentiment
from ..services.fake_review_service import analyze_fake_review
from ..services.absa_service import analyze_aspects
from ..services.alert_service import check_and_generate_alerts

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=List[AnalysisResponse])
@router.post("/analysis/analyze", response_model=List[AnalysisResponse])
@router.post("/analysis/analyze-product", response_model=List[AnalysisResponse])
def run_analysis(
    req: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify product ownership
    product = db.query(Product).filter(
        Product.id == req.product_id,
        Product.owner_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get reviews to analyze
    if req.review_ids:
        reviews = db.query(Review).filter(
            Review.product_id == req.product_id,
            Review.id.in_(req.review_ids),
        ).all()
    else:
        # All unanalyzed reviews
        analyzed_ids = {
            r[0] for r in db.query(AnalysisResult.review_id).filter(
                AnalysisResult.product_id == req.product_id
            ).all()
        }
        all_product_reviews = db.query(Review).filter(
            Review.product_id == req.product_id,
        ).all()
        unanalyzed = [r for r in all_product_reviews if r.id not in analyzed_ids]
        reviews = unanalyzed if unanalyzed else all_product_reviews

    if not reviews:
        return []

    all_texts = [r.original_text for r in reviews]
    results = []

    for review in reviews:
        # 1. Translation
        trans_result = translate_to_english(review.original_text)
        analysis_text = trans_result["translated_text"]
        lang = trans_result["detected_language"]
        lang_confidence = trans_result.get("language_confidence", 0.5)

        # Update review with translation
        review.translated_text = analysis_text
        review.original_language = lang
        db.add(review)

        # 2. Sentiment
        sentiment_result = analyze_sentiment(analysis_text, rating=review.rating)

        # 3. Fake detection
        other_texts = [t for t in all_texts if t != review.original_text]
        fake_result = analyze_fake_review(analysis_text, other_texts)

        # 4. ABSA
        aspect_results = analyze_aspects(analysis_text)

        # Upsert AnalysisResult
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.review_id == review.id
        ).first()

        if existing:
            ar = existing
        else:
            ar = AnalysisResult(review_id=review.id, product_id=req.product_id)
            db.add(ar)

        ar.sentiment = sentiment_result["sentiment"]
        ar.sentiment_score = sentiment_result["score"]
        ar.sentiment_confidence = sentiment_result["confidence"]
        ar.is_suspicious = fake_result["is_suspicious"]
        ar.fake_confidence = fake_result["confidence"]
        ar.fake_reasons = fake_result["reasons"]
        ar.fake_label = fake_result["label"]
        ar.aspect_results = aspect_results
        ar.language_confidence = lang_confidence
        db.flush()

        # Save individual AspectResult records
        for asp in aspect_results:
            aspect_obj = AspectResult(
                analysis_id=ar.id,
                aspect=asp["aspect"],
                sentiment=asp["sentiment"],
                confidence=asp.get("confidence", 0.5),
                text_snippet=asp.get("text_snippet"),
            )
            db.add(aspect_obj)

        results.append(ar)

    db.commit()
    for ar in results:
        db.refresh(ar)

    # Generate alerts
    try:
        check_and_generate_alerts(req.product_id, db)
    except Exception:
        pass  # Don't fail analysis if alert generation errors

    return results


@router.get("/analyze/{result_id}", response_model=AnalysisResponse)
@router.get("/analysis/analyze/{result_id}", response_model=AnalysisResponse)
def get_analysis(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ar = db.query(AnalysisResult).join(Product).filter(
        AnalysisResult.id == result_id,
        Product.owner_id == current_user.id,
    ).first()
    if not ar:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return ar


@router.get("/analysis-history", response_model=List[AnalysisResponse])
@router.get("/analysis/analysis-history", response_model=List[AnalysisResponse])
@router.get("/analysis/history", response_model=List[AnalysisResponse])
def analysis_history(
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AnalysisResult).join(Product).filter(
        Product.owner_id == current_user.id
    )
    if product_id:
        query = query.filter(AnalysisResult.product_id == product_id)
    return query.offset(skip).limit(limit).all()
