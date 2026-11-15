import logging
from typing import Optional
from sqlalchemy.orm import Session
from ..models.models import Product, Review, AnalysisResult, ChatHistory
from ..config import settings
from .sentiment_service import get_sentiment_breakdown
from .absa_service import aggregate_aspects

logger = logging.getLogger(__name__)


def _build_context(product_id: Optional[int], db: Session) -> str:
    """Build context string about a product for the assistant."""
    if not product_id:
        return "No specific product selected. Answer general questions about product review analysis."

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return "Product not found."

    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    analyses = db.query(AnalysisResult).filter(AnalysisResult.product_id == product_id).all()

    total = len(reviews)
    sentiment_data = [
        {"sentiment": a.sentiment or "neutral", "score": a.sentiment_score or 0.5}
        for a in analyses
    ]
    breakdown = get_sentiment_breakdown(sentiment_data) if sentiment_data else {}

    aspect_data = [a.aspect_results for a in analyses if a.aspect_results]
    agg = aggregate_aspects(aspect_data)
    top_aspects = agg.get("aspects", [])[:5]

    suspicious = sum(1 for a in analyses if a.is_suspicious)
    avg_rating = None
    ratings = [r.rating for r in reviews if r.rating is not None]
    if ratings:
        avg_rating = round(sum(ratings) / len(ratings), 2)

    context = f"""Product: {product.name}
Category: {product.category or 'N/A'}
Description: {product.description or 'N/A'}
Total Reviews: {total}
Average Rating: {avg_rating or 'N/A'}
Sentiment: {breakdown.get('positive_pct', 0):.1f}% positive, {breakdown.get('negative_pct', 0):.1f}% negative, {breakdown.get('neutral_pct', 0):.1f}% neutral
Suspicious Reviews: {suspicious} ({round(suspicious/total*100, 1) if total else 0}%)
Top Aspects: {', '.join([a['aspect'] for a in top_aspects]) if top_aspects else 'None detected'}"""

    return context


def _rule_based_response(message: str, context: str) -> str:
    """Simple rule-based fallback when Gemini is unavailable."""
    msg = message.lower()

    if any(w in msg for w in ["positive", "good review", "strength"]):
        return (
            f"Based on the data:\n{context}\n\n"
            "Look at the positive percentage and top aspects for strengths."
        )
    elif any(w in msg for w in ["negative", "complaint", "weakness", "problem"]):
        return (
            f"Based on the data:\n{context}\n\n"
            "High negative percentages and aspect-level issues indicate areas needing improvement."
        )
    elif any(w in msg for w in ["fake", "suspicious", "authentic"]):
        return (
            f"Based on the data:\n{context}\n\n"
            "Suspicious reviews are detected through signals like very short text, "
            "generic phrases, excessive punctuation, and duplicate patterns."
        )
    elif any(w in msg for w in ["rating", "score", "star"]):
        return f"Based on the data:\n{context}\n\nSee the Average Rating and Sentiment data above."
    else:
        return (
            f"I can help you analyze product reviews. Here's what I know about this product:\n\n{context}\n\n"
            "You can ask me about sentiment trends, common complaints, fake review detection, "
            "or aspect-level performance."
        )


def chat_with_assistant(
    message: str,
    product_id: Optional[int],
    db: Session,
    user_id: int,
) -> dict:
    """
    Chat with AI assistant about product reviews.
    Uses Gemini if available, falls back to rule-based responses.
    """
    context = _build_context(product_id, db)
    response_text = ""

    if settings.GEMINI_API_KEY:
        try:
            from google import genai

            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            system_prompt = f"""You are an intelligent product review analyst assistant. 
You help sellers understand their product reviews, sentiment trends, and actionable insights.

PRODUCT CONTEXT:
{context}

Guidelines:
- Be concise but informative (3-5 sentences max unless asked for more)
- Reference specific numbers from the context when relevant
- Provide actionable suggestions when appropriate
- If asked about something outside the product data, say so politely"""

            full_prompt = f"{system_prompt}\n\nUser: {message}\nAssistant:"

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=full_prompt,
            )
            response_text = response.text.strip()
        except Exception as e:
            logger.error(f"Gemini assistant error: {e}")
            response_text = _rule_based_response(message, context)
    else:
        response_text = _rule_based_response(message, context)

    # Save to chat history
    try:
        user_msg = ChatHistory(
            user_id=user_id,
            role="user",
            content=message,
            product_id=product_id,
        )
        assistant_msg = ChatHistory(
            user_id=user_id,
            role="assistant",
            content=response_text,
            product_id=product_id,
        )
        db.add(user_msg)
        db.add(assistant_msg)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save chat history: {e}")

    return {"response": response_text}
