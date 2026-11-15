from typing import List, Dict, Any
from ..ml.inference import run_fake_detection
import logging

logger = logging.getLogger(__name__)


def analyze_fake_review(text: str, all_reviews: List[str] = []) -> Dict[str, Any]:
    """Detect fake review signals for a single text."""
    return run_fake_detection(text, all_reviews)


def analyze_fake_batch(texts: List[str]) -> List[Dict[str, Any]]:
    """Analyze fake detection for a batch of reviews (uses all reviews for duplicate checking)."""
    results = []
    for i, text in enumerate(texts):
        others = [t for j, t in enumerate(texts) if j != i]
        try:
            results.append(run_fake_detection(text, others))
        except Exception as e:
            logger.error(f"Fake detection error for review {i}: {e}")
            results.append({
                "label": "insufficient_evidence",
                "confidence": 0.0,
                "is_suspicious": False,
                "reasons": [],
            })
    return results


def get_fake_summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Summarize fake detection results."""
    total = len(results)
    if total == 0:
        return {"suspicious": 0, "genuine": 0, "insufficient_evidence": 0, "suspicious_pct": 0.0}

    counts = {"suspicious": 0, "genuine": 0, "insufficient_evidence": 0}
    for r in results:
        label = r.get("label", "insufficient_evidence")
        counts[label] = counts.get(label, 0) + 1

    return {
        "suspicious": counts["suspicious"],
        "genuine": counts["genuine"],
        "insufficient_evidence": counts["insufficient_evidence"],
        "suspicious_pct": round(counts["suspicious"] / total * 100, 1),
    }
