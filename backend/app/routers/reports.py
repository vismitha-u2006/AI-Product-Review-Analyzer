from fastapi import APIRouter, Depends, HTTPException, Body, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os

from ..database import get_db
from ..models.models import User, Product, GeneratedReport
from ..schemas.schemas import ReportResponse
from ..utils.auth import get_current_user
from ..services.report_service import generate_pdf_report

router = APIRouter(tags=["reports"])


@router.post("/reports/generate", response_model=ReportResponse)
def create_report(
    product_id: Optional[int] = Query(None),
    payload: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_product_id = product_id
    if target_product_id is None and payload and isinstance(payload, dict):
        target_product_id = payload.get("product_id")
    product_id = target_product_id
    if product_id:
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == current_user.id,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    file_path = generate_pdf_report(
        product_id=product_id,
        user_id=current_user.id,
        db=db,
    )

    report_name = os.path.basename(file_path)
    report_record = GeneratedReport(
        user_id=current_user.id,
        product_id=product_id,
        report_name=report_name,
        file_path=file_path,
        report_type="pdf",
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    return report_record


@router.get("/reports", response_model=List[ReportResponse])
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(GeneratedReport)
        .filter(GeneratedReport.user_id == current_user.id)
        .order_by(GeneratedReport.created_at.desc())
        .all()
    )


@router.get("/reports/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.user_id == current_user.id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on server")

    return FileResponse(
        path=report.file_path,
        filename=report.report_name,
        media_type="application/pdf",
    )
