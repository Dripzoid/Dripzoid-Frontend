// src/contexts/WishlistContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_BASE;

const WishlistContext = createContext();

/** Hook to use wishlist context */
export function useWishlist() {
  return useContext(WishlistContext);
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]); // array of rows returned by GET /api/wishlist
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Get auth headers */
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

  /**
   * Fetch wishlist from server (canonical source of truth)
   */
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
      // keep server rows as-is; you can normalize if your UI needs different shape
      setWishlist(rows || []);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
      setError(err.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a single product to wishlist.
   * Uses optimistic update: updates local wishlist count immediately,
   * then calls POST /api/wishlist/:productId (route in your server).
   *
   * Accepts productId (string|number).
   */
  const addToWishlist = useCallback(async (productId) => {
    if (!productId) return;
    const idStr = String(productId);

    // If already present, do nothing
    if (wishlist.some((w) => String(w.product_id ?? w.id ?? w.productId ?? "") === idStr)) {
      return;
    }

    // Optimistic: add a lightweight placeholder row (so counts update immediately)
    const placeholder = {
      // server GET rows include fields like id, product_id, name, price, images, created_at
      // we only know product_id here; mark as optimistic
      id: `optimistic-${idStr}-${Date.now()}`,
      product_id: idStr,
      name: null,
      price: null,
      images: null,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setWishlist((prev) => [placeholder, ...prev]);

    try {
      // server expects POST /api/wishlist/:productId (no JSON body)
      const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(idStr)}`, {
        method: "POST",
        headers: getHeaders(false),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `${res.status} ${res.statusText}`);
      }
      // refresh canonical wishlist from server (will replace placeholder)
      await fetchWishlist();
    } catch (err) {
      console.error("Add to wishlist failed", err);
      // revert optimistic add
      setWishlist((prev) => prev.filter((r) => !(r.id && String(r.id).startsWith(`optimistic-${idStr}`))));
      setError(err.message || "Could not add to wishlist");
      throw err;
    }
  }, [wishlist, fetchWishlist]);

  /**
   * Add multiple productIds to wishlist (bulk).
   * Calls POST /api/wishlist/bulk with body { productIds } (array).
   */
  const addBulkToWishlist = useCallback(async (productIds = []) => {
    if (!Array.isArray(productIds) || productIds.length === 0) return;

    // Optimistic: insert placeholders for each not already present
    const idsToAdd = productIds.map(String).filter((id) => !wishlist.some((w) => String(w.product_id ?? w.id ?? "") === id));
    if (idsToAdd.length > 0) {
      const placeholders = idsToAdd.map((id) => ({
        id: `optimistic-${id}-${Date.now()}`,
        product_id: id,
        name: null,
        price: null,
        images: null,
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
      console.error("Bulk add to wishlist failed", err);
      // revert placeholders we added (best-effort: remove optimistic entries we created)
      setWishlist((prev) => prev.filter((r) => !String(r.id).startsWith("optimistic-")));
      setError(err.message || "Could not add items to wishlist");
      throw err;
    }
  }, [wishlist, fetchWishlist]);

  /**
   * Remove a single product from wishlist.
   * Optimistically removes locally then calls DELETE /api/wishlist/:productId
   */
  const removeFromWishlist = useCallback(async (productId) => {
    if (!productId) return;
    const idStr = String(productId);

    // Optimistically remove from local state and remember the previous slice to rollback if necessary
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
      // success — no further action, but refresh to be canonical
      await fetchWishlist();
    } catch (err) {
      console.error("Remove from wishlist failed", err);
      // rollback
      setWishlist(previous || []);
      setError(err.message || "Could not remove from wishlist");
      throw err;
    }
  }, [fetchWishlist]);

  /**
   * Bulk delete from wishlist.
   * Calls DELETE /api/wishlist/bulk with body { productIds }
   */
  const removeBulkFromWishlist = useCallback(async (productIds = []) => {
    if (!Array.isArray(productIds) || productIds.length === 0) return;

    const idSet = new Set(productIds.map(String));
    const prev = wishlist;
    // optimistic remove
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
      console.error("Bulk delete wishlist failed", err);
      // rollback
      setWishlist(prev || []);
      setError(err.message || "Could not remove items from wishlist");
      throw err;
    }
  }, [wishlist, fetchWishlist]);

  // initialize
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
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
