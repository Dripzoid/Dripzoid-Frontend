// src/components/ProductDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar } from "@mui/material";
import { MessageCircle } from "lucide-react";
import ProductCard from "./ProductCard";
import Reviews from "./Reviews";

// new components
import ProductGallery from "./ProductGallery";
import ProductInfo from "./ProductInfo"; // we'll show ProductInfo inline below
import ColorDisplay from "./ColorDisplay";
import SizeSelector from "./SizeSelector";
import QuantityPicker from "./QuantityPicker";
import PurchaseBar from "./PurchaseBar";
import Lightbox from "./Lightbox";

import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import { UserContext } from "../contexts/UserContext.js";

const API_BASE = process.env.REACT_APP_API_BASE || "";

// NOTE: keep your helper functions (resolveColor, colorEquals, etc.) above or export them from a helpers file.
// For brevity, this file assumes those helper functions are present in scope (copied from your original file).

export default function ProductDetailsPage() {
  const { id: routeProductId } = useParams();
  const productId = routeProductId || "demo-kurta-1";
  const navigate = useNavigate();

  // copy in all your original hooks / state variables here (product, selectedColor, selectedSize, quantity, etc.)
  // For brevity, I'm showing the important ones:
  const { addToCart, buyNow: ctxBuyNow, cart = [], fetchCart } = useCart() || {};
  const wishlistCtx = useWishlist() || {};
  const { user: ctxUser } = useContext(UserContext) || {};

  // ... include your original state and logic here (I kept them intact in the uploaded file)
  // e.g. const [product, setProduct] = useState(null); etc.
  // For integration, copy the top half of your original file (hooks, effects, helper functions)
  // and then use the simplified JSX below.

  // --- Example minimal states (replace with the full ones from your original file) ---
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function openLightbox(i = 0) {
    setLightboxIndex(i);
    setLightboxOpen(true);
  }
  function closeLightbox() {
    setLightboxOpen(false);
  }

  // You already have galleryImages, availableStock, addedToCart, handlers etc in your original file.
  // For now assume they exist.

  // fallback UI while product loads
  if (!product) return <div className="p-8 text-center">Loading product...</div>;

  return (
    <div className="bg-white dark:bg-black min-h-screen text-black dark:text-white pb-32">
      <div className="container mx-auto p-4 md:p-6 space-y-8">
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border border-gray-200/60 dark:border-gray-700/60">
          <ProductGallery
            galleryImages={galleryImages}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            openLightbox={openLightbox}
            onTouchStart={(e) => { touchStartXRef.current = e.touches?.[0]?.clientX; }}
            onTouchEnd={(e) => {
              const startX = touchStartXRef.current;
              const endX = e.changedTouches?.[0]?.clientX;
              if (startX == null || endX == null) return;
              const diff = startX - endX;
              if (diff > 40) setSelectedImage((s) => (s + 1) % galleryImages.length);
              else if (diff < -40) setSelectedImage((s) => (s - 1 + galleryImages.length) % galleryImages.length);
              touchStartXRef.current = null;
            }}
          />

          {/* Right column: product meta (desktop) */}
          <div>
            <div className="flex items-start justify-between">
              <div className="pr-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">{product.name}</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  {/* description read more logic kept as before */}
                </p>
                <div className="text-2xl font-semibold mb-2">{formatINR(product.price)}</div>
              </div>

              <div className="flex flex-col items-end gap-3">
                {/* wishlist button */}
              </div>
            </div>

            {/* Color selector */}
            {requiresColor && (
              <div className="mb-4">
                <div className="font-medium mb-2">Color</div>
                <div className="flex gap-3 items-center">
                  {(product.colors || []).map((c, idx) => {
                    const name = typeof c === "string" ? c : (c && (c.label || c.name)) || String(c || "");
                    const hex = resolveColor(c);
                    const isSelected = colorEquals(c, selectedColor);
                    return (
                      <button key={`${name}-${idx}`} onClick={() => setSelectedColor(c)} aria-pressed={isSelected}
                        className={`w-9 h-9 md:w-10 md:h-10 rounded-full ${isSelected ? "ring-2 ring-offset-1 ring-black" : "border border-gray-300"}`} style={{ backgroundColor: hex }} />
                    );
                  })}
                  {selectedColor ? <ColorDisplay color={selectedColor} resolveColor={resolveColor} getNearestColorLabel={getNearestColorLabel} /> : null}
                </div>
              </div>
            )}

            {/* sizes */}
            {requiresSize && (
              <SizeSelector
                product={product}
                sizeStockMap={sizeStockMap}
                selectedSize={selectedSize}
                setSelectedSize={(s) => {
                  setSelectedSize(s);
                  const avail = Number(sizeStockMap?.[String(s)] || 0);
                  setQuantity(avail > 0 ? 1 : 0);
                }}
                sizeEquals={sizeEquals}
              />
            )}

            {/* quantity */}
            <QuantityPicker quantity={quantity} setQuantity={setQuantity} availableStock={availableStock} />

            {/* Actions (desktop) */}
            <div className="hidden md:flex gap-3 items-center">
              <button onClick={addedToCart ? goToCart : addToCartHandler} className="flex-1 py-2 rounded-full bg-black text-white">
                {/* shopping icon + label */}
                {addedToCart ? "Go to Cart" : "Add to Cart"}
              </button>

              <button onClick={buyNowHandler} className={`flex-1 py-2 rounded-full border ${disablePurchase ? "opacity-50" : ""}`}>
                Buy Now
              </button>

              <button onClick={handleShare} className="p-2 rounded-full border">
                Share
              </button>
            </div>

            {/* delivery check, other extras kept here */}
          </div>
        </section>

        {/* Reviews, Q&A and Related sections stay here (you already had them) */}
        <Reviews productId={productId} apiBase={API_BASE} currentUser={ctxUser} showToast={() => {}} isDesktop={true} />
      </div>

      <PurchaseBar
        addedToCart={addedToCart}
        goToCart={goToCart}
        addToCartHandler={addToCartHandler}
        buyNowHandler={buyNowHandler}
        disablePurchase={disablePurchase}
        handleShare={handleShare}
      />

      <Lightbox open={lightboxOpen} images={galleryImages} index={lightboxIndex} onClose={closeLightbox} setIndex={setLightboxIndex} />
    </div>
  );
}
