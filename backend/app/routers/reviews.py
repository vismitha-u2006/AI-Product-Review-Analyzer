from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import pandas as pd
import io
import re
from datetime import datetime

try:
    import docx
except ImportError:
    docx = None

from ..database import get_db
from ..models.models import User, Review, Product
from ..schemas.schemas import ReviewCreate, ReviewResponse, BulkUploadResponse
from ..utils.auth import get_current_user

router = APIRouter(tags=["reviews"])


def parse_reviews_from_text(raw_text: str) -> List[Dict[str, Any]]:
    """Intelligently parse individual customer reviews from raw document text."""
    if raw_text.startswith("\ufeff"):
        raw_text = raw_text[1:]

    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # Check for numbered review prefixes (e.g. "Review 1:", "1. ", "Review #2 - ")
    review_num_pattern = re.compile(
        r'(?:^|\n)(?:Review\s*#?\d+[:\-\.]?|\d+[\.\)]\s+)(.*?)(?=(?:\n(?:Review\s*#?\d+[:\-\.]?|\d+[\.\)]\s+)|\Z))',
        re.DOTALL | re.IGNORECASE
    )
    matches = review_num_pattern.findall(text)

    entries: List[str] = []
    if len(matches) >= 2:
        entries = [m.strip() for m in matches if m.strip()]
    elif "\n\n" in text:
        # Paragraph blocks separated by blank lines
        blocks = re.split(r'\n\s*\n+', text)
        entries = [b.strip() for b in blocks if b.strip()]
    else:
        # Line by line or bullet points
        lines = [l.strip() for l in text.split("\n")]
        current: List[str] = []
        for l in lines:
            if not l:
                if current:
                    entries.append(" ".join(current))
                    current = []
                continue
            if re.match(r'^[-*•]\s+', l) and current:
                entries.append(" ".join(current))
                current = [re.sub(r'^[-*•]\s+', '', l)]
            else:
                current.append(re.sub(r'^[-*•]\s+', '', l))
        if current:
            entries.append(" ".join(current))

    if not entries and text.strip():
        entries = [text.strip()]

    parsed: List[Dict[str, Any]] = []
    for entry in entries:
        cleaned = entry.strip()
        if len(cleaned) < 5:
            continue

        # Skip document title headers
        if re.match(r'^(customer\s+reviews?|product\s+reviews?|reviews?|feedback|notes?)\s*:?$', cleaned, re.IGNORECASE):
            continue

        rating = None
        rating_match = re.search(
            r'(?:rating|stars?|score)[:\s]*([1-5](?:\.[0-9])?)(?:\s*/\s*5)?',
            cleaned,
            re.IGNORECASE
        )
        if rating_match:
            try:
                rating = float(rating_match.group(1))
            except Exception:
                pass

        reviewer_id = None
        reviewer_match = re.search(
            r'(?:reviewer|user|author|customer|reviewer_id)[:\s]*([a-zA-Z0-9_\-]+)',
            cleaned,
            re.IGNORECASE
        )
        if reviewer_match:
            reviewer_id = reviewer_match.group(1).strip()

        # Clean metadata lines from review text body
        text_without_metadata = re.sub(
            r'(?:^|\n)(?:rating|stars?|score)[:\s]*[1-5](?:\.[0-9])?(?:\s*/\s*5)?',
            '',
            cleaned,
            flags=re.IGNORECASE
        )
        text_without_metadata = re.sub(
            r'(?:^|\n)(?:reviewer|user|author|customer|reviewer_id)[:\s]*[a-zA-Z0-9_\-]+',
            '',
            text_without_metadata,
            flags=re.IGNORECASE
        )
        text_without_metadata = re.sub(
            r'^(?:review\s*#?\d+[:\-\.]?|\d+[\.\)]\s+)',
            '',
            text_without_metadata.strip(),
            flags=re.IGNORECASE
        ).strip()

        final_text = text_without_metadata if len(text_without_metadata) >= 5 else cleaned

        parsed.append({
            "text": final_text,
            "rating": rating,
            "reviewer_id": reviewer_id,
        })

    return parsed


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract paragraphs and tables from Microsoft Word (.docx)."""
    if not docx:
        raise HTTPException(status_code=500, detail="python-docx library not installed on server")
    doc = docx.Document(io.BytesIO(file_bytes))
    paragraphs: List[str] = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if t:
            paragraphs.append(t)
    for table in doc.tables:
        for row in table.rows:
            cell_texts = [c.text.strip() for c in row.cells if c.text.strip()]
            if cell_texts:
                paragraphs.append(" - ".join(cell_texts))
    return "\n\n".join(paragraphs)


def extract_text_from_doc(file_bytes: bytes) -> str:
    """Extract text from Microsoft Word (.doc) with fallbacks."""
    if docx:
        try:
            return extract_text_from_docx(file_bytes)
        except Exception:
            pass
    try:
        return file_bytes.decode('utf-8')
    except Exception:
        pass
    try:
        decoded = file_bytes.decode('latin-1', errors='ignore')
        chunks = re.findall(r'[\w\s.,!?\'"\-:;()/\n]{10,}', decoded)
        return "\n\n".join(c.strip() for c in chunks if len(c.strip()) > 15)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read Word .doc file: {e}")


@router.post("/reviews", response_model=ReviewResponse, status_code=201)
def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.id == review_in.product_id,
        Product.owner_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    review = Review(
        product_id=review_in.product_id,
        original_text=review_in.original_text,
        rating=review_in.rating,
        review_date=review_in.review_date,
        reviewer_id=review_in.reviewer_id,
        source=review_in.source or "manual",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.post("/reviews/bulk-upload", response_model=BulkUploadResponse)
@router.post("/reviews/upload-document", response_model=BulkUploadResponse)
@router.post("/reviews/upload", response_model=BulkUploadResponse)
async def bulk_upload_reviews(
    file: UploadFile = File(...),
    product_id: Optional[int] = Form(None),
    product_id_query: Optional[int] = Query(None, alias="product_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_product_id = product_id or product_id_query
    if not target_product_id:
        raise HTTPException(status_code=400, detail="product_id is required either as form data or query parameter")

    # Verify product ownership
    product = db.query(Product).filter(
        Product.id == target_product_id,
        Product.owner_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    contents = await file.read()
    filename = (file.filename or "reviews.txt").lower()
    errors = []
    success = 0
    total = 0

    # 1. Notepad / Text Document (.txt)
    if filename.endswith(".txt"):
        try:
            try:
                raw_text = contents.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    raw_text = contents.decode("cp1252")
                except UnicodeDecodeError:
                    raw_text = contents.decode("latin-1", errors="ignore")

            parsed_list = parse_reviews_from_text(raw_text)
            total = len(parsed_list)

            for idx, item in enumerate(parsed_list):
                try:
                    review = Review(
                        product_id=target_product_id,
                        original_text=item["text"],
                        rating=item.get("rating"),
                        reviewer_id=item.get("reviewer_id") or f"NOTEPAD-{idx+1:03d}",
                        source="notepad_document",
                    )
                    db.add(review)
                    success += 1
                except Exception as e:
                    errors.append(f"Review #{idx+1}: {str(e)}")

            db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Notepad (.txt) file: {e}")

    # 2. Word Document (.docx, .doc)
    elif filename.endswith((".docx", ".doc")):
        try:
            if filename.endswith(".docx"):
                raw_text = extract_text_from_docx(contents)
            else:
                raw_text = extract_text_from_doc(contents)

            parsed_list = parse_reviews_from_text(raw_text)
            total = len(parsed_list)

            for idx, item in enumerate(parsed_list):
                try:
                    review = Review(
                        product_id=target_product_id,
                        original_text=item["text"],
                        rating=item.get("rating"),
                        reviewer_id=item.get("reviewer_id") or f"WORD-{idx+1:03d}",
                        source="word_document",
                    )
                    db.add(review)
                    success += 1
                except Exception as e:
                    errors.append(f"Review #{idx+1}: {str(e)}")

            db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Word document: {e}")

    # 3. Tabular formats (.csv, .xlsx, .xls) for backwards compatibility
    elif filename.endswith((".csv", ".xlsx", ".xls")):
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(contents))
            else:
                df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File parsing error: {e}")

        for idx, row in df.iterrows():
            total += 1
            try:
                text = str(row.get("review_text") or row.get("text") or row.get("review") or "").strip()
                if not text:
                    errors.append(f"Row {idx+1}: missing review text")
                    continue

                rating = None
                for col in ["rating", "score", "stars"]:
                    if col in row and pd.notna(row[col]):
                        try:
                            rating = float(row[col])
                            break
                        except (ValueError, TypeError):
                            pass

                reviewer_id = str(row.get("reviewer_id") or row.get("reviewer") or "").strip() or None

                review_date = None
                for col in ["date", "review_date", "created_at"]:
                    if col in row and pd.notna(row[col]):
                        try:
                            review_date = pd.to_datetime(row[col]).to_pydatetime()
                            break
                        except Exception:
                            pass

                review = Review(
                    product_id=target_product_id,
                    original_text=text,
                    rating=rating,
                    reviewer_id=reviewer_id,
                    review_date=review_date,
                    source="document_upload",
                )
                db.add(review)
                success += 1
            except Exception as e:
                errors.append(f"Row {idx+1}: {str(e)}")

        db.commit()

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported document type. Please upload a Word document (.docx, .doc) or Notepad text file (.txt)."
        )

    return BulkUploadResponse(
        total=total,
        success=success,
        failed=total - success,
        errors=errors[:20],
    )


@router.get("/reviews", response_model=List[ReviewResponse])
def list_reviews(
    product_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Review).join(Product).filter(Product.owner_id == current_user.id)
    if product_id:
        query = query.filter(Review.product_id == product_id)
    return query.offset(skip).limit(limit).all()


@router.get("/reviews/{review_id}", response_model=ReviewResponse)
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = db.query(Review).join(Product).filter(
        Review.id == review_id,
        Product.owner_id == current_user.id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review
