import logging
from typing import List, Dict, Any
from ..config import settings

logger = logging.getLogger(__name__)


def _template_summary(product_name: str, analysis_summary: dict) -> dict:
    """Fallback template-based summary when Gemini is unavailable."""
    pos_pct = analysis_summary.get("positive_pct", 0)
    neg_pct = analysis_summary.get("negative_pct", 0)
    total = analysis_summary.get("total_reviews", 0)
    top_aspects = analysis_summary.get("top_aspects", [])

    # Overall satisfaction tier
    if pos_pct >= 70:
        satisfaction = "High"
        summary_text = (
            f"{product_name} receives strong positive feedback from customers. "
            f"With {pos_pct:.0f}% positive reviews out of {total} total, "
            "customers are generally very satisfied with this product."
        )
    elif pos_pct >= 50:
        satisfaction = "Moderate"
        summary_text = (
            f"{product_name} receives mixed but generally positive feedback. "
            f"{pos_pct:.0f}% of {total} reviews are positive, "
            "suggesting the product meets most customer expectations."
        )
    else:
        satisfaction = "Low"
        summary_text = (
            f"{product_name} has significant room for improvement. "
            f"Only {pos_pct:.0f}% of {total} reviews are positive, "
            "with notable customer concerns that should be addressed."
        )

    # Strengths (positive aspects)
    strengths = []
    weaknesses = []
    for asp in top_aspects:
        if asp.get("positive_pct", 0) >= 60:
            strengths.append(f"Strong {asp['aspect']} performance praised by customers")
        if asp.get("negative_pct", 0) >= 50:
            weaknesses.append(f"{asp['aspect'].capitalize()} frequently cited as a concern")

    if not strengths:
        if pos_pct >= 50:
            strengths = ["Overall product quality", "Value for money", "Customer satisfaction"]
        else:
            strengths = ["Some positive customer experiences reported"]

    if not weaknesses:
        if neg_pct >= 30:
            weaknesses = ["Product quality consistency issues", "Customer service improvements needed"]
        else:
            weaknesses = ["Minor areas for improvement exist"]

    suggestions = [
        "Monitor customer feedback regularly and act on recurring complaints",
        "Highlight product strengths in marketing materials",
        "Address the most commonly reported issues to improve overall rating",
    ]

    return {
        "summary": summary_text,
        "strengths": strengths[:5],
        "weaknesses": weaknesses[:5],
        "suggestions": suggestions,
        "overall_satisfaction": satisfaction,
    }


def generate_summary(product_name: str, reviews_data: list, analysis_summary: dict) -> dict:
    """
    Generate AI-powered summary using Gemini, with template fallback.
    """
    if not settings.GEMINI_API_KEY:
        logger.info("No GEMINI_API_KEY set, using template summary")
        return _template_summary(product_name, analysis_summary)

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        pos_pct = analysis_summary.get("positive_pct", 0)
        neg_pct = analysis_summary.get("negative_pct", 0)
        neu_pct = analysis_summary.get("neutral_pct", 0)
        total = analysis_summary.get("total_reviews", 0)
        avg_rating = analysis_summary.get("avg_rating", "N/A")
        top_aspects = analysis_summary.get("top_aspects", [])
        suspicious_pct = analysis_summary.get("suspicious_pct", 0)

        # Build a brief sample of reviews for context
        sample_reviews = reviews_data[:5] if reviews_data else []
        sample_text = "\n".join([f"- {r}" for r in sample_reviews])

        prompt = f"""You are a product review analyst. Analyze the following data for product "{product_name}" and provide a structured summary.

STATISTICS:
- Total Reviews: {total}
- Positive: {pos_pct:.1f}%
- Negative: {neg_pct:.1f}%
- Neutral: {neu_pct:.1f}%
- Average Rating: {avg_rating}
- Suspicious Reviews: {suspicious_pct:.1f}%

TOP ASPECTS MENTIONED:
{', '.join([asp['aspect'] for asp in top_aspects[:5]]) if top_aspects else 'No specific aspects detected'}

SAMPLE REVIEWS:
{sample_text if sample_text else 'No sample reviews available'}

Please provide a JSON response with exactly this structure:
{{
  "summary": "2-3 sentence executive summary",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "overall_satisfaction": "High|Moderate|Low"
}}

Respond with ONLY valid JSON, no markdown or extra text."""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        response_text = response.text.strip()

        # Clean markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        import json
        result = json.loads(response_text)
        return result

    except Exception as e:
        logger.error(f"Gemini summary generation failed: {e}")
        return _template_summary(product_name, analysis_summary)
