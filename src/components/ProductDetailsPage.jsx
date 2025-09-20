// src/components/ProductDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Avatar } from "@mui/material";

// Icons (lucide)
import {
  MessageCircle,
  CreditCard,
  ShoppingCart,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Send,
  ThumbsUp,
  ThumbsDown,
  Heart,
  X,
} from "lucide-react";

import { SketchPicker } from "react-color";

import nearestColor from "nearest-color";

import ProductCard from "./ProductCard";
import Reviews from "./Reviews";

import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import { UserContext } from "../contexts/UserContext.js"; // uses same context as CartContext expects

// --------- CONFIG ----------
const API_BASE = process.env.REACT_APP_API_BASE;

/* ---------- Helpers ---------- */
function normalizeColorString(str) {
  return String(str || "").trim().toLowerCase();
}

/** sanitize color name for lookup: lowercased + remove spaces */
function sanitizeColorNameForLookup(name) {
  if (!name || typeof name !== "string") return "";
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeVariantValue(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim().toLowerCase();
}

/**
 * Color name detection + nearest-color integration
 */

// --- nearest-color setup ---
const CUSTOM_NAMED_COLORS = {
  black: "#000000",
  cornsilk: "#FFF8DC", // standard CSS cornsilk
  "irish green": "#009A44", // common 'irish green' approximation
  azalea: "#F7C6D9", // azalea / azalea pink approximation
  "heather royal": "#307FE2", // Gildan Heather Royal approx
  "heather sapphire": "#0076A8", // Gildan Heather Sapphire approx
  // add other friendly names as needed
};

let nearest = null;
try {
  nearest = nearestColor.from(CUSTOM_NAMED_COLORS);
} catch (err) {
  nearest = null;
}

function detectColorTextName(color) {
  if (!color && color !== 0) return "";
  if (typeof color === "object") {
    if (color.label) return String(color.label);
    if (color.name) return String(color.name);
    if (color.hex) return String(color.hex).toUpperCase();
    if (color.value) return String(color.value);
    // attempt stringify
    return String(color).replace(/\s+/g, " ").trim();
  }
  const s = String(color).trim();
  if (!s) return "";
  // hex?
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) {
    const hex = s.toUpperCase();
    if (nearest) {
      try {
        const r = nearest(hex);
        if (r && r.name) return r.name;
      } catch {}
    }
    return hex;
  }

  // try browser accept
  try {
    if (typeof document !== "undefined") {
      const st = document.createElement("span").style;
      st.color = s;
      if (st.color) {
        try {
          const span = document.createElement("span");
          span.style.color = s;
          span.style.display = "none";
          document.body.appendChild(span);
          const cs = window.getComputedStyle(span).color;
          document.body.removeChild(span);
          const hex = rgbStringToHex(cs);
          if (hex && nearest) {
            try {
              const r = nearest(hex);
              if (r && r.name) return r.name;
            } catch {}
          }
        } catch {}
        return s; // browser accepts the name
      }
    }
  } catch {}

  if (nearest) {
    const key = Object.keys(CUSTOM_NAMED_COLORS).find(
      (k) => sanitizeColorNameForLookup(k) === sanitizeColorNameForLookup(s)
    );
    if (key) return key;
  }

  return s;
}

/**
 * Try to resolve a CSS color name (or hex string) into a hex value.
 * Approach:
 *  - If input is already a hex -> return it.
 *  - Attempt to resolve named CSS color by creating a temporary element,
 *    setting its color, reading computed style (rgb) and converting that to hex.
 *  - Fall back to '#808080'.
 *
 * Works only in browser (guards for SSR).
 */
