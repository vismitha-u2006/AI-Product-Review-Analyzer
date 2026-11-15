import os
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from ..models.models import Product, Review, AnalysisResult, SellerAlert, GeneratedReport
from .sentiment_service import get_sentiment_breakdown
from .absa_service import aggregate_aspects
from .summary_service import generate_summary

logger = logging.getLogger(__name__)


def generate_pdf_report(
    product_id: Optional[int],
    user_id: int,
    db: Session,
) -> str:
    """Generate a comprehensive PDF report and return its file path."""
    os.makedirs("uploads/reports", exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"report_{product_id or 'all'}_{timestamp}.pdf"
    file_path = os.path.join("uploads", "reports", filename)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Title"],
        fontSize=20,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    heading_style = ParagraphStyle(
        "HeadingStyle",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#16213e"),
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = styles["BodyText"]
    body_style.fontSize = 10

    story = []

    # --- Header ---
    story.append(Paragraph("AI Product Review Analyzer", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y %H:%M')}", styles["Normal"]))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0f3460")))
    story.append(Spacer(1, 12))

    # --- Gather Data ---
    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        reviews = db.query(Review).filter(Review.product_id == product_id).all()
        analyses = db.query(AnalysisResult).filter(AnalysisResult.product_id == product_id).all()
        alerts = db.query(SellerAlert).filter(
            SellerAlert.product_id == product_id,
            SellerAlert.status == "open",
        ).all()
        product_name = product.name if product else f"Product {product_id}"
    else:
        product_name = "All Products"
        reviews = db.query(Review).all()
        analyses = db.query(AnalysisResult).all()
        alerts = db.query(SellerAlert).filter(SellerAlert.status == "open").all()

    total = len(reviews)
    sentiment_data = [
        {"sentiment": a.sentiment or "neutral", "score": a.sentiment_score or 0.5}
        for a in analyses
    ]
    breakdown = get_sentiment_breakdown(sentiment_data) if sentiment_data else {}

    ratings = [r.rating for r in reviews if r.rating is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    suspicious = sum(1 for a in analyses if a.is_suspicious)

    # --- Product Header ---
    story.append(Paragraph(f"Product Report: {product_name}", heading_style))
    story.append(Spacer(1, 6))

    # --- Executive Summary Table ---
    story.append(Paragraph("Executive Summary", heading_style))
    exec_data = [
        ["Metric", "Value"],
        ["Total Reviews", str(total)],
        ["Average Rating", f"{avg_rating}/5" if avg_rating else "N/A"],
        ["Positive Reviews", f"{breakdown.get('positive', 0)} ({breakdown.get('positive_pct', 0):.1f}%)"],
        ["Negative Reviews", f"{breakdown.get('negative', 0)} ({breakdown.get('negative_pct', 0):.1f}%)"],
        ["Neutral Reviews", f"{breakdown.get('neutral', 0)} ({breakdown.get('neutral_pct', 0):.1f}%)"],
        ["Suspicious Reviews", f"{suspicious} ({round(suspicious/total*100, 1) if total else 0}%)"],
        ["Active Alerts", str(len(alerts))],
    ]
    exec_table = Table(exec_data, colWidths=[3 * inch, 3 * inch])
    exec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f3460")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 12))

    # --- Aspect Analysis ---
    aspect_data = [a.aspect_results for a in analyses if a.aspect_results]
    if aspect_data:
        agg = aggregate_aspects(aspect_data)
        top_aspects = agg.get("aspects", [])[:8]

        if top_aspects:
            story.append(Paragraph("Aspect Analysis", heading_style))
            aspect_table_data = [["Aspect", "Mentions", "Positive %", "Negative %", "Neutral %"]]
            for asp in top_aspects:
                aspect_table_data.append([
                    asp["aspect"].title(),
                    str(asp["total_mentions"]),
                    f"{asp['positive_pct']:.1f}%",
                    f"{asp['negative_pct']:.1f}%",
                    f"{asp['neutral_pct']:.1f}%",
                ])
            asp_table = Table(aspect_table_data, colWidths=[2*inch, 1*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            asp_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16213e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(asp_table)
            story.append(Spacer(1, 12))

    # --- Fake Review Summary ---
    story.append(Paragraph("Fake Review Detection", heading_style))
    fake_data = [
        ["Category", "Count", "Percentage"],
        ["Genuine", str(total - suspicious), f"{round((total-suspicious)/total*100, 1) if total else 0}%"],
        ["Suspicious", str(suspicious), f"{round(suspicious/total*100, 1) if total else 0}%"],
    ]
    fake_table = Table(fake_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
    fake_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#533483")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(fake_table)
    story.append(Spacer(1, 12))

    # --- Seller Alerts ---
    if alerts:
        story.append(Paragraph("Active Seller Alerts", heading_style))
        for alert in alerts[:5]:
            priority_color = colors.red if alert.priority == "HIGH" else colors.orange
            story.append(Paragraph(
                f"<b>[{alert.priority}]</b> {alert.title}",
                ParagraphStyle("AlertTitle", parent=body_style, textColor=priority_color, fontSize=11)
            ))
            story.append(Paragraph(alert.message, body_style))
            if alert.recommendations:
                for rec in alert.recommendations[:3]:
                    story.append(Paragraph(f"  • {rec}", body_style))
            story.append(Spacer(1, 6))

    # --- AI Summary ---
    if product_id and analyses:
        try:
            analysis_summary = {
                **breakdown,
                "total_reviews": total,
                "avg_rating": avg_rating,
                "suspicious_pct": round(suspicious / total * 100, 1) if total else 0,
                "top_aspects": agg.get("aspects", [])[:5] if aspect_data else [],
            }
            sample_texts = [r.original_text[:100] for r in reviews[:5]]
            summary = generate_summary(product_name, sample_texts, analysis_summary)

            story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
            story.append(Spacer(1, 6))
            story.append(Paragraph("AI-Generated Summary", heading_style))
            story.append(Paragraph(summary.get("summary", ""), body_style))
            story.append(Spacer(1, 6))

            if summary.get("strengths"):
                story.append(Paragraph("<b>Strengths:</b>", body_style))
                for s in summary["strengths"]:
                    story.append(Paragraph(f"  ✓ {s}", body_style))

            if summary.get("weaknesses"):
                story.append(Paragraph("<b>Areas for Improvement:</b>", body_style))
                for w in summary["weaknesses"]:
                    story.append(Paragraph(f"  ✗ {w}", body_style))

            story.append(Paragraph(
                f"<b>Overall Satisfaction:</b> {summary.get('overall_satisfaction', 'N/A')}",
                body_style
            ))
        except Exception as e:
            logger.error(f"Summary generation for report failed: {e}")

    # --- Footer ---
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    story.append(Paragraph(
        f"Report generated by AI Product Review Analyzer | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    ))

    doc.build(story)

    # Save to DB
    report_name = f"{product_name} Report - {datetime.now().strftime('%Y-%m-%d')}"
    report_record = GeneratedReport(
        user_id=user_id,
        product_id=product_id,
        report_name=report_name,
        file_path=file_path,
        report_type="pdf",
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    return file_path
