import os
import re
import httpx
from bs4 import BeautifulSoup
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def format_feature(feature: str) -> str:
    # Replace spaces inside a feature with dashes, trim whitespace
    return "-".join(feature.strip().split())

async def search_qvc_product(title: str, features: list[str]) -> str:
    # Format features for URL
    formatted_features = [format_feature(f) for f in features]
    # Join title and features with "+"
    query = "+".join([title] + formatted_features)

    search_url = f"https://www.qvcuk.com/catalog/search.html?keyword={query}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(search_url)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")
    # Find first product link <a> with data-prod-id
    first_product_link = soup.find("a", attrs={"data-prod-id": True})
    if not first_product_link:
        raise ValueError("No products found in search results")

    product_url = first_product_link.get("href")
    product_id = first_product_link["data-prod-id"]

    # Return the product ID and the full URL to use/display if needed
    return product_id, product_url

async def fetch_product_info(product_id: str):
    url = f"https://api.qvc.com/api/sales/presentation/v3/uk/products/list/{product_id}?response-depth=full"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()

        product_data = data.get("products", {}).get(str(product_id), {})

        # Extract core product info
        title = product_data.get("shortDescription", "Unknown Product")
        brand = product_data.get("brandName", "Unknown Brand")
        canonical_url = product_data.get("canonicalURL", "")
        long_description = product_data.get("longDescription", "")

        # Prices
        pricing = product_data.get("pricing", {})
        price = pricing.get("currentMinimumSellingPrice")
        original_price = pricing.get("qvcMaximumPrice")  # Often the higher/crossed-out price

        # Clean and split long description
        raw_sentences = re.split(r'(?<=\.)\s+', long_description)
        features = [re.sub(r"<[^>]*>", "", sentence).strip() for sentence in raw_sentences if sentence.strip()]

        # Fetch additional HTML-based feature info
        attachments = product_data.get("assets", [])
        for attachment in attachments:
            if attachment.get("type") == "attachment" and attachment.get("typeCode") == "DSCLHTML":
                info_url = attachment.get("url")
                if info_url:
                    try:
                        html_response = await client.get(info_url)
                        html_response.raise_for_status()
                        soup = BeautifulSoup(html_response.text, "html.parser")

                        extra_features = [
                            tag.get_text(strip=True)
                            for tag in soup.select("ul li, p")
                            if tag.get_text(strip=True) and len(tag.get_text(strip=True)) > 30
                        ]

                        features.extend(extra_features)
                    except Exception as e:
                        print(f"Failed to fetch or parse additional info for {product_id}: {e}")

        # Collect images
        base_image_url = product_data.get("baseImageUrl", "")
        assets = product_data.get("assets", [])
        image_assets = [
            {
                "url": (a["url"] if a["url"].startswith("http")
                        else base_image_url + a["url"]),
                "typeCode": a.get("typeCode", "")
            }
            for a in assets
            if a.get("type") == "image"
        ]

        return {
            "product_id": product_id,
            "title": title,
            "brand": brand,
            "price": price,
            "original_price": original_price,
            "features": features,
            "images": image_assets,
            "canonical_url": canonical_url
        }

async def generate_marketing_copy(title: str, features: list[str]) -> str:
    prompt = f"""Write a compelling 100-word marketing copy for the following product for QVC UK social media.
    Write in a friendly, persuasive tone and highlight unique selling points of the product.
    Based on the type of product given take that into consideration when generating the marketing copy.

    Product: {title}
    Features: {", ".join(features)}"""

    response = await openai_client.chat.completions.create(
        model="gpt-4-1106-preview",
        messages=[
            {"role": "system", 
            "content": "You are a product marketing expert for QVC. " + 
            "Ensure to use the most up to date social media marketing practices and strategies. " + 
            "This is for social media use primarily youtube, instagram and tiktok."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.75,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()
