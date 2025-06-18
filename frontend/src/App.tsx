import React, { useState, useEffect } from "react";
import './App.css';

const QvcGen: React.FC = () => {
  const [title, setTitle] = useState("");
  const [featuresInput, setFeaturesInput] = useState("");

  const [product_id, setProductId] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [original_price, setOriginalPrice] = useState<number | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [canonical_url, setCanonicalUrl] = useState("");

  const [marketingCopy, setMarketingCopy] = useState("");
  const [displayedCopy, setDisplayedCopy] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setMarketingCopy("");
    setDisplayedCopy("");
    setImages([]);
    setCopied(false);

    setProductId("");
    setTitle("");
    setBrand("");
    setPrice(null);
    setOriginalPrice(null);
    setFeatures([]);
    setCanonicalUrl("");

    try {
      const response = await fetch("http://localhost:8000/autogen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          features: featuresInput.trim().split("\n").filter((f) => f.trim() !== ""),
        }),
      });

      if (!response.ok) throw new Error(`Backend error: ${await response.text()}`);

      const data = await response.json();
      console.log("API response:", data);

      if (data.marketing_copy) setMarketingCopy(data.marketing_copy);

      setProductId(data.product_id || "");
      setTitle(data.title || "");
      setBrand(data.brand || "");
      setPrice(typeof data.price === "number" ? data.price : null);
      setOriginalPrice(typeof data.original_price === "number" ? data.original_price : null);
      setCanonicalUrl(data.canonical_url || "");

      setFeatures(Array.isArray(data.features) ? data.features : []);

      if (Array.isArray(data.images)) {
        const imageUrls = data.images
          .map((img: any) => typeof img === "string" ? img : img.url || "")
          .filter((url: string) => url.length > 0);
        setImages(imageUrls);
      } else {
        setImages([]);
      }

    } catch (error) {
      console.error("Error during LLM generation:", error);
      setMarketingCopy("Failed to generate marketing copy. Please try again.");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (marketingCopy) {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayedCopy((prev) => prev + marketingCopy.charAt(index));
        index++;
        if (index >= marketingCopy.length) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }
  }, [marketingCopy]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(marketingCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  console.log({ product_id, title, brand, price, original_price, features, canonical_url });

  return (
    <div className="container">
      <h1>QVC Gen</h1>

      <div className="card">
        <input
          className="input"
          placeholder="Enter product title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="textarea"
          rows={6}
          placeholder="Enter features (one per line)..."
          value={featuresInput}
          onChange={(e) => setFeaturesInput(e.target.value)}
        ></textarea>
        <button className="button" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Copy"}
        </button>
      </div>

      <div className="card result">
        <h2>Generated Marketing Copy:</h2>
        <p>{displayedCopy || "Your copy will appear here..."}</p>
        {marketingCopy && (
          <button className="button" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        )}
      </div>

      {images.length > 0 && (
        <div className="card image-card-wrapper">
          <h2>Product Images</h2>
          <div className="image-grid">
            {images.map((img, idx) => (
              <div key={idx} className="image-card">
                <img src={img} alt={`Product ${idx + 1}`} className="product-image" />
              </div>
            ))}
          </div>
        </div>
      )}

      {displayedCopy && (
        <div className="card additional-info-card">
          <h2>Additional Product Info</h2>
          <p><strong>Product Name:</strong> {title || "N/A"}</p>
          <p><strong>Brand:</strong> {brand || "N/A"}</p>
          <p><strong>Product ID:</strong> {product_id || "N/A"}</p>
          <p><strong>Current Price:</strong> {typeof price === "number" && !isNaN(price) ? `£${price.toFixed(2)}` : "N/A"}</p>
          <p><strong>Original Price:</strong> {typeof original_price === "number" && !isNaN(original_price) ? <s>£{original_price.toFixed(2)}</s> : "N/A"}</p>

          {canonical_url ? (
            <a href={canonical_url} target="_blank" rel="noopener noreferrer">
              <button className="button">View Product</button>
            </a>
          ) : (
            <p><em>No product link available</em></p>
          )}

          {features.length > 0 ? (
            <>
              <h3>Features:</h3>
              <ul>
                {features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>No features available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default QvcGen;