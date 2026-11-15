from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.models import User, Product
from ..schemas.schemas import CompareRequest, CompareResponse, ProductCompareStats
from ..utils.auth import get_current_user
from ..services.comparison_service import compare_products

router = APIRouter(tags=["comparison"])


@router.post("/compare", response_model=CompareResponse)
@router.post("/comparison/compare", response_model=CompareResponse)
def compare_selected_products(
    req: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(req.product_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 products to compare")

    # Verify products belong to user
    products = db.query(Product).filter(
        Product.id.in_(req.product_ids),
        Product.owner_id == current_user.id,
    ).all()

    if len(products) < len(req.product_ids):
        raise HTTPException(status_code=404, detail="One or more products were not found")

    comparison_data = compare_products(req.product_ids, db)
    return CompareResponse(
        products=[
            ProductCompareStats(
                product_id=p["product_id"],
                product_name=p["product_name"],
                total_reviews=p["total_reviews"],
                positive_pct=p["positive_pct"],
                negative_pct=p["negative_pct"],
                neutral_pct=p["neutral_pct"],
                avg_rating=p.get("avg_rating"),
                fake_pct=p["fake_pct"],
                top_aspects=p.get("top_aspects", []),
            )
            for p in comparison_data.get("products", [])
        ],
        recommendation=comparison_data.get("recommendation"),
        winner=comparison_data.get("winner"),
    )
