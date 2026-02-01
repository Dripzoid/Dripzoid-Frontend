// src/contexts/WishlistContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "";

const WishlistContext = createContext();

export function useWishlist() {
  return useContext(WishlistContext);
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]); // server rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        method: "GET",
        headers: getHeaders(false),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `${res.status} ${res.statusText}`);
      }
      const rows = await res.json();
      setWishlist(rows || []);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
      setError(err.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  const addToWishlist = useCallback(
    async (productId) => {
      if (!productId) return;
      const idStr = String(productId);

      if (wishlist.some((w) => String(w.product_id ?? w.id ?? w.productId ?? "") === idStr)) {
        // already present
        return;
      }

      // optimistic placeholder
      const placeholder = {
        id: `optimistic-${idStr}-${Date.now()}`,
        product_id: idStr,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };
      setWishlist((prev) => [placeholder, ...prev]);

      try {
        const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(idStr)}`, {
          method: "POST",
          headers: getHeaders(false),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
        await fetchWishlist();
      } catch (err) {
        console.error("Add to wishlist failed", err);
        setWishlist((prev) => prev.filter((r) => !(String(r.id || "").startsWith(`optimistic-${idStr}`))));
        setError(err.message || "Could not add to wishlist");
        throw err;
      }
    },
    [wishlist, fetchWishlist]
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      if (!productId) return;
      const idStr = String(productId);

      let previous = null;
      setWishlist((prev) => {
        previous = prev;
        return prev.filter((item) => String(item.product_id ?? item.id ?? item.productId ?? "") !== idStr);
      });

      try {
        const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(idStr)}`, {
          method: "DELETE",
          headers: getHeaders(false),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
        await fetchWishlist();
      } catch (err) {
        console.error("Remove from wishlist failed", err);
        setWishlist(previous || []);
        setError(err.message || "Could not remove from wishlist");
        throw err;
      }
    },
    [fetchWishlist]
  );

  const addBulkToWishlist = useCallback(
    async (productIds = []) => {
      if (!Array.isArray(productIds) || productIds.length === 0) return;

      const idsToAdd = productIds.map(String).filter((id) => !wishlist.some((w) => String(w.product_id ?? w.id ?? "") === id));
      if (idsToAdd.length > 0) {
        const placeholders = idsToAdd.map((id) => ({
          id: `optimistic-${id}-${Date.now()}`,
          product_id: id,
          created_at: new Date().toISOString(),
          _optimistic: true,
        }));
        setWishlist((prev) => [...placeholders, ...prev]);
      }

      try {
        const res = await fetch(`${API_BASE}/api/wishlist/bulk`, {
          method: "POST",
          headers: getHeaders(true),
          body: JSON.stringify({ productIds }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
        await fetchWishlist();
      } catch (err) {
        console.error("Bulk add failed", err);
        setWishlist((prev) => prev.filter((r) => !String(r.id).startsWith("optimistic-")));
        setError(err.message || "Could not add items to wishlist");
        throw err;
      }
    },
    [wishlist, fetchWishlist]
  );

  const removeBulkFromWishlist = useCallback(
    async (productIds = []) => {
      if (!Array.isArray(productIds) || productIds.length === 0) return;
      const idSet = new Set(productIds.map(String));
      const prev = wishlist;
      setWishlist((prevState) => prevState.filter((item) => !idSet.has(String(item.product_id ?? item.id ?? item.productId ?? ""))));
      try {
        const res = await fetch(`${API_BASE}/api/wishlist/bulk`, {
          method: "DELETE",
          headers: getHeaders(true),
          body: JSON.stringify({ productIds }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }
        await fetchWishlist();
      } catch (err) {
        console.error("Bulk delete failed", err);
        setWishlist(prev || []);
        setError(err.message || "Could not remove items from wishlist");
        throw err;
      }
    },
    [wishlist, fetchWishlist]
  );

  // convenience toggle: accepts product object or id
  const toggle = useCallback(
    async (productOrId) => {
      const id = productOrId == null ? null : (typeof productOrId === "object" ? (productOrId.id ?? productOrId.product_id ?? productOrId._id) : productOrId);
      if (!id) throw new Error("Invalid product id");
      const idStr = String(id);
      const present = wishlist.some((w) => String(w.product_id ?? w.id ?? w.productId ?? "") === idStr);
      if (present) {
        await removeFromWishlist(idStr);
        return { removed: true };
      } else {
        await addToWishlist(idStr);
        return { added: true };
      }
    },
    [wishlist, addToWishlist, removeFromWishlist]
  );

  useEffect(() => {
    fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        setWishlist,
        loading,
        error,
        fetchWishlist,
        addToWishlist,
        addBulkToWishlist,
        removeFromWishlist,
        removeBulkFromWishlist,
        toggle,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
