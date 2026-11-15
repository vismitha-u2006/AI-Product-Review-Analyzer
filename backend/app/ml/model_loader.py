import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ModelLoader:
    """Singleton lazy model loader for ML models."""

    _instance: Optional["ModelLoader"] = None
    _sentiment_pipeline = None
    _zero_shot_pipeline = None
    _whisper_model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_sentiment_pipeline(self):
        if self._sentiment_pipeline is None:
            try:
                from transformers import pipeline
                logger.info("Loading sentiment analysis pipeline...")
                self._sentiment_pipeline = pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                    return_all_scores=True,
                )
                logger.info("Sentiment pipeline loaded.")
            except Exception as e:
                logger.error(f"Failed to load sentiment pipeline: {e}")
                self._sentiment_pipeline = None
        return self._sentiment_pipeline

    def get_zero_shot_pipeline(self):
        if self._zero_shot_pipeline is None:
            try:
                from transformers import pipeline
                logger.info("Loading zero-shot classification pipeline...")
                self._zero_shot_pipeline = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli",
                )
                logger.info("Zero-shot pipeline loaded.")
            except Exception as e:
                logger.error(f"Failed to load zero-shot pipeline: {e}")
                self._zero_shot_pipeline = None
        return self._zero_shot_pipeline

    def get_whisper_model(self):
        if self._whisper_model is None:
            try:
                import whisper
                logger.info("Loading Whisper tiny model...")
                self._whisper_model = whisper.load_model("tiny")
                logger.info("Whisper model loaded.")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                self._whisper_model = None
        return self._whisper_model


model_loader = ModelLoader()
