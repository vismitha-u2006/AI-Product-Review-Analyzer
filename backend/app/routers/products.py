from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ..database import get_db
from ..models.models import User, Product, Review
from ..schemas.schemas import ProductCreate, ProductResponse
from ..utils.auth import get_current_user

router = APIRouter(tags=["products"])


@router.post("/products", response_model=ProductResponse, status_code=201)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = Product(
        name=product_in.name,
        description=product_in.description,
        category=product_in.category,
        owner_id=current_user.id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        category=product.category,
        created_at=product.created_at,
        review_count=0,
    )


@router.get("/products", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.query(Product).filter(Product.owner_id == current_user.id).all()
    result = []
    for p in products:
        count = db.query(func.count(Review.id)).filter(Review.product_id == p.id).scalar()
        result.append(ProductResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            category=p.category,
            created_at=p.created_at,
            review_count=count or 0,
        ))
    return result


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    count = db.query(func.count(Review.id)).filter(Review.product_id == product.id).scalar()
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        category=product.category,
        created_at=product.created_at,
        review_count=count or 0,
    )
