// src/pages/account/Wishlist.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Heart, Star, StarHalf } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "../../contexts/CartContext"; // adjust path if needed
import { useWishlist } from "../../contexts/WishlistContext"; // ensure correct path

const API_BASE = process.env.REACT_APP_API_BASE;

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
    nodes.push(<Star key={`empty-${nodes.length}`} size={14} className="text-gray-600/40" />);
  }
  return nodes;
}

export default function Wishlist() {
  const navigate = useNavigate();

  // Cart context (for checking existing items / updating quantities)
  const { cart = [], fetchCart, updateQuantity } = useCart();

  // Wishlist context (source of truth for wishlist and count)
  const { wishlist = [], fetchWishlist, removeFromWishlist } = useWishlist();

  // local UI state
  const [selected, setSelected] = useState(new Set());
  const [loadingIds, setLoadingIds] = useState(new Set()); // per-item loading
  const [loading, setLoading] = useState(false); // global loading
  const [error, setError] = useState(null);

  // ensure wishlist is loaded on mount
  useEffect(() => {
    if (typeof fetchWishlist === "function") {
      fetchWishlist().catch((e) => console.warn("fetchWishlist error:", e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // normalize wishlist rows (from context) into the product shape this component expects
  const itemsWithMeta = useMemo(() => {
    return (wishlist || []).map((r) => {
      const product = {
        id: String(r.product_id ?? r.id ?? r.productId),
        name: r.name ?? r.product_name,
        price: Number(r.price ?? 0),
        originalPrice: Number(r.originalPrice ?? r.oldPrice ?? 0),
        rating: r.rating ?? 0,
        reviews: r.reviews ?? 0,
        category: r.category ?? "",
        seller: r.seller ?? "",
        images: r.images ?? r.image ?? "",
        wishlistRowId: r.id,
        created_at: r.created_at,
      };
      const images = parseImagesField(product.images);
      const firstImage = images.length ? images[0] : "https://via.placeholder.com/400";
      const price = Number(product.price) || 0;
      const originalPrice = Number(product.originalPrice || 0) || 0;
      const hasDiscount = originalPrice > price && originalPrice > 0;
      const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
      const idKey = String(product.id ?? `${product.name}-${product.price}`);
      return { product, firstImage, price, originalPrice, hasDiscount, discountPercent, idKey };
    });
  }, [wishlist]);

  // selection helpers
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

  // safe wrappers for cart context methods
  const safeFetchCart = async () => {
    if (typeof fetchCart === "function") {
      try {
        await fetchCart();
      } catch (e) {
        console.warn("fetchCart error:", e);
      }
    }
  };
  const safeUpdateQuantity = async (cartRowId, qty) => {
    if (typeof updateQuantity === "function") {
      try {
        await updateQuantity(cartRowId, qty);
        return true;
      } catch (e) {
        console.warn("updateQuantity error:", e);
        return false;
      }
    }
    return false;
  };

  // get auth headers helper
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

  // Remove single item (use context helper where available)
  const handleRemove = async (it) => {
    const pid = it.product?.id;
    if (!pid) return;
    setLoadingIds((s) => new Set(s).add(it.idKey));
    try {
      if (typeof removeFromWishlist === "function") {
        await removeFromWishlist(pid);
      } else {
        // fallback: call API directly
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

      // ensure cart is in sync if necessary (no change here)
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

  // Delete selected (bulk)
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
      // refresh context wishlist so Navbar updates immediately
      if (typeof fetchWishlist === "function") await fetchWishlist();
      clearSelection();
    } catch (err) {
      console.error("Bulk delete failed", err);
      setError("Could not remove selected items");
    } finally {
      setLoading(false);
    }
  };

  // Add single item to cart (merge if exists, otherwise move)
  const handleAddToCart = async (it) => {
    const pid = it.product?.id;
    if (!pid) return;

    setLoadingIds((s) => new Set(s).add(it.idKey));
    try {
      // check if product already in cart
      const existing = cart?.find(
        (c) =>
          String(c.product?.id ?? c.product_id ?? (c.product?.raw && c.product.raw.product_id)) === String(pid)
      );

      if (existing) {
        // increment quantity on existing cart row
        const newQty = Number(existing.quantity ?? 1) + 1;
        const ok = await safeUpdateQuantity(existing.id ?? existing.cart_id, newQty);
        if (!ok) {
          // fallback: direct API update
          await fetch(`${API_BASE}/api/cart/${encodeURIComponent(existing.id ?? existing.cart_id)}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({ quantity: newQty }),
          }).catch((e) => console.warn("Fallback update failed:", e));
        }

        // remove wishlist entry
        if (typeof removeFromWishlist === "function") {
          await removeFromWishlist(pid);
        } else {
          await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(pid)}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
        }
      } else {
        // not in cart — move via server endpoint
        const res = await fetch(`${API_BASE}/api/wishlist/move-to-cart`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ productIds: [pid] }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
      }

      // refresh cart and wishlist context so both UI badges update immediately
      await safeFetchCart();
      if (typeof fetchWishlist === "function") await fetchWishlist();
      // clear selection for this item (in case)
      setSelected((s) => {
        const copy = new Set(s);
        copy.delete(it.idKey);
        return copy;
      });
    } catch (err) {
      console.error("Move to cart failed", err);
      setError("Could not move item to cart");
    } finally {
      setLoadingIds((s) => {
        const copy = new Set(s);
        copy.delete(it.idKey);
        return copy;
      });
    }
  };

  // Add selected to cart (bulk)
  const handleAddSelectedToCart = async () => {
    const keys = Array.from(selected);
    if (!keys.length) return;

    const itemsToMove = keys
      .map((k) => itemsWithMeta.find((x) => x.idKey === k))
      .filter(Boolean);

    const productIds = itemsToMove.map((x) => x.product.id);
    if (!productIds.length) return;

    setLoading(true);
    try {
      // split into already-in-cart vs to-insert
      const already = [];
      const toInsert = [];
      for (const pid of productIds) {
        const ex = cart?.find(
          (c) =>
            String(c.product?.id ?? c.product_id ?? (c.product?.raw && c.product.raw.product_id)) === String(pid)
        );
        if (ex) already.push({ pid, row: ex });
        else toInsert.push(pid);
      }

      // insert new products via move-to-cart
      if (toInsert.length) {
        const res = await fetch(`${API_BASE}/api/wishlist/move-to-cart`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ productIds: toInsert }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
      }

      // increment quantities for already-existing cart rows
      if (already.length) {
        for (const { pid, row } of already) {
          const newQty = Number(row.quantity ?? 1) + 1;
          const ok = await safeUpdateQuantity(row.id ?? row.cart_id, newQty);
          if (!ok) {
            // fallback direct API update
            await fetch(`${API_BASE}/api/cart/${encodeURIComponent(row.id ?? row.cart_id)}`, {
              method: "PUT",
              headers: getHeaders(),
              body: JSON.stringify({ quantity: newQty }),
            }).catch((e) => console.warn("Fallback qty update failed:", e));
          }
        }
        // delete wishlist rows for those incremented products
        await fetch(`${API_BASE}/api/wishlist/bulk`, {
          method: "DELETE",
          headers: getHeaders(),
          body: JSON.stringify({ productIds: already.map((a) => a.pid) }),
        }).catch((e) => console.warn("Failed to delete wishlist rows for increments:", e));
      }

      // refresh cart and wishlist context once
      await safeFetchCart();
      if (typeof fetchWishlist === "function") await fetchWishlist();

      clearSelection();
    } catch (err) {
      console.error("Bulk move to cart failed", err);
      setError("Could not move selected items to cart");
    } finally {
      setLoading(false);
    }
  };

  // Move all items
  const handleMoveAllToCart = async () => {
    if (itemsWithMeta.length === 0) return;
    const productIds = itemsWithMeta.map((it) => it.product.id);

    setLoading(true);
    try {
      const already = [];
      const toInsert = [];
      for (const pid of productIds) {
        const ex = cart?.find(
          (c) =>
            String(c.product?.id ?? c.product_id ?? (c.product?.raw && c.product.raw.product_id)) === String(pid)
        );
        if (ex) already.push({ pid, row: ex });
        else toInsert.push(pid);
      }

      if (toInsert.length) {
        const res = await fetch(`${API_BASE}/api/wishlist/move-to-cart`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ productIds: toInsert }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
      }

      if (already.length) {
        for (const { pid, row } of already) {
          const newQty = Number(row.quantity ?? 1) + 1;
          const ok = await safeUpdateQuantity(row.id ?? row.cart_id, newQty);
          if (!ok) {
            await fetch(`${API_BASE}/api/cart/${encodeURIComponent(row.id ?? row.cart_id)}`, {
              method: "PUT",
              headers: getHeaders(),
              body: JSON.stringify({ quantity: newQty }),
            }).catch((e) => console.warn("Fallback qty update failed:", e));
          }
        }
        // remove wishlist entries for the incremented products
        await fetch(`${API_BASE}/api/wishlist/bulk`, {
          method: "DELETE",
          headers: getHeaders(),
          body: JSON.stringify({ productIds: already.map((a) => a.pid) }),
        }).catch((e) => console.warn("Failed to delete wishlist rows for increments:", e));
      }

      // refresh cart & wishlist
      await safeFetchCart();
      if (typeof fetchWishlist === "function") await fetchWishlist();

      clearSelection();
    } catch (err) {
      console.error("Move all failed", err);
      setError("Could not move all items to cart");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (it) => {
    const id = it.product?.id;
    if (id) navigate(`/product/${id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Wishlist</h2>
          <p className="text-sm text-gray-300">Saved items</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="px-3 py-2 rounded-md bg-neutral-800 text-gray-200 text-sm hover:bg-neutral-700"
          >
            Select all
          </button>

          <button
            onClick={handleAddSelectedToCart}
            disabled={selected.size === 0 || loading}
            className="px-3 py-2 rounded-md bg-white text-black text-sm hover:opacity-95 disabled:opacity-50"
          >
            Add selected to cart
          </button>

          <button
            onClick={handleRemoveSelected}
            disabled={selected.size === 0 || loading}
            className="px-3 py-2 rounded-md bg-transparent border border-neutral-700 text-gray-300 text-sm hover:bg-neutral-800 disabled:opacity-50"
          >
            Remove selected
          </button>

          <button
            onClick={handleMoveAllToCart}
            disabled={itemsWithMeta.length === 0 || loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white text-black text-sm hover:opacity-95 disabled:opacity-50"
          >
            <ShoppingCart size={16} /> Move all to cart
          </button>

          <button
            onClick={async () => {
              // clear all wishlist (use bulk delete)
              if (itemsWithMeta.length === 0) return;
              const pids = itemsWithMeta.map((it) => it.product.id);
              setLoading(true);
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
            }}
            className="px-3 py-2 rounded-md bg-transparent border border-red-700 text-red-500 text-sm hover:bg-red-900/20"
            disabled={itemsWithMeta.length === 0 || loading}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {loading && !itemsWithMeta.length ? (
        <div className="py-28 text-center text-gray-400">Loading wishlist…</div>
      ) : itemsWithMeta.length === 0 ? (
        <div className="py-28 text-center text-gray-400">
          <Heart size={48} className="mx-auto mb-4 text-pink-400" />
          <h3 className="text-xl text-white mb-2">Your wishlist is empty</h3>
          <p className="max-w-md mx-auto">Tap the heart on any product to save it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itemsWithMeta.map((it) => (
            <motion.div
              key={it.idKey}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-sm cursor-pointer"
              onClick={() => handleView(it)}
            >
              {/* Modern square selector */}
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
                  "w-5 h-5 flex items-center justify-center rounded-sm border-2 " +
                  (selected.has(it.idKey)
                    ? "bg-white border-white text-black"
                    : "bg-transparent border-neutral-700 text-white")
                }
              >
                {selected.has(it.idKey) ? "✓" : ""}
              </button>

              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={it.firstImage}
                  alt={it.product?.name}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://via.placeholder.com/400";
                  }}
                />
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white truncate" title={it.product?.name}>
                      {it.product?.name}
                    </h3>
                    <p className="text-xs text-gray-400">{it.product?.category || it.product?.seller}</p>
                  </div>

                  {/* Price (right-aligned on top) */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">₹{it.price.toLocaleString()}</div>
                    {it.hasDiscount && (
                      <div className="flex items-center justify-end gap-2">
                        <div className="text-xs line-through text-gray-400">₹{it.originalPrice.toLocaleString()}</div>
                        <div className="text-[11px] bg-green-600 text-white px-2 py-0.5 rounded-full">{it.discountPercent}% OFF</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stars & reviews */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1">{renderStars(it.product?.rating)}</div>
                  <span className="text-xs text-gray-400">({it.product?.reviews ?? 0})</span>
                </div>
              </div>

              {/* Actions — stopPropagation so buttons don't navigate */}
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleAddToCart(it)}
                  disabled={loadingIds.has(it.idKey)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white text-black hover:opacity-95 disabled:opacity-60"
                  aria-label="Add to cart"
                >
                  <ShoppingCart size={14} />
                  <span className="text-sm">{loadingIds.has(it.idKey) ? "Adding..." : "Add"}</span>
                </button>

                <button
                  onClick={() => handleRemove(it)}
                  className="p-2 rounded-full bg-transparent border border-red-800 text-red-400 hover:bg-red-900/20"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {error && <div className="mt-4 text-sm text-red-400">Error: {error}</div>}
    </div>
  );
}
