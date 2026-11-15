from deep_translator import GoogleTranslator
import logging
import re

logger = logging.getLogger(__name__)


def detect_language(text: str) -> tuple[str, float]:
    """Detect language using character analysis and translation metadata."""
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
        return "fr", 0.6  # Could be French, Spanish, etc.
    return "en", 0.75


def translate_to_english(text: str, source_lang: str = "auto") -> dict:
    """
    Translate text to English using deep_translator.
    Returns:
        {
            "original_text": str,
            "translated_text": str,
            "detected_language": str,
            "language_confidence": float,
            "was_translated": bool
        }
    """
    detected_lang, lang_confidence = detect_language(text)

    # If already English, skip translation
    if detected_lang == "en" and source_lang == "auto":
        return {
            "original_text": text,
            "translated_text": text,
            "detected_language": "en",
            "language_confidence": lang_confidence,
            "was_translated": False,
        }

    try:
        src = "auto" if source_lang == "auto" else source_lang
        translator = GoogleTranslator(source=src, target="en")
        translated = translator.translate(text)
        return {
            "original_text": text,
            "translated_text": translated or text,
            "detected_language": detected_lang,
            "language_confidence": lang_confidence,
            "was_translated": True,
        }
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return {
            "original_text": text,
            "translated_text": text,
            "detected_language": detected_lang,
            "language_confidence": lang_confidence,
            "was_translated": False,
        }