function rgbStringToHex(rgb) {
  if (!rgb || typeof rgb !== "string") return null;
  const m = rgb.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!m) return null;
  const r = parseInt(m[1], 10);
  const g = parseInt(m[2], 10);
  const b = parseInt(m[3], 10);
  const toHex = (n) => {
    const h = n.toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function nameToHex(name) {
  if (!name || typeof name !== "string") return null;
  if (typeof document === "undefined") return null; // SSR guard
  try {
    const span = document.createElement("span");
    span.style.color = "";
    span.style.display = "none";
    span.style.color = name;
    document.body.appendChild(span);
    const cs = window.getComputedStyle(span).color;
    document.body.removeChild(span);
    const hex = rgbStringToHex(cs);
    if (hex) return hex;
  } catch {
    // ignore
  }
  return null;
}

/** Try to resolve provided color (string or object) to a usable CSS color hex. */
function resolveColor(c) {
  if (!c) return "#808080";
  if (typeof c === "object") {
    const maybe = c.hex || c.value || c.color || c.code || c.label || c.name;
    if (maybe) return resolveColor(maybe);
    return "#808080";
  }
  const s = String(c).trim();
  if (!s) return "#808080";
  // hex candidate?
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s.toUpperCase();
  // try name -> hex
  const sanitized = sanitizeColorNameForLookup(s);
  const fromName = nameToHex(sanitized) || nameToHex(s);
  if (fromName) return fromName;
  // try DOM accept (some names like 'light blue' might not work, but safer to try original)
  try {
    if (typeof document !== "undefined") {
      const st = document.createElement("span").style;
      st.color = s;
      if (st.color) return s;
    }
  } catch {}
  return "#808080";
}

// Helper: return friendly nearest name (falls back to detectColorTextName)
function getNearestColorLabel(c) {
  const hex = resolveColor(c);
  if (!hex) return detectColorTextName(c);
  if (nearest) {
    try {
      const r = nearest(hex);
      if (r && r.name) return r.name;
    } catch {}
  }
  return detectColorTextName(c);
}

/* Format timestamp into IST string */
function formatIST(isoOrDate) {
  try {
    if (!isoOrDate) return "";
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return String(isoOrDate || "");
  }
}

/* Relative time (uses device clock) */
function formatRelativeIST(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // seconds
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatIST(date);
}

// deterministic HSL color generator for avatar backgrounds
function stringToHslColor(str = "", s = 65, l = 40) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

/* -------------------- MAIN COMPONENT -------------------- */
export default function ProductDetailsPage() {
  const { id: routeProductId } = useParams();
  const productId = routeProductId || "demo-kurta-1";
  const navigate = useNavigate();

  // contexts
  const { addToCart, buyNow: ctxBuyNow, cart = [], fetchCart } = useCart() || {};
  const wishlistCtx = useWishlist() || {};
  const { wishlist = [], addToWishlist = async () => {}, removeFromWishlist = async () => {}, fetchWishlist = async () => {} } = wishlistCtx;
  const { user: ctxUser } = useContext(UserContext) || {};

  const [currentUser, setCurrentUser] = useState(() => ctxUser || null);

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [addedToCart, setAddedToCart] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [answerInputs, setAnswerInputs] = useState({});
  const [answerLoading, setAnswerLoading] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const lastAnswerRef = useRef({});
  const [zipRaw, setZipRaw] = useState("");
  const [zipDisplay, setZipDisplay] = useState("");
  const [deliveryMsg, setDeliveryMsg] = useState(null);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  function showToast(message, ttl = 4000) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), ttl);
  }
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // keep currentUser synced with UserContext if it becomes available
  useEffect(() => {
    if (ctxUser) setCurrentUser(ctxUser);
  }, [ctxUser]);

  // wishlist top
  const [wlBusyTop, setWlBusyTop] = useState(false);
  const canonicalPid = useMemo(
    () =>
      String(
        product?.id ??
          product?._id ??
          product?.productId ??
          product?.product_id ??
          productId ??
          ""
      ),
    [product, productId]
  );
  const isWishlisted = useMemo(() => {
    if (!canonicalPid) return false;
    return (wishlist || []).some((w) =>
      String(w.product_id ?? w.id ?? w.productId ?? (w.product && w.product.id) ?? "") === String(canonicalPid)
    );
  }, [wishlist, canonicalPid]);

  const handleTopWishlistToggle = async () => {
    if (!canonicalPid || wlBusyTop) return;
    setWlBusyTop(true);
    try {
      if (isWishlisted) {
        await removeFromWishlist(canonicalPid);
        showToast("Removed from wishlist");
      } else {
        await addToWishlist(canonicalPid);
        showToast("Added to wishlist");
      }
      if (typeof fetchWishlist === "function") await fetchWishlist();
    } catch (err) {
      console.warn("Wishlist top toggle failed", err);
      showToast("Wishlist action failed");
    } finally {
      setWlBusyTop(false);
    }
  };

  /* ---------- load product + qa + related ---------- */
  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;
    async function loadAll() {
      try {
        const [pRes, qRes] = await Promise.all([
          fetch(`${API_BASE}/api/products/${productId}`, { signal: ac.signal }),
          fetch(`${API_BASE}/api/qa/${productId}`, { signal: ac.signal }),
        ]);

        if (!pRes.ok) throw new Error(`Product fetch failed (${pRes.status})`);
        const pjson = await pRes.json();

        let qjson = [];
        if (qRes.ok) {
          const qdata = await qRes.json();
          if (Array.isArray(qdata)) qjson = qdata;
          else if (Array.isArray(qdata.questions)) qjson = qdata.questions;
          else if (Array.isArray(qdata.data)) qjson = qdata.data;
          else qjson = [];
        }

        if (!mounted) return;

        setProduct(pjson || null);
        setSelectedImage(0);

        const firstColor = (pjson?.colors && pjson.colors.length && pjson.colors[0]) || "";
        const firstSize = (pjson?.sizes && pjson.sizes.length && pjson.sizes[0]) || "";
        setSelectedColor(firstColor || "");
        setSelectedSize(firstSize || "");

        await enrichQAWithUserNames(qjson, ac.signal);

        // related products
        try {
          let list = [];
          const rr = await fetch(`${API_BASE}/api/products/related/${productId}`, { signal: ac.signal });
          if (rr.ok) list = await rr.json();

          if ((!Array.isArray(list) || list.length === 0) && pjson?.category) {
            const fallback = await fetch(
              `${API_BASE}/api/products?category=${encodeURIComponent(pjson.category)}&limit=8`,
              { signal: ac.signal }
            );
            if (fallback.ok) {
              const fb = await fallback.json();
              list = fb?.data || fb || [];
            }
          }
          const filtered = Array.isArray(list)
            ? list
                .filter((x) => String(x.id || x._id || x.productId) !== String(productId))
                .slice(0, 8)
            : [];
          if (mounted) setRelatedProducts(filtered);
        } catch (err) {
          console.warn("related fetch failed", err);
        }
      } catch (err) {
        console.error("loadAll failed:", err);
      }
    }
    loadAll();
    return () => {
      mounted = false;
      ac.abort();
    };
  }, [productId]);

  // Enrich QA with user names and fetch votes for answers
  async function enrichQAWithUserNames(qList = [], signal = null) {
    const list = Array.isArray(qList) ? qList : [];
    if (list.length === 0) {
      setQuestions([]);
      return;
    }
    const idsToFetch = new Set();
    list.forEach((q) => {
      if (!q.userName && !q.name) {
        const uid = q.userId ?? q.user_id ?? q.user?.id ?? null;
        if (uid !== null && uid !== undefined) idsToFetch.add(String(uid));
      }
      (q.answers || []).forEach((a) => {
        if (!a.userName && !a.name) {
          const au = a.userId ?? a.user_id ?? a.user?.id ?? null;
          if (au !== null && au !== undefined) idsToFetch.add(String(au));
        }
      });
    });

    await Promise.all(
      Array.from(idsToFetch).map((uid) =>
        (async () => {
          try {
            const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(uid)}`, { signal });
            if (!res.ok) return null;
            const json = await res.json();
            return { uid, data: json };
          } catch {
            return null;
          }
        })()
      )
    ).then((arr) => {
      const map = {};
      arr.forEach((it) => {
        if (it && it.uid && it.data) map[String(it.uid)] = it.data;
      });
      const enriched = list.map((q) => {
        const clone = { ...q };
        clone.userName = clone.userName || clone.name || null;
        const qUid = String(clone.userId ?? clone.user_id ?? clone.user?.id ?? "");
        if ((!clone.userName || clone.userName === "Anonymous") && qUid && map[qUid]) {
          clone.userName = map[qUid].name || clone.userName;
          clone.avatar = clone.avatar || map[qUid].avatar || map[qUid].avatarUrl;
        }
        clone.answers = (clone.answers || []).map((a) => {
          const aa = { ...a };
          aa.userName = aa.userName || aa.name || null;
          const aUid = String(aa.userId ?? aa.user_id ?? aa.user?.id ?? "");
          if ((!aa.userName || aa.userName === "Anonymous") && aUid && map[aUid]) {
            aa.userName = map[aUid].name || aa.userName;
            aa.avatar = aa.avatar || map[aUid].avatar || map[aUid].avatarUrl;
          }
          aa.likes = Number(aa.likes || 0);
          aa.dislikes = Number(aa.dislikes || 0);
          return aa;
        });
        return clone;
      });
      setQuestions(enriched);

      // fetch votes map for answers if any
      (async () => {
        try {
          const allAnswerIds = enriched.flatMap((q) => (q.answers || []).map((a) => a.id).filter(Boolean));
          if (allAnswerIds.length === 0) return;
          const q = `${API_BASE}/api/votes?entityType=${encodeURIComponent("answer")}&entityIds=${allAnswerIds.join(",")}`;
          const res = await fetch(q);
          if (!res.ok) return;
          const json = await res.json();
          const mapVotes = {};
          if (Array.isArray(json)) {
            json.forEach((it) => {
              const id = String(it.entityId ?? it.id ?? it._id);
              if (!id) return;
              mapVotes[id] = { likes: Number(it.like ?? it.likes ?? 0), dislikes: Number(it.dislike ?? it.dislikes ?? 0) };
            });
          } else if (json && typeof json === "object") {
            Object.keys(json).forEach((k) => {
              const it = json[k] || {};
              mapVotes[String(k)] = { likes: Number(it.like ?? it.likes ?? 0), dislikes: Number(it.dislike ?? it.dislikes ?? 0) };
            });
          }
          if (Object.keys(mapVotes).length) {
            setQuestions((prev) =>
              (Array.isArray(prev) ? prev : []).map((q) => ({
                ...q,
                answers: (q.answers || []).map((a) => {
                  const m = mapVotes[String(a.id)];
                  if (!m) return a;
                  return { ...a, likes: m.likes, dislikes: m.dislikes };
                }),
              }))
            );
          }
        } catch (err) {
          // ignore
        }
      })();
    });
  }

  /* ---------- gallery (color-aware) ---------- */
  // Determine whether the product requires color
  const requiresColor = Array.isArray(product?.colors) && product.colors.length > 0;
  const requiresSize = Array.isArray(product?.sizes) && product.sizes.length > 0;

  // Build a mapping of colorKey -> images slice
  const colorImageMap = useMemo(() => {
    const imgs = Array.isArray(product?.images) ? product.images.slice() : [];
    const colors = Array.isArray(product?.colors) && product.colors.length ? product.colors.slice() : [];
    const map = {};

    if (!imgs.length) {
      map.__all__ = ["/placeholder.png"];
      return map;
    }

    if (!colors.length) {
      map.__all__ = imgs;
      return map;
    }

    const nImgs = imgs.length;
    const nColors = colors.length;

    // If fewer images than colors, assign one image each to the first nImgs colors
    if (nImgs <= nColors) {
      for (let i = 0; i < nColors; i++) {
        const key = sanitizeColorNameForLookup(String(colors[i] || ""));
        map[key] = i < nImgs ? [imgs[i]] : [];
      }
      return map;
    }

    const base = Math.floor(nImgs / nColors);
    let remainder = nImgs % nColors;
    let idx = 0;
    for (let i = 0; i < nColors; i++) {
      const extra = remainder > 0 ? 1 : 0;
      const count = base + extra;
      const key = sanitizeColorNameForLookup(String(colors[i] || ""));
      map[key] = imgs.slice(idx, idx + count);
      idx += count;
      if (remainder > 0) remainder -= 1;
    }

    if (idx < nImgs) {
      const lastKey = sanitizeColorNameForLookup(String(colors[colors.length - 1] || ""));
      map[lastKey] = (map[lastKey] || []).concat(imgs.slice(idx));
    }

    return map;
  }, [product?.images, product?.colors]);

  // Helper: derive a readable list of color names (advanced detection)
  const allColorNames = useMemo(() => {
    const colors = Array.isArray(product?.colors) ? product.colors : [];
    return colors.map((c) => getNearestColorLabel(c));
  }, [product?.colors]);

  const galleryImages = useMemo(() => {
    const imgsAll = colorImageMap.__all__ || [];
    if (!requiresColor) {
      return imgsAll.length ? imgsAll : ["/placeholder.png"];
    }

    const key = sanitizeColorNameForLookup(String(selectedColor || ""));
    // Try exact match
    let imgs = colorImageMap[key];

    // If not found, try to find by matching to any color by sanitized string
    if (!imgs) {
      const colors = Array.isArray(product?.colors) ? product.colors : [];
      const firstColorKey = sanitizeColorNameForLookup(String(colors[0] || ""));
      imgs = colorImageMap[firstColorKey] || imgsAll;
    }

    return imgs && imgs.length ? imgs : ["/placeholder.png"];
  }, [colorImageMap, requiresColor, selectedColor, product?.colors]);

  function prevImage() {
    setSelectedImage((s) => (s - 1 + galleryImages.length) % galleryImages.length);
  }
  function nextImage() {
    setSelectedImage((s) => (s + 1) % galleryImages.length);
  }

  // whenever gallery images or selected color changes, reset selectedImage to 0
  useEffect(() => {
    setSelectedImage(0);
  }, [galleryImages.length, selectedColor]);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i + 1) % galleryImages.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, galleryImages.length]);

  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);

  /* ---------- variant-aware stock & quantity safety ---------- */
  const selectedVariant = useMemo(() => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) return null;
    return (
      variants.find((v) => {
        const vColor = v.color ?? v.colour ?? v.variantColor ?? v.attributes?.color;
        const vSize = v.size ?? v.variantSize ?? v.attributes?.size;
        const okColor = requiresColor ? String(vColor) === String(selectedColor) : true;
        const okSize = requiresSize ? String(vSize) === String(selectedSize) : true;
        return okColor && okSize;
      }) || null
    );
  }, [product, selectedColor, selectedSize, requiresColor, requiresSize]);

  const availableStock = useMemo(() => {
    if (selectedVariant && selectedVariant.stock != null) {
      return Number(selectedVariant.stock || 0);
    }
    const s = product?.stock ?? product?.inventory ?? product?.quantity ?? 0;
    return Number(s || 0);
  }, [product, selectedVariant]);

  useEffect(() => {
    setQuantity((q) => {
      const min = 1;
      const max = availableStock > 0 ? availableStock : 1;
      return Math.min(Math.max(q, min), max);
    });
  }, [availableStock]);

  /* ---------- ensure cart detection persists across refresh ---------- */
  useEffect(() => {
    if (typeof fetchCart === "function") {
      try {
        fetchCart().catch(() => {});
      } catch {}
    }
  }, [fetchCart]);

  // Helper: check if a cart item matches current product + selection (color/size/variant)
  function cartItemMatchesSelection(item, prodKey, selColor, selSize, selVariantId) {
    if (!item) return false;
    const pid = String(item.product_id ?? item.productId ?? item.product?.id ?? item.product?._id ?? item.id ?? "");
    if (!pid || String(pid) !== String(prodKey)) return false;

    // find color from possible keys
    const itemColorCandidates = [
      item.selectedColor,
      item.selected_color,
      item.color,
      item.variantColor,
      item.variant?.color,
      item.attributes?.color,
      item.product?.color,
    ];
    const itemSizeCandidates = [
      item.selectedSize,
      item.selected_size,
      item.size,
      item.variantSize,
      item.variant?.size,
      item.attributes?.size,
      item.product?.size,
    ];
    const itemVariantCandidates = [item.variantId, item.variant?.id, item.variant_id, item.variant?._id];

    const normalize = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

    const itemColor = itemColorCandidates.find((c) => c !== undefined && c !== null && String(c).trim() !== "") || "";
    const itemSize = itemSizeCandidates.find((s) => s !== undefined && s !== null && String(s).trim() !== "") || "";
    const itemVariant = itemVariantCandidates.find((v) => v !== undefined && v !== null && String(v).trim() !== "") || "";

    // If variant id is available on both sides, prefer exact match
    if (selVariantId && itemVariant) {
      if (String(itemVariant).trim() === String(selVariantId).trim()) return true;
    }

    // Otherwise compare color + size (both should match if provided)
    const colorMatch = !selColor || !itemColor ? normalize(selColor) === normalize(itemColor) : normalize(selColor) === normalize(itemColor);
    const sizeMatch = !selSize || !itemSize ? normalize(selSize) === normalize(itemSize) : normalize(selSize) === normalize(itemSize);

    return colorMatch && sizeMatch;
  }

  // whenever product or cart updates, detect whether this product+selection exists in cart
  useEffect(() => {
    try {
      if (!product) {
        setAddedToCart(false);
        return;
      }

      const prodKey = String(product.id ?? product._id ?? product.productId ?? product.product_id ?? "");
      const selColorNormalized = selectedColor ? String(selectedColor).trim() : "";
      const selSizeNormalized = selectedSize ? String(selectedSize).trim() : "";
      const selVariantId = selectedVariant?.id || selectedVariant?._id || null;

      // First try to find a matching item in the cart array
      if (Array.isArray(cart) && cart.length > 0) {
        const found = cart.some((it) => cartItemMatchesSelection(it, prodKey, selColorNormalized, selSizeNormalized, selVariantId));
        if (found) {
          setAddedToCart(true);
          try {
            if (prodKey) localStorage.setItem(`cart_added_${prodKey}`, "1");
          } catch {}
          return;
        }

        // not found: try localStorage fallback keys that include color/size/variant
        try {
          const keyExact = `cart_added_${prodKey}_${selVariantId || ""}_${String(selColorNormalized || "").replace(/\s+/g, "_")}_${String(selSizeNormalized || "").replace(/\s+/g, "_")}`;
          const flag = localStorage.getItem(keyExact);
          if (flag) {
            setAddedToCart(true);
            return;
          }
        } catch {}

        setAddedToCart(false);
        return;
      }

      // fallback to localStorage when cart array is empty or not provided
      try {
        const keyExact = `cart_added_${prodKey}_${selVariantId || ""}_${String(selColorNormalized || "").replace(/\s+/g, "_")}_${String(selSizeNormalized || "").replace(/\s+/g, "_")}`;
        const flag = localStorage.getItem(keyExact);
        setAddedToCart(Boolean(flag));
      } catch {
        setAddedToCart(false);
      }
    } catch (err) {
      console.warn("cart detection error", err);
      setAddedToCart(false);
    }
  }, [cart, product, productId, selectedColor, selectedSize, selectedVariant]);

  /* ---------- actions ---------- */
  async function addToCartHandler() {
    const needSelectionError = (requiresColor && !selectedColor) || (requiresSize && !selectedSize);
    if (needSelectionError) {
      showToast("Select size and color");
      return;
    }
    if (availableStock <= 0) {
      showToast("Out of stock");
      return;
    }
    if (quantity > availableStock) {
      showToast(`Only ${availableStock} left in stock`);
      setQuantity(availableStock);
      return;
    }
    try {
      const variantInfo = selectedVariant ? { variantId: selectedVariant.id || selectedVariant._id, selectedColor, selectedSize } : { selectedColor, selectedSize };

      const prodKey = String(product.id ?? product._id ?? product.productId ?? product.product_id ?? "");
      const itemForCart = {
        product_id: prodKey || null,
        product: product,
        quantity: Number(quantity || 1),
        selectedColor: selectedColor || null,
        selectedSize: selectedSize || null,
        variantId: variantInfo.variantId || null,
        price: product?.price ?? product?.cost ?? 0,
        images: Array.isArray(product?.images) ? product.images : product?.images ? [product.images] : [],
      };

      if (typeof addToCart === "function") {
        try {
          await addToCart(itemForCart);
        } catch (err) {
          await addToCart(product, Number(quantity || 1), selectedSize, selectedColor, variantInfo);
        }
      }

      setAddedToCart(true);
      try {
        const localKey = `cart_added_${prodKey}_${variantInfo.variantId || ""}_${String(selectedColor || "").replace(/\s+/g, "_")}_${String(selectedSize || "").replace(/\s+/g, "_")}`;
        if (prodKey) localStorage.setItem(localKey, "1");
      } catch {}
      showToast("Added to cart");
    } catch (err) {
      console.error("addToCartHandler failed", err);
      showToast("Could not add to cart");
    }
  }

  function goToCart() {
    navigate("/cart");
  }

  function buyNowHandler() {
    const needSelectionError = (requiresColor && !selectedColor) || (requiresSize && !selectedSize);
    if (needSelectionError) {
      showToast("Select size and color");
      return;
    }
    if (availableStock <= 0) {
      showToast("Out of stock");
      return;
    }
    if (quantity > availableStock) {
      showToast(`Only ${availableStock} left in stock`);
      setQuantity(availableStock);
      return;
    }

    const itemForCheckout = {
      product: product,
      quantity: Number(quantity || 1),
      product_id: product?.id ?? product?._id ?? null,
      price: product?.price ?? product?.cost ?? 0,
      images: Array.isArray(product?.images) ? product.images.join(",") : product?.images ?? product?.image ?? "",
      selectedColor: selectedColor || null,
      selectedSize: selectedSize || null,
      variantId: selectedVariant?.id || selectedVariant?._id || null,
    };

    navigate("/checkout", {
      state: {
        items: [itemForCheckout],
        mode: "buy-now",
        fromCart: false,
      },
    });
    showToast("Proceeding to checkout...");
  }

  async function handleShare() {
    try {
      const shareUrl = window.location.href;
      const title = product?.name || "Check this product";
      const text = (product?.description || "").slice(0, 140);
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url: shareUrl });
          showToast("Shared");
          return;
        } catch {}
      }
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(`${title} — ${text}`);
      const twitter = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      window.open(twitter, "_blank", "noopener,noreferrer,width=600,height=400");
      showToast("Opened share options");
    } catch (err) {
      console.error("share failed", err);
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Link copied to clipboard");
      } catch {
        showToast("Could not share");
      }
    }
  }

  function formatZipInput(val) {
    const digits = String(val || "").replace(/\D/g, "").slice(0, 6);
    setZipRaw(digits);
    if (digits.length <= 3) setZipDisplay(digits);
    else setZipDisplay(digits.slice(0, 3) + " " + digits.slice(3));
  }

  async function checkDelivery() {
    if (zipRaw.length !== 6) {
      setDeliveryMsg({ ok: false, text: "Enter a 6-digit PIN" });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/shipping/estimate?pin=${zipRaw}`);
      if (res.ok) {
        const json = await res.json();
        setDeliveryMsg({
          ok: true,
          text: json?.estimate || "Estimated delivery: 3 - 5 business days",
        });
      } else {
        setDeliveryMsg({ ok: false, text: "Could not fetch delivery estimate" });
      }
    } catch (err) {
      console.warn("shipping estimate failed", err);
      setDeliveryMsg({ ok: false, text: "Could not fetch delivery estimate" });
    }
  }

  if (!product)
    return (
      <div className="p-8 text-center text-black dark:text-white">
        Loading product...
      </div>
    );

  const formatINR = (val) => {
    try {
      const n = Number(val || 0);
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `₹${val}`;
    }
  };

  const disablePurchase = availableStock <= 0 || (requiresColor && !selectedColor) || (requiresSize && !selectedSize);

  const actionButtonClass =
    "shadow-[inset_0_0_0_2px_#616467] text-black px-6 py-2 rounded-full tracking-widest uppercase font-bold bg-transparent hover:bg-[#616467] hover:text-white dark:text-neutral-200 transition duration-200 flex items-center gap-2 justify-center";

  /* Color display small component */
  function ColorDisplay({ color }) {
    const name = typeof color === "string" ? color : (color && (color.label || color.name)) || String(color || "");
    const final = resolveColor(color);
    const nearestLabel = getNearestColorLabel(color);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerColor, setPickerColor] = useState(final);

    useEffect(() => {
      setPickerColor(final);
    }, [final]);

    return (
      <div className="flex items-center gap-3 ml-2 relative">
        <button onClick={() => setPickerOpen((s) => !s)} aria-label={`Color ${name}`} type="button" className="p-0 border-0">
          <div aria-hidden style={{ backgroundColor: final, width: 20, height: 20, borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)" }} title={final} />
        </button>

        <div className="text-xs text-gray-600 dark:text-gray-300 leading-none">
          <div className="leading-none">{String(name)}</div>
          <div className="text-[11px] leading-none">{String(final).toUpperCase()} • {nearestLabel}</div>
        </div>

        {pickerOpen && (
          <div className="absolute z-40 top-full right-0 mt-2">
            <div className="bg-white dark:bg-gray-900 p-2 rounded shadow">
              <SketchPicker
                color={pickerColor}
                onChange={(col) => {
                  setPickerColor(col.hex);
                }}
                onChangeComplete={(col) => {
                  setPickerColor(col.hex);
                }}
              />
              <div className="mt-2 flex gap-2">
                <button onClick={() => setPickerOpen(false)} className="px-3 py-1 rounded border bg-white dark:bg-gray-800 text-black dark:text-white">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen text-black dark:text-white pb-20">
      <div className="container mx-auto p-6 space-y-8">
        {/* Gallery + details */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border border-gray-200/60 dark:border-gray-700/60">
          <div className="relative">
            <div className="relative">
              <button type="button" onClick={() => openLightbox(selectedImage)} aria-label="Open gallery" className="w-full block">
                <img src={galleryImages[selectedImage]} alt={`${product.name} - image ${selectedImage + 1}`} className="w-full h-[460px] object-cover rounded-xl shadow" />
              </button>
              <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded">
                {selectedImage + 1}/{galleryImages.length}
              </div>

              <button onClick={prevImage} type="button" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30" aria-label="Previous image">
                <ChevronLeft />
              </button>
              <button onClick={nextImage} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30" aria-label="Next image">
                <ChevronRight />
              </button>
            </div>

            <div className="flex gap-3 mt-4 overflow-x-auto thumbs-container py-1" role="tablist" aria-label="Product images">
              {galleryImages.map((g, i) => {
                const isActive = i === selectedImage;
                return (
                  <button key={`${g}-${i}`} onClick={() => setSelectedImage(i)} aria-selected={isActive} aria-label={`Image ${i + 1}`} title={`Image ${i + 1}`} type="button" role="tab" className="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden focus:outline-none">
                    <div className={`w-full h-full rounded-md border transition-all duration-200 overflow-hidden ${isActive ? "border-2 border-black dark:border-white shadow-md" : "border border-gray-300 dark:border-gray-700 hover:border-gray-500"}`}>
                      <img src={g} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div className="pr-4">
                <h1 className="text-3xl font-bold mb-2 text-black dark:text-white">{product.name}</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{product.description}</p>
                <div className="text-2xl font-semibold mb-2">{formatINR(product.price)}</div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button onClick={handleTopWishlistToggle} disabled={wlBusyTop} aria-pressed={isWishlisted} aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 border hover:shadow focus:outline-none">
                  <Heart className={`${isWishlisted ? "text-red-500" : "text-gray-600"} w-5 h-5`} />
                </button>
              </div>
            </div>

            <div className="mb-4">
              {availableStock <= 0 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-red-600 text-white text-sm font-semibold">Out of stock</div>
              ) : availableStock <= 10 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-amber-500 text-black text-sm font-semibold">Only {availableStock} left</div>
              ) : availableStock <= 20 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-amber-200 text-black text-sm font-semibold">Only a few left</div>
              ) : (
                <div className="inline-block px-3 py-1 rounded-full bg-green-600 text-white text-sm font-semibold">In stock</div>
              )}
            </div>

            {requiresColor && (
              <div className="mb-4">
                <div className="font-medium mb-2">Color</div>
                <div className="flex gap-3 items-center">
                  {(product.colors || []).map((c, idx) => {
                    const name = typeof c === "string" ? c : (c && (c.label || c.name)) || String(c || "");
                    const hex = resolveColor(c);
                    const isSelected = sanitizeColorNameForLookup(String(selectedColor)) === sanitizeColorNameForLookup(String(c)) || String(selectedColor) === String(name);
                    const border = isSelected ? "ring-2 ring-offset-1 ring-black dark:ring-white" : "border border-gray-300 dark:border-gray-700";
                    return (
                      <button
                        key={`${String(name)}-${idx}`}
                        onClick={() => setSelectedColor(c)}
                        aria-label={`color-${name} ${hex ? `(${hex})` : ""}`}
                        aria-pressed={isSelected}
                        className={`w-10 h-10 rounded-full focus:outline-none ${isSelected ? "shadow-inner" : ""} ${border}`}
                        style={{ backgroundColor: hex }}
                        title={`${name} ${hex ? `(${hex})` : ""}`}
                        type="button"
                      />
                    );
                  })}
                  {(product.colors || []).length === 0 && <div className="text-sm text-gray-500">No color options</div>}

                  {selectedColor ? <ColorDisplay color={selectedColor} /> : null}
                </div>

                {allColorNames && allColorNames.length > 0 && <div className="mt-2 text-xs text-gray-500">Available colors: {allColorNames.join(" — ")}</div>}
              </div>
            )}

            {requiresSize && (
              <div className="mb-4">
                <div className="font-medium mb-2">Size</div>
                <div className="flex gap-3">
                  {(product.sizes || []).map((s) => {
                    const active = String(selectedSize) === String(s);
                    return (
                      <button key={String(s)} onClick={() => setSelectedSize(s)} className={`px-4 py-2 rounded-lg border ${active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-100 dark:bg-gray-800"}`} aria-pressed={active} type="button">
                        {String(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="font-medium mb-2">Quantity</div>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-1 border rounded" type="button" aria-label="Decrease quantity">-</button>
                <span className="min-w-[36px] text-center" aria-live="polite">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(availableStock || q, q + 1))} className={`px-3 py-1 border rounded ${availableStock <= 0 || quantity >= availableStock ? "opacity-50 cursor-not-allowed" : ""}`} type="button" disabled={availableStock <= 0 || quantity >= availableStock} aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <motion.button onClick={addedToCart ? goToCart : addToCartHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={disablePurchase && !addedToCart} className={`cssbuttons-io small shadow-neon-black flex-1 py-2 rounded-full flex items-center justify-center gap-2 transition ${disablePurchase && !addedToCart ? "opacity-50 cursor-not-allowed" : "bg-black text-white"}`} aria-label={addedToCart ? "Go to cart" : "Add to cart"} type="button">
                <ShoppingCart /> <span className="label">{addedToCart ? "Go to Cart" : "Add to Cart"}</span>
              </motion.button>

              <motion.button onClick={buyNowHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={disablePurchase} className={`cssbuttons-io small shadow-neon-black flex-1 py-2 rounded-full flex items-center justify-center gap-2 transition ${disablePurchase ? "opacity-50 cursor-not-allowed bg-white text-black border" : "bg-white text-black border"}`} aria-label="Buy now" type="button">
                <CreditCard /> <span className="label">Buy Now</span>
              </motion.button>

              <button onClick={handleShare} type="button" className="p-2 rounded-full border ml-1 hover:scale-105 transition" aria-label="Share product">
                <MessageCircle />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <input placeholder="PIN code (e.g. 123 456)" value={zipDisplay} onChange={(e) => formatZipInput(e.target.value)} className="p-3 border rounded-full w-48 bg-white dark:bg-gray-900 text-black dark:text-white" inputMode="numeric" aria-label="PIN code" />
              <button onClick={checkDelivery} className={`${actionButtonClass}`} type="button"><MapPin size={16} /> Check</button>
              <div className="text-sm text-gray-600 dark:text-gray-300 ml-4">
                {deliveryMsg ? <span className={`${deliveryMsg.ok ? "text-black dark:text-white" : "text-red-600 dark:text-red-400"}`}>{deliveryMsg.text}</span> : <span>Check estimated delivery</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Lightbox modal */}
        {lightboxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80" onClick={closeLightbox} />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative max-w-5xl w-full mx-4">
              <div className="relative">
                <img src={galleryImages[lightboxIndex]} alt={`Lightbox ${lightboxIndex + 1}`} className="w-full max-h-[80vh] object-contain rounded" />
                <button onClick={closeLightbox} className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800 text-black dark:text-white p-2 rounded-full" aria-label="Close lightbox"><X /></button>

                <button onClick={() => setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800 text-black dark:text-white p-2 rounded-full" aria-label="Previous in lightbox"><ChevronLeft /></button>

                <button onClick={() => setLightboxIndex((i) => (i + 1) % galleryImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800 text-black dark:text-white p-2 rounded-full" aria-label="Next in lightbox"><ChevronRight /></button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Reviews */}
        <Reviews productId={productId} apiBase={API_BASE} currentUser={currentUser} showToast={showToast} />

        {/* Questions & Answers */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-6 border border-gray-200/60 dark:border-gray-700/60">
          <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Questions & Answers</h3>

          <div className="mb-4">
            <div className="flex gap-3">
              <input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Ask a question..." className="flex-1 p-3 border rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white" aria-label="Ask a question" />
              <button onClick={async () => {
                if (!questionText.trim()) return showToast("Type your question first");
                setIsAsking(true);
                try {
                  const payload = {
                    productId,
                    text: questionText.trim(),
                    userId: currentUser?.id || currentUser?._id || null,
                  };
                  const res = await fetch(`${API_BASE}/api/qa`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) throw new Error(`Ask failed (${res.status})`);
                  const saved = await res.json();
                  const inserted = {
                    id: saved.id || saved._id || Date.now(),
                    productId: saved.productId || payload.productId,
                    text: saved.text || payload.text,
                    userId: saved.userId || payload.userId || null,
                    userName: saved.userName || currentUser?.name || saved.name || "You",
                    avatar: saved.avatar || currentUser?.avatar || null,
                    createdAt: saved.createdAt || new Date().toISOString(),
                    answers: (saved.answers || []).map((a) => ({
                      id: a.id || a._id,
                      text: a.text,
                      userId: a.userId || a.user_id,
                      userName: a.userName || a.name || null,
                      avatar: a.avatar || null,
                      createdAt: a.createdAt || new Date().toISOString(),
                      likes: Number(a.likes || 0),
                      dislikes: Number(a.dislikes || 0),
                    })),
                  };
                  setQuestions((prev) => [inserted, ...prev]);
                  setQuestionText("");
                  showToast("Question posted");
                } catch (err) {
                  console.error(err);
                  showToast("Could not post question");
                } finally {
                  setIsAsking(false);
                }
              }} disabled={isAsking || !questionText.trim()} className={`px-4 py-2 rounded-lg ${isAsking || !questionText.trim() ? "opacity-60 cursor-not-allowed bg-gray-200 dark:bg-gray-800" : "bg-black text-white"}`} type="button">
                <MessageCircle size={16} /> {isAsking ? "Posting..." : "Ask"}
              </button>
            </div>
          </div>

          {Array.isArray(questions) && questions.length > 0 ? (
            <ul className="space-y-6">
              {questions.map((q) => {
                const qid = q.id || q._id;
                const displayName = q.userName || q.name || "Anonymous";
                const avatarUrl = q.avatar || null;
                const initials =
                  (displayName || "A")
                    .split(" ")
                    .map((p) => p?.[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "A";

                return (
                  <li key={qid} className="space-y-3">
                    <div className="flex items-start gap-3">
                      {avatarUrl ? (
                        <Avatar alt={displayName} src={avatarUrl} sx={{ width: 40, height: 40 }} />
                      ) : (
                        <Avatar sx={{ width: 40, height: 40, bgcolor: stringToHslColor(displayName || initials), color: "#fff", fontWeight: 600 }}>
                          {initials}
                        </Avatar>
                      )}

                      <div className="flex-1">
                        <div>
                          <p className="font-medium text-black dark:text-white">{displayName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{q.createdAt ? formatRelativeIST(q.createdAt) : ""}</p>
                        </div>

                        <div className="mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-sm text-gray-900 dark:text-gray-100">{q.text}</p>
                        </div>
                      </div>
                    </div>

                    {(q.answers || []).length > 0 && (
                      <div className="ml-12 space-y-3">
                        {q.answers.map((a, idx) => {
                          const aId = a.id || a._id || idx;
                          const aName = a.userName || a.name || "Anonymous";
                          const aAvatar = a.avatar || null;
                          const initialsA = (aName || "A").split(" ").map((p) => p?.[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
                          const isLast = idx === (q.answers || []).length - 1;
                          return (
                            <div key={aId} className="flex items-start gap-3" ref={(el) => { if (isLast) lastAnswerRef.current[qid] = el; }}>
                              {aAvatar ? (
                                <Avatar alt={aName} src={aAvatar} sx={{ width: 36, height: 36 }} />
                              ) : (
                                <Avatar sx={{ width: 36, height: 36, bgcolor: stringToHslColor(aName || initialsA), color: "#fff", fontWeight: 600, fontSize: 12 }}>
                                  {initialsA}
                                </Avatar>
                              )}

                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-black dark:text-white">{aName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{a.createdAt ? formatRelativeIST(a.createdAt) : ""}{a.optimistic ? " (sending...)" : ""}</p>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <button onClick={() => { handleVote(aId, "answer", "like"); }} className={`flex items-center gap-1 px-2 py-1 rounded ${userVotes[aId] === "like" ? "bg-green-100 dark:bg-green-900/40" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`} type="button" aria-label="Like answer">
                                      <ThumbsUp size={14} /> <span>{a.likes || 0}</span>
                                    </button>
                                    <button onClick={() => { handleVote(aId, "answer", "dislike"); }} className={`flex items-center gap-1 px-2 py-1 rounded ${userVotes[aId] === "dislike" ? "bg-red-100 dark:bg-red-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`} type="button" aria-label="Dislike answer">
                                      <ThumbsDown size={14} /> <span>{a.dislikes || 0}</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-1 bg-gray-50 dark:bg-gray-800/70 rounded-lg p-3">
                                  <p className="text-sm text-gray-900 dark:text-gray-100">{a.text}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="ml-12 mt-2 flex gap-2 items-start">
                      <input value={answerInputs[qid] || ""} onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [qid]: e.target.value }))} placeholder="Write an answer..." className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-900 text-sm text-black dark:text-white" aria-label={`Answer to question ${qid}`} />
                      <button onClick={async () => {
                        const text = (answerInputs[qid] || "").trim();
                        if (!text) return showToast("Type an answer first");
                        setAnswerLoading((s) => ({ ...s, [qid]: true }));
                        setAnswerInputs((s) => ({ ...s, [qid]: "" }));
                        try {
                          await handlePostAnswer(qid, text);
                          showToast("Answer posted");
                        } catch {
                          showToast("Could not post answer");
                        } finally {
                          setAnswerLoading((s) => ({ ...s, [qid]: false }));
                        }
                      }} disabled={(answerLoading[qid] === true) || !(answerInputs[qid] && answerInputs[qid].trim())} className={`px-3 py-2 rounded-full border ${answerLoading[qid] ? "opacity-60 cursor-not-allowed" : "bg-black text-white"}`} type="button" aria-label={`Post answer to question ${qid}`}>
                        {answerLoading[qid] ? "..." : <Send size={14} />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">No questions yet.</p>
          )}
        </section>

        {/* Related products */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-6 border border-gray-200/60 dark:border-gray-700/60">
          <h2 className="text-xl font-bold mb-4 text-black dark:text-white">You might be interested in</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(relatedProducts && relatedProducts.length ? relatedProducts : [1, 2, 3, 4]).map((p, i) => (
              <ProductCard key={p?.id || p?._id || i} product={
                typeof p === "object"
                  ? { id: p.id || p._id, name: p.name || p.title || `Product ${i + 1}`, price: p.price || 2499, images: p.images || (p.image ? [p.image] : []) }
                  : { id: i + 1, name: `Product ${p}`, price: 2499, images: [galleryImages[0]] }
              } />
            ))}
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed right-6 top-6 z-60">
          <div className="px-4 py-2 rounded shadow bg-black text-white">{toast}</div>
        </div>
      )}
    </div>
  );
}
