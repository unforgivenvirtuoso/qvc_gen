from fastapi import FastAPI
from pydantic import BaseModel
from qvc import search_qvc_product, fetch_product_info, generate_marketing_copy
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProductInput(BaseModel):
    title: str
    features: list[str]

@app.post("/autogen")
async def auto_generate(data: ProductInput):
    try:
        print("Incoming request:", data.title, data.features)

        # Step 1: Search QVC product (get product_id and product_url)
        product_id, product_url = await search_qvc_product(data.title, data.features)
        print("Found product ID:", product_id)
        print("Product URL:", product_url)

        # Step 2: Fetch product info
        info = await fetch_product_info(product_id)
        print("Fetched product info:", info)

        # Step 3: Generate marketing copy
        copy = await generate_marketing_copy(info["title"], info["features"])
        print("Generated marketing copy.")

        # Return all required fields
        return {
            "product_id": info.get("product_id", ""),
            "title": info.get("title", ""),
            "brand": info.get("brand", ""),
            "price": info.get("price"),  # can be None
            "original_price": info.get("original_price"),  # can be None
            "features": info.get("features", []),
            "images": [img["url"] for img in info.get("images", [])],
            "marketing_copy": copy,
            "canonical_url": info.get("canonical_url", ""),
            "product_url": product_url
        }

    except Exception as e:
        print("Auto-generation failed:", str(e))
        return {"error": str(e)}
