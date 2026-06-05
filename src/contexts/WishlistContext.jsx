// src/contexts/WishlistContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { UserContext } from "./UserContext.js";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

const WishlistContext = createContext();

export function useWishlist() {
  return useContext(WishlistContext);
}

function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export function WishlistProvider({ children }) {
  const {
    user,
    loading: authLoading,
  } = useContext(UserContext);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = (isJson = true) => {
    const headers = {};
    if (isJson) headers["Content-Type"] = "application/json";
    return headers;
  };

  /* ================= FETCH ================= */
  const fetchWishlist = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildUrl("/api/wishlist"), {
        method: "GET",
        credentials: "include",
        headers: getHeaders(false),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || json?.message || `${res.status} ${res.statusText}`);
      }

      const rows = await res.json();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
      setError(err.message || "Failed to load wishlist");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  /* ================= ADD ================= */
  const addToWishlist = useCallback(
    async (productId) => {
      if (authLoading) {
        throw new Error("Authentication still loading");
      }

      if (!user) {
        throw new Error("Not authenticated");
      }

      if (!productId) return;

      const idStr = String(productId);

      if (items.some((w) => String(w.product_id ?? w.id ?? "") === idStr)) {
        return;
      }

      const placeholder = {
        id: `optimistic-${idStr}-${Date.now()}`,
        product_id: idStr,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      setItems((prev) => [placeholder, ...prev]);

      try {
        const res = await fetch(buildUrl(`/api/wishlist/${encodeURIComponent(idStr)}`), {
          method: "POST",
          credentials: "include",
          headers: getHeaders(false),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || json?.message || `${res.status} ${res.statusText}`);
        }

        await fetchWishlist();
      } catch (err) {
        setItems((prev) =>
          prev.filter((r) => !String(r.id).startsWith(`optimistic-${idStr}`))
        );
        console.error("Failed to add wishlist item:", err);
        throw err;
      }
    },
    [authLoading, user, items, fetchWishlist]
  );

  /* ================= REMOVE ================= */
  const removeFromWishlist = useCallback(
    async (productId) => {
      if (authLoading) {
        throw new Error("Authentication still loading");
      }

      if (!user) {
        throw new Error("Not authenticated");
      }

      if (!productId) return;

      const idStr = String(productId);
      const prev = items;

      setItems((prevState) =>
        prevState.filter(
          (item) => String(item.product_id ?? item.id ?? "") !== idStr
        )
      );

      try {
        const res = await fetch(buildUrl(`/api/wishlist/${encodeURIComponent(idStr)}`), {
          method: "DELETE",
          credentials: "include",
          headers: getHeaders(false),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || json?.message || `${res.status} ${res.statusText}`);
        }

        await fetchWishlist();
      } catch (err) {
        setItems(prev || []);
        console.error("Failed to remove wishlist item:", err);
        throw err;
      }
    },
    [authLoading, user, items, fetchWishlist]
  );

  /* ================= TOGGLE ================= */
  const toggle = useCallback(
    async (productOrId) => {
      const id =
        typeof productOrId === "object"
          ? productOrId?.id ?? productOrId?.product_id ?? productOrId?._id
          : productOrId;

      if (!id) throw new Error("Invalid product id");

      const idStr = String(id);

      const exists = items.some(
        (w) => String(w.product_id ?? w.id ?? "") === idStr
      );

      if (exists) {
        await removeFromWishlist(idStr);
        return { removed: true };
      } else {
        await addToWishlist(idStr);
        return { added: true };
      }
    },
    [items, addToWishlist, removeFromWishlist]
  );

  /* ================= INIT ================= */
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  /* ================= MEMO VALUE ================= */
  const value = useMemo(
    () => ({
      items,
      loading,
      error,
      fetchWishlist,
      addToWishlist,
      removeFromWishlist,
      toggle,
    }),
    [items, loading, error, fetchWishlist, addToWishlist, removeFromWishlist, toggle]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
