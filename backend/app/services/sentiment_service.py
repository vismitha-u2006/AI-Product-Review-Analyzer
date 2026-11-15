from typing import List, Dict, Any
from ..ml.inference import run_sentiment
import logging

logger = logging.getLogger(__name__)


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """Analyze sentiment of a single text."""
    return run_sentiment(text)


def analyze_sentiment_batch(texts: List[str]) -> List[Dict[str, Any]]:
    """Analyze sentiment for a list of texts."""
    results = []
    for text in texts:
        try:
            results.append(run_sentiment(text))
        except Exception as e:
            logger.error(f"Sentiment error: {e}")
            results.append({"sentiment": "neutral", "score": 0.5, "confidence": 0.5, "label": "Neutral"})
    return results


def get_sentiment_breakdown(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate sentiment results into percentage breakdown."""
    total = len(results)
    if total == 0:
        return {"positive": 0, "neutral": 0, "negative": 0, "positive_pct": 0.0, "neutral_pct": 0.0, "negative_pct": 0.0}

    counts = {"positive": 0, "neutral": 0, "negative": 0}
    scores = []
    for r in results:
        if isinstance(r, dict):
            sentiment = r.get("sentiment", "neutral") or "neutral"
            score = r.get("score", 0.5)
        else:
            sentiment = getattr(r, "sentiment", "neutral") or "neutral"
            score = getattr(r, "sentiment_score", 0.5) or 0.5
        counts[sentiment] = counts.get(sentiment, 0) + 1
        scores.append(score)

    return {
        "positive": counts["positive"],
        "neutral": counts["neutral"],
        "negative": counts["negative"],
        "positive_pct": round(counts["positive"] / total * 100, 1),
        "neutral_pct": round(counts["neutral"] / total * 100, 1),
        "negative_pct": round(counts["negative"] / total * 100, 1),
        "avg_score": round(sum(scores) / len(scores), 4) if scores else 0.5,
    }
