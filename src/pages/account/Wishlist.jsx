// src/pages/account/Wishlist.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Heart, Star, StarHalf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../../contexts/WishlistContext";

const API_BASE = process.env.REACT_APP_API_BASE || "";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof fetchWishlist === "function") {
      fetchWishlist().catch((e) => console.warn("fetchWishlist error:", e));
    }
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
        wishlistRowId: r.id,
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

  const selectAll = () => setSelected(new Set(itemsWithMeta.map((it) => it.idKey)));
  const clearSelection = () => setSelected(new Set());

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
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
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

  const handleRemoveSelected = async () => {
    const keys = Array.from(selected);
    if (keys.length === 0) return;
    const productIds = keys
      .map((k) => itemsWithMeta.find((x) => x.idKey === k))
      .filter(Boolean)
      .map((x) => x.product.id);

    if (!productIds.length) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/wishlist/bulk`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ productIds }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `${res.status} ${res.statusText}`);
      }
      if (typeof fetchWishlist === "function") await fetchWishlist();
      clearSelection();
    } catch (err) {
      console.error("Bulk delete failed", err);
      setError("Could not remove selected items");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (it) => {
    const id = it.product?.id;
    if (id) navigate(`/product/${id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Wishlist</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Saved items — manage your favorites</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={selectAll}
            className="px-3 py-2 rounded-md bg-black text-white text-sm hover:opacity-95"
          >
            Select all
          </button>

          <button
            onClick={handleRemoveSelected}
            disabled={selected.size === 0 || loading}
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 bg-transparent disabled:opacity-50"
          >
            Remove selected
          </button>

          <button
            onClick={() => {
              if (itemsWithMeta.length === 0) return;
              const pids = itemsWithMeta.map((it) => it.product.id);
              setLoading(true);
              (async () => {
                try {
                  const res = await fetch(`${API_BASE}/api/wishlist/bulk`, {
                    method: "DELETE",
                    headers: getHeaders(),
                    body: JSON.stringify({ productIds: pids }),
                  });
                  if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    throw new Error(json?.error || `${res.status} ${res.statusText}`);
                  }
                  if (typeof fetchWishlist === "function") await fetchWishlist();
                  clearSelection();
                } catch (err) {
                  console.error("Clear wishlist failed", err);
                  setError("Could not clear wishlist");
                } finally {
                  setLoading(false);
                }
              })();
            }}
            disabled={itemsWithMeta.length === 0 || loading}
            className="px-3 py-2 rounded-md border border-red-700 text-sm text-red-600 hover:bg-red-900/5 disabled:opacity-50"
          >
            <Trash2 size={14} />
            <span className="ml-2">Clear</span>
          </button>
        </div>
      </div>

      {loading && !itemsWithMeta.length ? (
        <div className="py-28 text-center text-gray-400">Loading wishlist…</div>
      ) : itemsWithMeta.length === 0 ? (
        <div className="py-28 text-center text-gray-400">
          <Heart size={64} className="mx-auto mb-4 text-gray-600 dark:text-gray-300" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Your wishlist is empty</h3>
          <p className="max-w-md mx-auto text-gray-600 dark:text-gray-300">Tap the heart on any product to save it here for later.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {itemsWithMeta.map((it) => (
                <motion.article
                  key={it.idKey}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  whileHover={{ translateY: -6, boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
                  className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-lg transition cursor-pointer flex flex-col"
                  onClick={() => handleView(it)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                      <img
                        src={it.firstImage}
                        alt={it.product?.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://via.placeholder.com/400";
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate" title={it.product?.name}>
                        {it.product?.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{it.product?.category || it.product?.seller}</p>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center gap-1">{renderStars(it.product?.rating)}</div>
                        <span className="text-xs text-gray-400">({it.product?.reviews ?? 0})</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(it.idKey);
                        }}
                        aria-pressed={selected.has(it.idKey)}
                        aria-label={selected.has(it.idKey) ? "Deselect item" : "Select item"}
                        role="checkbox"
                        aria-checked={selected.has(it.idKey)}
                        className={
                          "w-6 h-6 flex items-center justify-center rounded-sm border-2 " +
                          (selected.has(it.idKey)
                            ? "bg-black text-white border-black"
                            : "bg-transparent border-gray-300 text-gray-700")
                        }
                      >
                        {selected.has(it.idKey) ? "✓" : ""}
                      </button>

                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{fmtCurrency(it.price)}</div>
                        {it.hasDiscount && (
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <div className="text-xs line-through text-gray-400">{fmtCurrency(it.originalPrice)}</div>
                            <div className="text-[11px] bg-gray-900 text-white px-2 py-0.5 rounded-full">{it.discountPercent}% OFF</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Added: <span className="font-medium text-gray-900 dark:text-white">{it.product?.created_at ? new Date(it.product.created_at).toLocaleDateString() : "—"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemove(it)}
                        disabled={loadingIds.has(it.idKey)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-700 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        <span>{loadingIds.has(it.idKey) ? "Removing..." : "Remove"}</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <strong>{itemsWithMeta.length}</strong> item{itemsWithMeta.length !== 1 ? "s" : ""}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={clearSelection}
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200"
              >
                Clear selection
              </button>

              <button
                onClick={() => {
                  if (typeof fetchWishlist === "function") fetchWishlist().catch((e) => console.warn(e));
                }}
                className="px-3 py-2 rounded-md bg-black text-white text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </>
      )}

      {error && <div className="mt-4 text-sm text-red-500">Error: {error}</div>}
    </div>
  );
}
