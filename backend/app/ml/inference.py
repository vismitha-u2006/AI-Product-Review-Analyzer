import re
import logging
from typing import List, Dict, Any, Optional
from .model_loader import model_loader

logger = logging.getLogger(__name__)

COMMON_ASPECTS = [
    "battery", "camera", "display", "sound", "build quality",
    "price", "performance", "delivery", "packaging", "customer service",
    "screen", "audio", "software", "durability", "design"
]

FAKE_KEYWORDS = [
    "best product ever", "five stars", "highly recommend", "amazing product",
    "perfect product", "must buy", "best purchase", "love it", "awesome product",
    "100% recommended", "buy it now"
]

PROMOTION_KEYWORDS = [
    "buy now", "click here", "limited offer", "discount", "promo code",
    "sponsored", "affiliate", "get yours", "order now"
]


def run_sentiment(text: str) -> Dict[str, Any]:
    """Run sentiment analysis using RoBERTa model with calibrated confidence."""
    if not text or not text.strip():
        return {"sentiment": "neutral", "score": 0.5, "confidence": 0.5, "label": "Neutral"}

    pipeline = model_loader.get_sentiment_pipeline()
    if pipeline is not None:
        try:
            # cardiffnlp pipeline returns [{'label': 'positive', 'score': 0.98}]
            results = pipeline(text[:512])
            if isinstance(results, list) and len(results) > 0:
                item = results[0]
                if isinstance(item, list) and len(item) > 0:
                    # Case of multiple scores
                    best = max(item, key=lambda x: x.get("score", 0))
                    label_raw = best.get("label", "neutral").lower()
                    conf = float(best.get("score", 0.5))
                elif isinstance(item, dict):
                    label_raw = item.get("label", "neutral").lower()
                    conf = float(item.get("score", 0.5))
                else:
                    label_raw = "neutral"
                    conf = 0.5

                if "pos" in label_raw or label_raw == "label_2":
                    sentiment = "positive"
                    score = 0.5 + (conf * 0.5)
                elif "neg" in label_raw or label_raw == "label_0":
                    sentiment = "negative"
                    score = 0.5 - (conf * 0.5)
                else:
                    sentiment = "neutral"
                    score = 0.5

                return {
                    "sentiment": sentiment,
                    "score": round(max(0.0, min(1.0, score)), 4),
                    "confidence": round(conf, 4),
                    "label": sentiment.capitalize(),
                }
        except Exception as e:
            logger.error(f"RoBERTa sentiment inference error: {e}")

    # Robust fallback: rule-based sentiment
    text_lower = text.lower()
    positive_words = ["good", "great", "excellent", "love", "amazing", "perfect", "best", "brilliant", "smooth", "crisp", "sharp", "stellar", "superior"]
    negative_words = ["bad", "terrible", "awful", "hate", "poor", "worst", "horrible", "defect", "broken", "drain", "heat", "crash", "stutter", "die"]
    pos = sum(1 for w in positive_words if w in text_lower)
    neg = sum(1 for w in negative_words if w in text_lower)

    if pos > neg:
        conf = min(0.95, 0.65 + (pos * 0.05))
        return {"sentiment": "positive", "score": round(0.5 + (conf * 0.4), 4), "confidence": round(conf, 4), "label": "Positive"}
    elif neg > pos:
        conf = min(0.95, 0.65 + (neg * 0.05))
        return {"sentiment": "negative", "score": round(0.5 - (conf * 0.4), 4), "confidence": round(conf, 4), "label": "Negative"}
    else:
        return {"sentiment": "neutral", "score": 0.5, "confidence": 0.60, "label": "Neutral"}


