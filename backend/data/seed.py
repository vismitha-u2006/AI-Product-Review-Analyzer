import json
import os
import sys
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, engine
from app.models.models import Base, User, Product, Review, AnalysisResult, AspectResult, SellerAlert
from app.utils.auth import hash_password
from app.services.translation_service import translate_to_english
from app.services.sentiment_service import analyze_sentiment
from app.services.fake_review_service import analyze_fake_review
from app.services.absa_service import analyze_aspects
from app.services.alert_service import check_and_generate_alerts


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if demo user exists
        demo_user = db.query(User).filter(User.email == "demo@example.com").first()
        if not demo_user:
            print("Creating demo user: demo@example.com / DemoPassword123!")
            demo_user = User(
                email="demo@example.com",
                username="demouser",
                hashed_password=hash_password("DemoPassword123!"),
                is_active=True,
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
        else:
            print("Demo user already exists.")

        # Load sample reviews
        json_path = os.path.join(os.path.dirname(__file__), "sample_reviews.json")
        with open(json_path, "r", encoding="utf-8") as f:
            sample_data = json.load(f)

        for prod_info in sample_data:
            product = db.query(Product).filter(
                Product.name == prod_info["product_name"],
                Product.owner_id == demo_user.id
            ).first()

            if not product:
                print(f"Adding product: {prod_info['product_name']}")
                product = Product(
                    name=prod_info["product_name"],
                    description=prod_info.get("description"),
                    category=prod_info.get("category"),
                    owner_id=demo_user.id,
                )
                db.add(product)
                db.commit()
                db.refresh(product)

            # Reviews for this product
            existing_revs = {r.original_text for r in db.query(Review).filter(Review.product_id == product.id).all()}
            all_texts = [r["text"] for r in prod_info["reviews"]]

            for r_data in prod_info["reviews"]:
                text = r_data["text"]
                if text in existing_revs:
                    continue

                # Translate if foreign
                trans_res = translate_to_english(text)
                analyzed_text = trans_res["translated_text"] if trans_res["was_translated"] else text

                rev = Review(
                    product_id=product.id,
                    reviewer_id=r_data.get("reviewer_id"),
                    original_text=text,
                    translated_text=trans_res["translated_text"] if trans_res["was_translated"] else None,
                    original_language=trans_res["detected_language"],
                    rating=r_data.get("rating"),
                    source="sample",
                )
                db.add(rev)
                db.commit()
                db.refresh(rev)

                # Sentiment
                sent_res = analyze_sentiment(analyzed_text)
                # Fake Detection
                fake_res = analyze_fake_review(analyzed_text, [t for t in all_texts if t != text])
                # ABSA
                absa_list = analyze_aspects(analyzed_text)

                analysis = AnalysisResult(
                    review_id=rev.id,
                    product_id=product.id,
                    sentiment=sent_res["sentiment"],
                    sentiment_score=sent_res["score"],
                    sentiment_confidence=sent_res["confidence"],
                    is_suspicious=fake_res["is_suspicious"],
                    fake_confidence=fake_res["confidence"],
                    fake_reasons=fake_res["reasons"],
                    fake_label=fake_res["label"],
                    aspect_results=absa_list,
                    language_confidence=trans_res.get("language_confidence", 0.95),
                )
                db.add(analysis)
                db.commit()
                db.refresh(analysis)

                for asp in absa_list:
                    asp_record = AspectResult(
                        analysis_id=analysis.id,
                        aspect=asp["aspect"],
                        sentiment=asp["sentiment"],
                        confidence=asp["confidence"],
                        text_snippet=asp.get("text_snippet"),
                    )
                    db.add(asp_record)
                db.commit()

            # Check and generate alerts for the product
            alerts = check_and_generate_alerts(product.id, db)
            if alerts:
                print(f"Generated {len(alerts)} alerts for {product.name}")

        print(">>> Database seeded successfully with realistic products, reviews, analyses, and alerts! <<<")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
