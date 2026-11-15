from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.models import User, Product, SellerAlert
from ..schemas.schemas import AlertResponse, AlertUpdate
from ..utils.auth import get_current_user

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(
    product_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(SellerAlert)
        .join(Product, SellerAlert.product_id == Product.id)
        .filter(Product.owner_id == current_user.id)
    )

    if product_id:
        query = query.filter(SellerAlert.product_id == product_id)
    if priority:
        query = query.filter(SellerAlert.priority == priority.upper())
    if status:
        query = query.filter(SellerAlert.status == status)

    return query.order_by(SellerAlert.created_at.desc()).all()


@router.patch("/alerts/{alert_id}", response_model=AlertResponse)
@router.patch("/alerts/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(
    alert_id: int,
    req: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = (
        db.query(SellerAlert)
        .join(Product, SellerAlert.product_id == Product.id)
        .filter(
            SellerAlert.id == alert_id,
            Product.owner_id == current_user.id,
        )
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = req.status
    db.commit()
    db.refresh(alert)
    return alert
