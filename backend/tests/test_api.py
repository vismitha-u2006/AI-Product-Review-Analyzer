import os
import sys
import io
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import Base, engine

client = TestClient(app)

# Global test state
test_token = None
test_product_id = None
test_review_id = None


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_user_registration_and_login():
    global test_token

    import time
    unique_suffix = str(int(time.time()))
    reg_payload = {
        "email": f"testuser_{unique_suffix}@example.com",
        "username": f"testuser_{unique_suffix}",
        "password": "SecurePassword123!",
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code in [200, 201]
    assert "access_token" in reg_res.json()
    test_token = reg_res.json()["access_token"]

    login_res = client.post(
        "/api/auth/login",
        json={"email": reg_payload["email"], "password": reg_payload["password"]},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    test_token = data["access_token"]


def test_create_and_get_product():
    global test_product_id
    headers = {"Authorization": f"Bearer {test_token}"}

    prod_payload = {
        "name": "Test Wireless Earbuds Alpha",
        "description": "True wireless noise cancelling earbuds",
        "category": "Audio",
    }
    create_res = client.post("/api/products", json=prod_payload, headers=headers)
    assert create_res.status_code in [200, 201]
    data = create_res.json()
    assert data["name"] == prod_payload["name"]
    test_product_id = data["id"]
    assert test_product_id is not None

    list_res = client.get("/api/products", headers=headers)
    assert list_res.status_code == 200
    assert any(p["id"] == test_product_id for p in list_res.json())


def test_review_submission():
    global test_review_id
    headers = {"Authorization": f"Bearer {test_token}"}

    rev_payload = {
        "product_id": test_product_id,
        "original_text": "The sound quality is incredible and battery life lasts all day. Highly recommended!",
        "rating": 5.0,
        "reviewer_id": "TEST-USER-1",
        "source": "manual",
    }
    res = client.post("/api/reviews", json=rev_payload, headers=headers)
    assert res.status_code in [200, 201]
    data = res.json()
    assert data["product_id"] == test_product_id
    test_review_id = data["id"]


def test_ai_translation_endpoint():
    res = client.post("/api/translate", json={"text": "La batería es excelente.", "target_language": "en"})
    assert res.status_code == 200
    data = res.json()
    assert "translated_text" in data
    assert "detected_language" in data


def test_ai_sentiment_endpoint():
    res = client.post("/api/sentiment", json={"text": "The camera quality is superb, love this smartphone!"})
    assert res.status_code == 200
    data = res.json()
    assert data["sentiment"] in ["positive", "neutral", "negative"]
    assert "confidence" in data
    assert "score" in data


def test_ai_fake_detection_endpoint():
    res = client.post(
        "/api/fake-detection",
        json={"text": "BEST PRODUCT EVER 5 STARS BUY IT NOW HIGHLY RECOMMEND AMAZING PERFECT PRODUCT!!!!!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["label"] in ["suspicious", "genuine", "insufficient_evidence"]
    assert "confidence" in data
    assert isinstance(data["reasons"], list)
    assert len(data["reasons"]) > 0


def test_ai_aspect_analysis_endpoint():
    res = client.post(
        "/api/aspect-analysis",
        json={"text": "The camera quality is excellent, but the battery drains quickly."},
    )
    assert res.status_code == 200
    data = res.json()
    assert "aspects" in data
    aspect_names = [a["aspect"].lower() for a in data["aspects"]]
    assert any("camera" in a or "battery" in a for a in aspect_names)


def test_bulk_csv_upload():
    headers = {"Authorization": f"Bearer {test_token}"}
    csv_content = b"text,rating,reviewer_id\n\"Great battery life\",5,CSV-001\n\"Screen is dim\",2,CSV-002\n"

    res = client.post(
        "/api/reviews/bulk-upload",
        data={"product_id": test_product_id},
        files={"file": ("test_reviews.csv", csv_content, "text/csv")},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] >= 1


def test_notepad_document_upload():
    headers = {"Authorization": f"Bearer {test_token}"}
    txt_content = (
        b"Review 1: The camera quality is fantastic, highly recommend it! Rating: 5\n\n"
        b"Review 2: Battery drains too fast after latest update. Rating: 2\n\n"
        b"Review 3: Build quality is okay for the price."
    )

    res = client.post(
        "/api/reviews/bulk-upload",
        data={"product_id": test_product_id},
        files={"file": ("customer_reviews.txt", txt_content, "text/plain")},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] == 3


def test_word_document_upload():
    import docx
    headers = {"Authorization": f"Bearer {test_token}"}
    doc = docx.Document()
    doc.add_heading("Customer Reviews", 0)
    doc.add_paragraph("The display is gorgeous and sound is loud. Rating: 5")
    doc.add_paragraph("Disappointed with the charger, it broke after two days. Rating: 1")
    buf = io.BytesIO()
    doc.save(buf)

    res = client.post(
        "/api/reviews/bulk-upload",
        data={"product_id": test_product_id},
        files={
            "file": (
                "feedback.docx",
                buf.getvalue(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] == 2


def test_analysis_pipeline_execution():
    headers = {"Authorization": f"Bearer {test_token}"}
    res = client.post("/api/analyze", json={"product_id": test_product_id}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "sentiment" in data[0]


def test_seller_alerts_endpoint():
    headers = {"Authorization": f"Bearer {test_token}"}
    res = client.get("/api/alerts", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_product_comparison_endpoint():
    headers = {"Authorization": f"Bearer {test_token}"}
    prod2_res = client.post(
        "/api/products",
        json={"name": "Comparison Competitor Y", "category": "Audio"},
        headers=headers,
    )
    assert prod2_res.status_code in [200, 201]
    p2_id = prod2_res.json()["id"]

    res = client.post("/api/compare", json={"product_ids": [test_product_id, p2_id]}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "products" in data
    assert len(data["products"]) == 2


def test_dashboard_stats_and_charts():
    headers = {"Authorization": f"Bearer {test_token}"}

    stats_res = client.get("/api/dashboard/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_reviews" in stats
    assert "positive_reviews" in stats
    assert "avg_sentiment_score" in stats

    charts_res = client.get("/api/dashboard/charts", headers=headers)
    assert charts_res.status_code == 200
    charts = charts_res.json()
    assert "sentiment_distribution" in charts
    assert "review_trends" in charts


def test_pdf_report_generation():
    headers = {"Authorization": f"Bearer {test_token}"}
    res = client.post(f"/api/reports/generate?product_id={test_product_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "file_path" in data
    assert os.path.exists(data["file_path"])

    report_id = data["id"]
    dl_res = client.get(f"/api/reports/{report_id}/download", headers=headers)
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
