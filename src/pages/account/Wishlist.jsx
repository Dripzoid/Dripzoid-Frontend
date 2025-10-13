// src/pages/account/Wishlist.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Heart,
  Star,
  StarHalf,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../../contexts/WishlistContext";

const API_BASE = process.env.REACT_APP_API_BASE || "";

/** Normalize images field -> returns array of urls */
function parseImagesField(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((u) => u.trim()).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const parts = trimmed.includes(",") ? trimmed.split(",") : [trimmed];
    return parts.map((u) => u.trim()).filter(Boolean);
  }
  return [];
}

function renderStars(rating = 0) {
  const nodes = [];
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  for (let i = 0; i < full; i++) {
    nodes.push(<Star key={`full-${i}`} size={14} className="text-yellow-400" />);
  }
  if (hasHalf) {
    nodes.push(<StarHalf key="half" size={14} className="text-yellow-400" />);
  }
  while (nodes.length < 5) {
    nodes.push(<Star key={`empty-${nodes.length}`} size={14} className="text-gray-400/40" />);
  }
  return nodes;
}

const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString()}`;

export default function Wishlist() {
  const navigate = useNavigate();
  const { wishlist = [], fetchWishlist, removeFromWishlist } = useWishlist();

  const [selected, setSelected] = useState(new Set());
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetIds, setConfirmTargetIds] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof fetchWishlist === "function") await fetchWishlist();
      } catch (e) {
        console.warn("fetchWishlist error:", e);
      } finally {
        const timer = setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, 300);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemsWithMeta = useMemo(() => {
    return (wishlist || []).map((r) => {
      const product = {
        id: String(r.product_id ?? r.id ?? r.productId ?? ""),
        name: r.name ?? r.product_name ?? r.title ?? "Product",
        price: Number(r.price ?? 0),
        originalPrice: Number(r.originalPrice ?? r.oldPrice ?? 0),
        rating: r.rating ?? 0,
        reviews: r.reviews ?? 0,
        category: r.category ?? "",
        seller: r.seller ?? "",
        images: r.images ?? r.image ?? "",
      };
      const images = parseImagesField(product.images);
      const firstImage = images.length ? images[0] : "https://via.placeholder.com/400";
      const price = Number(product.price) || 0;
      const originalPrice = Number(product.originalPrice || 0) || 0;
      const hasDiscount = originalPrice > price && originalPrice > 0;
      const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
      const idKey = `${product.id}::${price}`;
      return { product, firstImage, price, originalPrice, hasDiscount, discountPercent, idKey };
    });
  }, [wishlist]);

  const toggleSelect = (idKey) => {
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(idKey)) copy.delete(idKey);
      else copy.add(idKey);
      return copy;
    });
  };

  const getHeaders = (isJson = true) => {
    const headers = {};
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("userToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (isJson) headers["Content-Type"] = "application/json";
    return headers;
  };

  const handleRemove = async (it) => {
    const pid = it.product?.id;
    if (!pid) return;
    setLoadingIds((s) => new Set(s).add(it.idKey));
    try {
      if (typeof removeFromWishlist === "function") {
        await removeFromWishlist(pid);
      } else {
        const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(pid)}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Remove failed");
        if (typeof fetchWishlist === "function") await fetchWishlist();
      }
    } catch (err) {
      console.error("Remove from wishlist failed", err);
      setError("Could not remove wishlist item");
    } finally {
      setLoadingIds((s) => {
        const copy = new Set(s);
        copy.delete(it.idKey);
        return copy;
      });
    }
  };

  const handleView = (it) => {
    if (!it?.product?.id) return;
    navigate(`/product/${encodeURIComponent(it.product.id)}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Wishlist</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Saved items — manage your favorites</p>
        </div>

        <button
          onClick={() => typeof fetchWishlist === "function" && fetchWishlist().catch((e) => console.warn(e))}
          className="px-3 py-2 rounded-md bg-black text-white text-sm flex items-center gap-2"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Skeleton Loaders */}
      {loading ? (
        <div className="grid gap-6 grid-cols-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900 animate-pulse"
            >
              <div className="w-28 h-28 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : itemsWithMeta.length === 0 ? (
        <div className="py-28 text-center text-gray-500 dark:text-gray-400">
          <Heart size={72} className="mx-auto mb-4 text-gray-600 dark:text-gray-300" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Your wishlist is empty</h3>
          <p className="max-w-md mx-auto text-gray-600 dark:text-gray-400">Tap the heart on any product to save it for later.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {itemsWithMeta.map((it) => (
            <motion.article
              key={it.idKey}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col md:flex-row items-center md:items-stretch gap-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handleView(it)}
            >
              {/* Image */}
              <div className="md:w-48 w-full h-48 md:h-auto rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                <img
                  src={it.firstImage}
                  alt={it.product?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://via.placeholder.com/400';
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between w-full">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{it.product?.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                    {it.product?.category || it.product?.seller}
                  </p>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1">{renderStars(it.product?.rating)}</div>
                    <span className="text-xs text-gray-400">({it.product?.reviews ?? 0})</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{fmtCurrency(it.price)}</div>
                    {it.hasDiscount && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs line-through text-gray-400">{fmtCurrency(it.originalPrice)}</div>
                        <div className="text-[11px] bg-black text-white dark:bg-white dark:text-black px-2 py-0.5 rounded-full">
                          {it.discountPercent}% OFF
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete icon (always icon-only) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(it);
                    }}
                    disabled={loadingIds.has(it.idKey)}
                    className="p-2 rounded-full border border-red-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Remove from wishlist"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {error && <div className="mt-4 text-sm text-red-500">Error: {error}</div>}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            aria-modal="true"
            role="dialog"
          >
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !confirmLoading && setConfirmOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.98, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 8, opacity: 0 }}
              className="relative z-10 max-w-md w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/20">
                    <AlertTriangle className="text-red-600" size={22} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Confirm deletion</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Are you sure you want to remove these items? This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => !confirmLoading && setConfirmOpen(false)}
                    className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200"
                    disabled={confirmLoading}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => confirmDelete()}
                    className="px-3 py-2 rounded-md bg-red-600 text-white text-sm disabled:opacity-60 flex items-center gap-2"
                    disabled={confirmLoading}
                  >
                    <Trash2 size={14} />
                    <span>{confirmLoading ? "Removing..." : "Remove"}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => !confirmLoading && setConfirmOpen(false)}
                className="absolute top-3 right-3 p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
                disabled={confirmLoading}
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
