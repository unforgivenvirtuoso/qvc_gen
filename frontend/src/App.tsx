import React, { useState, useEffect } from "react";
import './App.css'

const QvcGen: React.FC = () => {
  const [title, setTitle] = useState("");
  const [features, setFeatures] = useState("");
  const [marketingCopy, setMarketingCopy] = useState("");
  const [displayedCopy, setDisplayedCopy] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    console.log("Generate button clicked");
    setLoading(true);
    setMarketingCopy("");
    setDisplayedCopy("");
    setImages([]);
    setCopied(false);

    const fetchedTitle = title.trim();
    const fetchedFeatures = features.trim();

    try {
      const response = await fetch("http://localhost:8000/autogen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: fetchedTitle,
          features: fetchedFeatures.split("\n").filter((f) => f.trim() !== ""),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }

      const data = await response.json();
      console.log("API response:", data); // 🔍 Log full response

      if (data.marketing_copy) {
        setMarketingCopy(data.marketing_copy);
      } else {
        throw new Error("No marketing copy returned");
      }

      // 🖼 Safely set images if available
      const imageList = data.images || data.product_images || [];
      if (Array.isArray(imageList)) {
        setImages(imageList);
      } else {
        console.warn("No images returned or not an array", data.images);
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
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
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

      {/* 🖼 Display product images below marketing copy */}
      {images.length > 0 && (
        <div className="card image-card-wrapper">
          <h2>Product Images</h2>
          <div className="image-grid">
            {images.map((img, idx) => (
              <div key={idx} className="image-card">
                <img
                  src={img}
                  alt={`Product ${idx + 1}`}
                  className="product-image"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QvcGen;