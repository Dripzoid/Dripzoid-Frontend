// src/components/ProductCard.jsx
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { AiOutlineTag, AiFillStar } from "react-icons/ai";
import { useWishlist } from "../contexts/WishlistContext.jsx"; // ✅ context

const API_BASE = process.env.REACT_APP_API_BASE;
const PLACEHOLDER = "https://via.placeholder.com/400";

/** Helper to get auth headers (same shape as your context) */
function getHeaders(isJson = true) {
  const headers = {};
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("userToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [wlBusy, setWlBusy] = useState(false);

  // Wishlist context (single source of truth)
  const {
    wishlist = [],
    addToWishlist,
    removeFromWishlist,
    fetchWishlist,
  } = useWishlist() || {};

  // Normalize product id
  const pid = String(
    product?.id ?? product?._id ?? product?.product_id ?? product?.productId ?? ""
  );

  // Check if wishlisted
  const isWishlisted = useMemo(() => {
    if (!pid) return false;
    return (wishlist || []).some(
      (w) =>
        String(
          w.product_id ?? w.id ?? w.productId ?? (w.product && w.product.id) ?? ""
        ) === pid
    );
  }, [wishlist, pid]);

  // ---- Reviews from server (compute average & count) ----
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const avgRating = useMemo(() => {
    if (!reviewsList || reviewsList.length === 0) return 0;
    const sum = reviewsList.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return sum / reviewsList.length;
  }, [reviewsList]);
  const reviewsCount = reviewsList.length;

  useEffect(() => {
    if (!pid) {
      setReviewsList([]);
      return;
    }

    const ac = new AbortController();
    const fetchReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await fetch(`${API_BASE}/api/reviews/product/${encodeURIComponent(pid)}`, {
          method: "GET",
          signal: ac.signal,
          headers: getHeaders(false), // no auth usually needed; safe to pass no JSON header
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${txt || res.statusText}`);
        }
        const rows = await res.json();
        // rows should be array of reviews per your reviews.js
        setReviewsList(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("Failed to fetch product reviews:", err);
        setReviewsError(err.message || "Failed to load reviews");
        setReviewsList([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
    return () => ac.abort();
  }, [pid]);

  // ---- Images & placeholder safe handling ----
  const images = useMemo(() => {
    const src = product?.images ?? product?.image ?? product?.thumbnail ?? "";
    if (Array.isArray(src)) return src.map(String).map((u) => u.trim()).filter(Boolean);
    if (typeof src === "string") {
      const trimmed = src.trim();
      if (!trimmed) return [];
      const parts = trimmed.includes(",") ? trimmed.split(",") : [trimmed];
      return parts.map((u) => u.trim()).filter(Boolean);
    }
    return [];
  }, [product]);

  useEffect(() => {
    setCurrent((idx) => (images.length && idx >= images.length ? 0 : idx));
  }, [images.length]);

  const [imageSrc, setImageSrc] = useState(() => images[0] || PLACEHOLDER);
  const [imageErrored, setImageErrored] = useState(false);

  useEffect(() => {
    const next = images[current] || PLACEHOLDER;
    setImageSrc(next);
    setImageErrored(false);
  }, [images, current]);

  const handleImgError = () => {
    if (imageErrored) return;
    setImageErrored(true);
    setImageSrc(PLACEHOLDER);
  };

  // ---- Pricing & stock helpers ----
  const parsePrice = (value) => {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[^0-9.]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const stock =
    typeof product?.stock === "number"
      ? product.stock
      : typeof product?.stock === "string" && product.stock !== ""
        ? Number(product.stock)
        : null;

  const price = parsePrice(product?.price);
  const originalPrice = parsePrice(product?.originalPrice ?? product?.oldPrice);
  const hasDiscount = originalPrice > price && originalPrice > 0;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const getStockBadge = () => {
    if (stock === null || stock === undefined) return null;
    if (stock <= 0) return { text: "Out of stock", tone: "bg-red-600 text-white" };
    if (stock <= 10) return { text: `Only ${stock} left`, tone: "bg-amber-600 text-black" };
    if (stock <= 20) return { text: "Only a few left", tone: "bg-amber-500 text-black" };
    return { text: "In stock", tone: "bg-green-600 text-white" };
  };
  const stockBadge = getStockBadge();

  // ---- Navigation ----
  const handleNavigate = () => {
    if (!pid) return;
    navigate(`/product/${pid}`);
  };

  // ---- Wishlist toggle (via context only) ----
  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    if (!pid || wlBusy) return;
    setWlBusy(true);
    try {
      if (isWishlisted) {
        if (typeof removeFromWishlist === "function") {
          await removeFromWishlist(pid);
          // ensure context list refreshed if needed
          if (typeof fetchWishlist === "function") await fetchWishlist();
        }
      } else {
        if (typeof addToWishlist === "function") {
          await addToWishlist(pid);
          if (typeof fetchWishlist === "function") await fetchWishlist();
        }
      }
    } catch (err) {
      console.warn("Wishlist toggle failed:", err);
    } finally {
      setWlBusy(false);
    }
  };

  if (!product) return null;

  // Use average rating from DB: display filled stars up to rounded average
  const avg = avgRating || 0;
  const avgRounded = Math.round(avg); // use rounded for star fill
  const reviewsNum = reviewsCount;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      className="group relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
      aria-label={`Open details for ${product?.name}`}
    >
      {/* Image carousel */}
      <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={`${current}-${imageSrc}`}
            src={imageSrc}
            alt={product?.name || "product image"}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28 }}
            loading="lazy"
            onError={handleImgError}
          />
        </AnimatePresence>

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wlBusy}
          className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 rounded-full p-2 shadow hover:scale-105 transition disabled:opacity-60"
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <FiHeart size={18} className={isWishlisted ? "text-red-500" : "text-gray-500"} />
        </button>

        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrent(idx);
                }}
                className={`w-2.5 h-2.5 rounded-full transition ${idx === current ? "bg-white scale-110" : "bg-white/60"}`}
                aria-label={`Show image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1">{product?.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{product?.category}</p>

        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold text-gray-900 dark:text-white">₹{price.toLocaleString()}</span>

          {hasDiscount && (
            <>
              <span className="text-sm line-through text-gray-500 dark:text-gray-400">₹{originalPrice.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-600 text-white">{discountPercent}% OFF</span>
            </>
          )}

          <AiOutlineTag className="text-green-500" />
        </div>

        {/* Rating (from DB via reviews endpoint) */}
        {reviewsNum > 0 ? (
          <div className="flex items-center text-yellow-500">
            {Array.from({ length: 5 }).map((_, idx) => (
              <AiFillStar
                key={idx}
                className={idx < avgRounded ? "opacity-100" : "opacity-30"}
              />
            ))}
            {/* numeric average beside stars */}
            <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">
              {avg.toFixed(1)}
            </span>
            {/* review count in parentheses */}
            <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
              ({reviewsNum})
            </span>
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            No Ratings &amp; Reviews
          </div>
        )}


        {/* Stock */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{product?.seller || "Seller"}</span>
          {stockBadge && <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge.tone}`}>{stockBadge.text}</div>}
        </div>
      </div>
    </div>
  );
}
