from typing import List, Dict, Any
from collections import defaultdict
from ..ml.inference import run_absa
import logging

logger = logging.getLogger(__name__)


def analyze_aspects(text: str) -> List[Dict[str, Any]]:
    """Extract and classify aspects from a single review."""
    return run_absa(text)


def analyze_aspects_batch(texts: List[str]) -> List[List[Dict[str, Any]]]:
    """ABSA for multiple reviews."""
    results = []
    for text in texts:
        try:
            results.append(run_absa(text))
        except Exception as e:
            logger.error(f"ABSA error: {e}")
            results.append([])
    return results


def aggregate_aspects(all_aspect_results: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Aggregate aspect results across multiple reviews."""
    aspect_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0, "total": 0})

    for item in all_aspect_results:
        review_aspects = item if isinstance(item, list) else (getattr(item, "aspect_results", None) or [])
        for aspect_data in review_aspects:
            if not isinstance(aspect_data, dict):
                continue
            aspect = aspect_data.get("aspect", "")
            sentiment = aspect_data.get("sentiment", "neutral")
            if aspect:
                aspect_counts[aspect]["total"] += 1
                aspect_counts[aspect][sentiment] = aspect_counts[aspect].get(sentiment, 0) + 1

    aggregated = []
    for aspect, counts in aspect_counts.items():
        total = counts["total"]
        aggregated.append({
            "aspect": aspect,
            "total_mentions": total,
            "positive": counts["positive"],
            "negative": counts["negative"],
            "neutral": counts["neutral"],
            "positive_pct": round(counts["positive"] / total * 100, 1) if total else 0,
            "negative_pct": round(counts["negative"] / total * 100, 1) if total else 0,
            "neutral_pct": round(counts["neutral"] / total * 100, 1) if total else 0,
        })

    aggregated.sort(key=lambda x: x["total_mentions"], reverse=True)
    return {"aspects": aggregated}
