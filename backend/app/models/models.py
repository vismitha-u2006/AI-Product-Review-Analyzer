from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Text, DateTime,
    ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    products = relationship("Product", back_populates="owner", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="user", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="products")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("SellerAlert", back_populates="product", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="product")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    reviewer_id = Column(String(255), nullable=True)
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=True)
    original_language = Column(String(50), nullable=True, default="en")
    rating = Column(Float, nullable=True)
    review_date = Column(DateTime, nullable=True)
    source = Column(String(100), nullable=True, default="manual")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="reviews")
    analysis_result = relationship("AnalysisResult", back_populates="review", uselist=False, cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), unique=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    sentiment = Column(String(50), nullable=True)
    sentiment_score = Column(Float, nullable=True)
    sentiment_confidence = Column(Float, nullable=True)
    is_suspicious = Column(Boolean, default=False)
    fake_confidence = Column(Float, nullable=True)
    fake_reasons = Column(JSON, nullable=True)
    fake_label = Column(String(50), nullable=True)
    aspect_results = Column(JSON, nullable=True)
    language_confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    review = relationship("Review", back_populates="analysis_result")
    product = relationship("Product", back_populates="analysis_results")
    aspect_details = relationship("AspectResult", back_populates="analysis", cascade="all, delete-orphan")


class AspectResult(Base):
    __tablename__ = "aspect_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analysis_results.id"), nullable=False)
    aspect = Column(String(100), nullable=False)
    sentiment = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=True)
    text_snippet = Column(Text, nullable=True)

    analysis = relationship("AnalysisResult", back_populates="aspect_details")


class SellerAlert(Base):
    __tablename__ = "seller_alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    alert_type = Column(String(100), nullable=False, default="general")
    priority = Column(String(20), nullable=False, default="MEDIUM")  # HIGH, MEDIUM, LOW
    status = Column(String(20), nullable=False, default="open")  # open, resolved, ignored
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    issue = Column(String(255), nullable=True)
    negative_percentage = Column(Float, nullable=True)
    recommendations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="alerts")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chat_history")


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    report_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    report_type = Column(String(50), nullable=False, default="pdf")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reports")
    product = relationship("Product", back_populates="reports")