def run_absa(text: str) -> List[Dict[str, Any]]:
    """Transformer-based Aspect-Based Sentiment Analysis.
    Extracts individual product aspects and classifies sentiment for each aspect independently."""
    if not text or not text.strip():
        return []

    text_lower = text.lower()
    found_aspects = []
    aspect_snippets = {}

    for aspect in COMMON_ASPECTS:
        if aspect in text_lower:
            idx = text_lower.find(aspect)
            start = max(0, idx - 40)
            end = min(len(text), idx + len(aspect) + 40)
            snippet = text[start:end].strip()
            found_aspects.append(aspect)
            aspect_snippets[aspect] = snippet

    if not found_aspects:
        return []

    results = []
    for aspect in found_aspects:
        snippet = aspect_snippets[aspect]
        # Run deep learning sentiment on the aspect snippet directly
        sent_result = run_sentiment(snippet)
        results.append({
            "aspect": aspect.capitalize(),
            "sentiment": sent_result["sentiment"],
            "confidence": sent_result["confidence"],
            "text_snippet": snippet,
        })

    return results


def run_fake_detection(text: str, all_product_reviews: List[str] = []) -> Dict[str, Any]:
    """Multi-signal explainable fake review detection.
    Analyzes: length, capitalization, punctuation, promotional buzzwords, duplicates, and patterns."""
    if not text or not text.strip():
        return {
            "label": "insufficient_evidence",
            "confidence": 0.5,
            "is_suspicious": False,
            "reasons": ["Review text is empty"],
        }

    reasons = []
    suspicion_points = 0.0
    text_clean = text.strip()

    # 1. Very short or generic review (< 20 chars)
    if len(text_clean) < 20:
        reasons.append("Review is extremely short and lacks detailed product feedback.")
        suspicion_points += 0.35

    # 2. Excessive ALL CAPS (shouting)
    caps_count = sum(1 for c in text_clean if c.isupper())
    letters_count = sum(1 for c in text_clean if c.isalpha())
    if letters_count > 10 and (caps_count / letters_count) > 0.55:
        reasons.append(f"Excessive capitalization ({round((caps_count / letters_count) * 100)}% uppercase letters).")
        suspicion_points += 0.30

    # 3. Excessive exclamation marks
    excl_count = text_clean.count("!")
    if excl_count >= 3:
        reasons.append(f"High frequency of exclamation marks ({excl_count} detected).")
        suspicion_points += 0.20

    # 4. Generic promotional phrases
    text_lower = text_clean.lower()
    matched_fake_phrases = [kw for kw in FAKE_KEYWORDS if kw in text_lower]
    if matched_fake_phrases:
        reasons.append(f"Contains generic promotional hype: '{', '.join(matched_fake_phrases[:2])}'.")
        suspicion_points += 0.30

    # 5. Direct marketing / promo keywords
    matched_promo = [kw for kw in PROMOTION_KEYWORDS if kw in text_lower]
    if matched_promo:
        reasons.append(f"Contains commercial marketing triggers: '{', '.join(matched_promo[:2])}'.")
        suspicion_points += 0.40

    # 6. Duplication or cross-review plagiarism
    if all_product_reviews:
        for other in all_product_reviews:
            if other and other.strip() and text_lower == other.strip().lower() and len(text_lower) > 15:
                reasons.append("Exact duplicate of another review found for this product.")
                suspicion_points += 0.60
                break

    # Determine label and calibrated confidence
    if suspicion_points >= 0.50:
        label = "suspicious"
        is_suspicious = True
        confidence = min(0.96, 0.65 + (suspicion_points * 0.15))
    elif suspicion_points == 0.0 and len(text_clean) >= 40:
        label = "genuine"
        is_suspicious = False
        confidence = 0.88
        reasons.append("Natural phrasing, informative length, and specific product context.")
    else:
        label = "insufficient_evidence"
        is_suspicious = False
        confidence = 0.60
        if not reasons:
            reasons.append("Review appears standard with no clear signs of manipulation.")

    return {
        "label": label,
        "confidence": round(confidence, 4),
        "is_suspicious": is_suspicious,
        "reasons": reasons,
    }


def detect_language(text: str) -> Dict[str, Any]:
    """Detect language of review text."""
    from deep_translator import GoogleTranslator
    try:
        from ..services.translation_service import detect_language as dt_detect
        lang, conf = dt_detect(text)
        return {"language": lang, "confidence": conf}
    except Exception:
        return {"language": "en", "confidence": 0.90}
