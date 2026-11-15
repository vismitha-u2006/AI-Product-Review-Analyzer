from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from collections import defaultdict
from datetime import datetime, timezone

from ..database import get_db
from ..models.models import User, Product, Review, AnalysisResult, SellerAlert, AspectResult
from ..schemas.schemas import DashboardStats, DashboardCharts
from ..utils.auth import get_current_user

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_product_ids = [
        p.id for p in db.query(Product.id).filter(Product.owner_id == current_user.id).all()
    ]
    total_products = len(user_product_ids)

    if not user_product_ids:
        return DashboardStats(
            total_reviews=0,
            positive_reviews=0,
            negative_reviews=0,
            neutral_reviews=0,
            suspicious_reviews=0,
            avg_sentiment_score=0.0,
            total_products=0,
            active_alerts=0,
        )

    total_reviews = db.query(Review).filter(Review.product_id.in_(user_product_ids)).count()

    analyses = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.product_id.in_(user_product_ids))
        .all()
    )

    pos_count = sum(1 for a in analyses if a.sentiment == "positive")
    neg_count = sum(1 for a in analyses if a.sentiment == "negative")
    neu_count = sum(1 for a in analyses if a.sentiment == "neutral")
    sus_count = sum(1 for a in analyses if a.is_suspicious)

    avg_score = 0.0
    if analyses:
        avg_score = round(sum(a.sentiment_score for a in analyses) / len(analyses), 3)

    active_alerts = (
        db.query(SellerAlert)
        .filter(
            SellerAlert.product_id.in_(user_product_ids),
            SellerAlert.status != "Resolved",
        )
        .count()
    )

    return DashboardStats(
        total_reviews=total_reviews,
        positive_reviews=pos_count,
        negative_reviews=neg_count,
        neutral_reviews=neu_count,
        suspicious_reviews=sus_count,
        avg_sentiment_score=avg_score,
        total_products=total_products,
        active_alerts=active_alerts,
    )


@router.get("/dashboard/charts", response_model=DashboardCharts)
def get_dashboard_charts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_product_ids = [
        p.id for p in db.query(Product.id).filter(Product.owner_id == current_user.id).all()
    ]

    sentiment_dist = {"positive": 0, "negative": 0, "neutral": 0}
    rating_dist = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    fake_dist = {"genuine": 0, "suspicious": 0, "insufficient_evidence": 0}
    trend_map = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})
    pos_aspects = defaultdict(int)
    neg_aspects = defaultdict(int)

    if user_product_ids:
        # Reviews for ratings
        reviews = db.query(Review).filter(Review.product_id.in_(user_product_ids)).all()
        for r in reviews:
            if r.rating:
                r_int = min(5, max(1, int(round(r.rating))))
                rating_dist[str(r_int)] += 1

        # Analyses
        analyses = (
            db.query(AnalysisResult)
            .filter(AnalysisResult.product_id.in_(user_product_ids))
            .all()
        )

        for a in analyses:
            if a.sentiment in sentiment_dist:
                sentiment_dist[a.sentiment] += 1

            if a.fake_label in fake_dist:
                fake_dist[a.fake_label] += 1
            elif a.is_suspicious:
                fake_dist["suspicious"] += 1
            else:
                fake_dist["genuine"] += 1

            # Trend by date
            date_str = a.created_at.strftime("%Y-%m-%d") if a.created_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")
            if a.sentiment in trend_map[date_str]:
                trend_map[date_str][a.sentiment] += 1

            # Aspects from JSON
            if a.aspect_results and isinstance(a.aspect_results, list):
                for asp in a.aspect_results:
                    asp_name = asp.get("aspect", "").capitalize()
                    asp_sent = asp.get("sentiment", "").lower()
                    if asp_name:
                        if asp_sent == "positive":
                            pos_aspects[asp_name] += 1
                        elif asp_sent == "negative":
                            neg_aspects[asp_name] += 1

    # Format trends sorted by date
    trends_list = [
        {"date": k, "positive": v["positive"], "negative": v["negative"], "neutral": v["neutral"]}
        for k, v in sorted(trend_map.items())
    ]
    if not trends_list:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        trends_list = [{"date": today, "positive": 0, "negative": 0, "neutral": 0}]

    top_pos = [
        {"aspect": k, "count": v}
        for k, v in sorted(pos_aspects.items(), key=lambda x: x[1], reverse=True)[:6]
    ]
    top_neg = [
        {"aspect": k, "count": v}
        for k, v in sorted(neg_aspects.items(), key=lambda x: x[1], reverse=True)[:6]
    ]

    return DashboardCharts(
        sentiment_distribution=sentiment_dist,
        rating_distribution=rating_dist,
        review_trends=trends_list,
        top_positive_aspects=top_pos,
        top_negative_aspects=top_neg,
        fake_vs_genuine=fake_dist,
    )
