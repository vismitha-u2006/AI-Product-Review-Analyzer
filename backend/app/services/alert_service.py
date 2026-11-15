import logging
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session
from ..models.models import AnalysisResult, SellerAlert, Review
from .absa_service import aggregate_aspects

logger = logging.getLogger(__name__)


def _alert_exists_recently(product_id: int, alert_type: str, db: Session, hours: int = 24) -> bool:
    """Check if a similar alert was created within the past N hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    existing = db.query(SellerAlert).filter(
        SellerAlert.product_id == product_id,
        SellerAlert.alert_type == alert_type,
        SellerAlert.created_at >= cutoff,
        SellerAlert.status != "resolved",
    ).first()
    return existing is not None


def check_and_generate_alerts(product_id: int, db: Session) -> list:
    """
    Analyze analysis results for a product and generate seller alerts.
    Returns list of newly created SellerAlert objects.
    """
    analyses = db.query(AnalysisResult).filter(
        AnalysisResult.product_id == product_id
    ).all()

    if not analyses:
        return []

    total = len(analyses)
    new_alerts = []

    # --- Signal 1: Negative percentage threshold ---
    negatives = sum(1 for a in analyses if a.sentiment == "negative")
    neg_pct = negatives / total * 100 if total else 0

    if neg_pct > 50 and not _alert_exists_recently(product_id, "high_negative", db):
        alert = SellerAlert(
            product_id=product_id,
            alert_type="high_negative",
            priority="HIGH",
            status="open",
            title="High Negative Review Rate",
            message=f"{neg_pct:.1f}% of reviews are negative. Immediate attention required.",
            issue="negative_sentiment",
            negative_percentage=round(neg_pct, 1),
            recommendations=[
                "Review top complaints and address root causes",
                "Improve product quality or description accuracy",
                "Respond to negative reviews publicly",
            ],
        )
        db.add(alert)
        new_alerts.append(alert)

    elif neg_pct > 30 and not _alert_exists_recently(product_id, "medium_negative", db):
        alert = SellerAlert(
            product_id=product_id,
            alert_type="medium_negative",
            priority="MEDIUM",
            status="open",
            title="Elevated Negative Reviews",
            message=f"{neg_pct:.1f}% of reviews are negative. Consider investigating.",
            issue="negative_sentiment",
            negative_percentage=round(neg_pct, 1),
            recommendations=[
                "Identify and address recurring complaints",
                "Improve customer support response time",
            ],
        )
        db.add(alert)
        new_alerts.append(alert)

    # --- Signal 2: Aspect-level negativity ---
    all_aspect_data = [a.aspect_results for a in analyses if a.aspect_results]
    if all_aspect_data:
        agg = aggregate_aspects(all_aspect_data)
        for asp in agg.get("aspects", []):
            if asp.get("negative_pct", 0) >= 50 and asp["total_mentions"] >= 3:
                alert_type = f"aspect_negative_{asp['aspect'].replace(' ', '_')}"
                if not _alert_exists_recently(product_id, alert_type, db):
                    alert = SellerAlert(
                        product_id=product_id,
                        alert_type=alert_type,
                        priority="MEDIUM",
                        status="open",
                        title=f"Negative Feedback: {asp['aspect'].title()}",
                        message=(
                            f"{asp['negative_pct']:.0f}% of mentions for '{asp['aspect']}' "
                            f"are negative across {asp['total_mentions']} reviews."
                        ),
                        issue=asp["aspect"],
                        negative_percentage=asp["negative_pct"],
                        recommendations=[
                            f"Investigate and improve {asp['aspect']}",
                            f"Address customer complaints about {asp['aspect']} in product updates",
                        ],
                    )
                    db.add(alert)
                    new_alerts.append(alert)

    # --- Signal 3: Fake review detection ---
    suspicious = sum(1 for a in analyses if a.is_suspicious)
    suspicious_pct = suspicious / total * 100 if total else 0

    if suspicious_pct > 20 and not _alert_exists_recently(product_id, "fake_reviews", db):
        alert = SellerAlert(
            product_id=product_id,
            alert_type="fake_reviews",
            priority="HIGH" if suspicious_pct > 40 else "MEDIUM",
            status="open",
            title="Suspicious Review Activity Detected",
            message=(
                f"{suspicious_pct:.1f}% of reviews ({suspicious} of {total}) "
                "appear suspicious or potentially fake."
            ),
            issue="fake_reviews",
            negative_percentage=round(suspicious_pct, 1),
            recommendations=[
                "Review suspicious content manually",
                "Consider reporting fake reviews to the platform",
                "Encourage genuine customers to leave authentic reviews",
            ],
        )
        db.add(alert)
        new_alerts.append(alert)

    if new_alerts:
        db.commit()
        for alert in new_alerts:
            db.refresh(alert)

    return new_alerts
