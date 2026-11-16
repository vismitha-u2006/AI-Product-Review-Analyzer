import urllib.parse
import requests
import logging
import re
from typing import Dict, Any, Tuple

try:
    from deep_translator import GoogleTranslator
except Exception:
    GoogleTranslator = None

logger = logging.getLogger(__name__)


def detect_language(text: str) -> Tuple[str, float]:
    """Detect language using character analysis and scripts."""
    if not text:
        return "en", 1.0
    if re.search(r'[\u4e00-\u9fff]', text):
        return "zh-CN", 0.95
    if re.search(r'[\u3040-\u309f\u30a0-\u30ff]', text):
        return "ja", 0.95
    if re.search(r'[\uac00-\ud7af]', text):
        return "ko", 0.95
    if re.search(r'[\u0600-\u06ff]', text):
        return "ar", 0.95
    if re.search(r'[\u0400-\u04ff]', text):
        return "ru", 0.95
    if re.search(r'[\u0900-\u097f]', text):
        return "hi", 0.95
    if re.search(r'[àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿ]', text, re.IGNORECASE):
        return "es", 0.8
    return "auto", 0.75


def translate_to_english(text: str, target_lang: str = "en", source_lang: str = "auto") -> Dict[str, Any]:
    """
    Robust multi-tier translation to English for international product reviews.
    Returns:
        {
            "original_text": str,
            "translated_text": str,
            "detected_language": str,
            "language_confidence": float,
            "was_translated": bool
        }
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return {
            "original_text": text,
            "translated_text": text,
            "detected_language": "en",
            "language_confidence": 1.0,
            "was_translated": False,
        }

    # Strategy 1: Google GTX Single-Shot API (fast, high precision auto-detection)
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={urllib.parse.quote(cleaned)}"
        resp = requests.get(url, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            translated = "".join([item[0] for item in data[0] if item and item[0]])
            detected = data[2] if len(data) > 2 and data[2] else "auto"
            was_trans = (
                detected.lower() != target_lang.lower()
                and translated.strip().lower() != cleaned.lower()
            )
            return {
                "original_text": text,
                "translated_text": translated or text,
                "detected_language": detected,
                "language_confidence": 0.95,
                "was_translated": was_trans,
            }
    except Exception as e:
        logger.debug(f"GTX translation fallback triggered: {e}")

    # Strategy 2: deep-translator GoogleTranslator fallback
    if GoogleTranslator:
        try:
            gt = GoogleTranslator(source=source_lang, target=target_lang)
            trans = gt.translate(cleaned)
            if trans and trans.strip().lower() != cleaned.lower():
                detected, conf = detect_language(cleaned)
                return {
                    "original_text": text,
                    "translated_text": trans,
                    "detected_language": detected if detected != "auto" else "es",
                    "language_confidence": 0.88,
                    "was_translated": True,
                }
        except Exception as e:
            logger.warning(f"GoogleTranslator error: {e}")

    # Strategy 3: Local script fallback
    detected, conf = detect_language(cleaned)
    return {
        "original_text": text,
        "translated_text": text,
        "detected_language": detected if detected != "auto" else "en",
        "language_confidence": conf,
        "was_translated": False,
    }
