import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models.models import Product, Review, AnalysisResult
from ..config import settings
from .sentiment_service import get_sentiment_breakdown
from .absa_service import aggregate_aspects

logger = logging.getLogger(__name__)


def _get_product_stats(product_id: int, db: Session) -> Dict[str, Any]:
    """Gather stats for a single product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {}

    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    analyses = db.query(AnalysisResult).filter(AnalysisResult.product_id == product_id).all()

    total_reviews = len(reviews)
    ratings = [r.rating for r in reviews if r.rating is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    # Sentiment breakdown
    sentiment_data = [
        {"sentiment": a.sentiment or "neutral", "score": a.sentiment_score or 0.5}
        for a in analyses
    ]
    breakdown = get_sentiment_breakdown(sentiment_data) if sentiment_data else {}

    # Fake reviews
    suspicious = sum(1 for a in analyses if a.is_suspicious)
    suspicious_pct = round(suspicious / total_reviews * 100, 1) if total_reviews else 0

    # Aspects
    aspect_data = []
    for a in analyses:
        if a.aspect_results:
            aspect_data.append(a.aspect_results)
    agg = aggregate_aspects(aspect_data)
    top_aspects = agg.get("aspects", [])[:5]

    return {
        "product_id": product_id,
        "product_name": product.name,
        "total_reviews": total_reviews,
        "positive_pct": breakdown.get("positive_pct", 0),
        "negative_pct": breakdown.get("negative_pct", 0),
        "neutral_pct": breakdown.get("neutral_pct", 0),
        "avg_rating": avg_rating,
        "fake_pct": suspicious_pct,
        "top_aspects": top_aspects,
    }


def compare_products(product_ids: List[int], db: Session) -> Dict[str, Any]:
    """Compare multiple products side by side."""
    stats = []
    for pid in product_ids:
        s = _get_product_stats(pid, db)
        if s:
            stats.append(s)

    if not stats:
        return {"products": [], "recommendation": None, "winner": None}

    # Determine winner by highest positive percentage
    winner_stat = max(stats, key=lambda x: (x.get("positive_pct", 0) - x.get("fake_pct", 0)))
    winner = winner_stat["product_name"]

    recommendation = None
    if settings.GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            stats_text = "\n".join([
                f"Product: {s['product_name']}, Positive: {s['positive_pct']}%, "
                f"Negative: {s['negative_pct']}%, Avg Rating: {s.get('avg_rating', 'N/A')}, "
                f"Fake: {s['fake_pct']}%"
                for s in stats
            ])

            prompt = f"""Compare these products and provide a brief recommendation (2-3 sentences):
{stats_text}
Which product is better and why? Be concise and factual."""

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            recommendation = response.text.strip()
        except Exception as e:
            logger.error(f"Gemini comparison failed: {e}")

    if not recommendation:
        recommendation = (
            f"Based on the data, {winner} performs best with the highest positive review rate "
            f"and lowest suspicious review percentage. Consider this product for purchase."
        )

    return {
        "products": stats,
        "recommendation": recommendation,
        "winner": winner,
    }
