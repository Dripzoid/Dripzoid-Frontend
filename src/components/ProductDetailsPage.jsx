// src/components/ProductDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar } from "@mui/material";
import {
  Heart,
  ShoppingCart,
  CreditCard,
  Share2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

import ProductCard from "./ProductCard";
import Reviews from "./Reviews";
import ProductGallery from "./ProductGallery";
import ColorDisplay from "./ColorDisplay";
import SizeSelector from "./SizeSelector";
import QuantityPicker from "./QuantityPicker";
import PurchaseBar from "./PurchaseBar";
import Lightbox from "./Lightbox";

import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import { UserContext } from "../contexts/UserContext.js";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function stringToHslColor(str = "", s = 65, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function sanitizeColorNameForLookup(name = "") {
  return String(name || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

function resolveColor(input) {
  // Accepts: hex string (#fff, #ffffff), rgb(...), named color, or an object { hex, name }
  if (!input && input !== 0) return "#ddd";
  if (typeof input === "object") {
    if (input.hex) return input.hex;
    if (input.color) return input.color;
    if (input.name) return stringToHslColor(String(input.name));
  }
  const s = String(input).trim();
  // hex
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  // rgb()
  if (/^rgb\(/i.test(s)) return s;
  // common color name -> use as-is; otherwise fallback to HSL generator
  return stringToHslColor(s);
}

function colorEquals(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return sanitizeColorNameForLookup(String(a)) === sanitizeColorNameForLookup(String(b));
}

function sizeEquals(a, b) {
  if (a === b) return true;
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

export default function ProductDetailsPage() {
  const { id: routeProductId } = useParams();
  const productId = routeProductId || "";
  const navigate = useNavigate();

  const { addToCart, buyNow: ctxBuyNow, cart = [], fetchCart } = useCart() || {};
  const wishlistCtx = useWishlist() || {};
  const { user: ctxUser } = useContext(UserContext) || {};

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wlBusy, setWlBusy] = useState(false);
  const [wlBusyTop, setWlBusyTop] = useState(false);

  const [descExpanded, setDescExpanded] = useState(false);
  const [zipRaw, setZipRaw] = useState("");
  const [zipDisplay, setZipDisplay] = useState("");
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [deliveryMsg, setDeliveryMsg] = useState(null);

  const [toastMsg, setToastMsg] = useState(null);
  const toastTimerRef = useRef(null);

  const touchStartXRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // small responsive tracking
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function showToast(msg, ttl = 3500) {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (msg) toastTimerRef.current = setTimeout(() => setToastMsg(null), ttl);
  }

  // Fetch product details
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!productId) return;
      try {
        const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}`);
        if (!res.ok) {
          // fallback: try search endpoint
          const r2 = await fetch(`${API_BASE}/api/products?slug=${encodeURIComponent(productId)}`);
          if (!r2.ok) {
            console.warn("Could not load product", productId);
            return;
          }
          const j2 = await r2.json();
          if (!alive) return;
          setProduct(Array.isArray(j2) ? j2[0] : j2);
          return;
        }
        const json = await res.json();
        if (!alive) return;
        // normalize if wrapper
        setProduct(json?.data ?? json?.product ?? json);
      } catch (err) {
        console.warn("product fetch failed", err);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [productId]);

  // derived: sizeStockMap (if product.size_stock JSON or similar exists)
  const sizeStockMap = useMemo(() => {
    if (!product) return {};
    if (product.size_stock && typeof product.size_stock === "object" && !Array.isArray(product.size_stock)) {
      // already object
      const out = {};
      Object.keys(product.size_stock).forEach((k) => (out[String(k)] = Number(product.size_stock[k] || 0)));
      return out;
    }
    if (product.size_stock && typeof product.size_stock === "string") {
      try {
        const parsed = JSON.parse(product.size_stock);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const out = {};
          Object.keys(parsed).forEach((k) => (out[String(k)] = Number(parsed[k] || 0)));
          return out;
        }
      } catch {}
    }
    return {};
  }, [product]);

  const requiresSize = useMemo(() => {
    if (sizeStockMap && Object.keys(sizeStockMap).length) return true;
    if (Array.isArray(product?.sizes) && product.sizes.length) return true;
    if (product?.sizes && typeof product.sizes === "string" && product.sizes.trim()) return true;
    return false;
  }, [product, sizeStockMap]);

  const requiresColor = useMemo(() => {
    return Array.isArray(product?.colors) && product.colors.length > 0;
  }, [product]);

  // color->images mapping & gallery
  const colorImageMap = useMemo(() => {
    const imgs = Array.isArray(product?.images) ? product.images.slice() : [];
    const colors = Array.isArray(product?.colors) ? product.colors.slice() : [];
    const map = {};
    if (!imgs.length) {
      map.__all__ = ["/placeholder.png"];
      return map;
    }
    if (!colors.length) {
      map.__all__ = imgs;
      return map;
    }

    // naive distribution: if fewer images than colors, map first images to colors; otherwise chunk evenly
    const nImgs = imgs.length;
    const nColors = colors.length;
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
  }, [product]);

  const galleryImages = useMemo(() => {
    const imgsAll = colorImageMap.__all__ || [];
    if (!requiresColor) {
      return imgsAll.length ? imgsAll : ["/placeholder.png"];
    }
    const key = sanitizeColorNameForLookup(String(selectedColor || ""));
    let imgs = colorImageMap[key];
    if (!imgs) {
      const colors = Array.isArray(product?.colors) ? product.colors : [];
      const firstKey = sanitizeColorNameForLookup(String(colors[0] || ""));
      imgs = colorImageMap[firstKey] || imgsAll;
    }
    return imgs && imgs.length ? imgs : ["/placeholder.png"];
  }, [colorImageMap, requiresColor, selectedColor, product]);

  // ensure selectedImage index is within bounds when gallery changes
  useEffect(() => {
    setSelectedImage((s) => {
      if (!galleryImages || galleryImages.length === 0) return 0;
      return Math.min(s, galleryImages.length - 1);
    });
  }, [galleryImages.length, selectedColor]);

  // selectedVariant (if product.variants exists)
  const selectedVariant = useMemo(() => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) return null;
    return (
      variants.find((v) => {
        const vColor = v.color ?? v.colour ?? v.variantColor ?? v.attributes?.color;
        const vSize = v.size ?? v.variantSize ?? v.attributes?.size;
        const okColor = requiresColor ? colorEquals(vColor, selectedColor) : true;
        const okSize = requiresSize ? sizeEquals(vSize, selectedSize) : true;
        return okColor && okSize;
      }) || null
    );
  }, [product, selectedColor, selectedSize, requiresColor, requiresSize]);

  // availableStock derived with priority (variant -> per-size map -> product stock)
  const availableStock = useMemo(() => {
    if (selectedVariant && selectedVariant.stock != null) return Number(selectedVariant.stock || 0);
    if (requiresSize && selectedSize) {
      const v = sizeStockMap && typeof sizeStockMap === "object" ? sizeStockMap[String(selectedSize)] : undefined;
      return Number(v ?? 0);
    }
    if (requiresSize && (!selectedSize || selectedSize === "")) {
      const total = Object.values(sizeStockMap || {}).reduce((acc, x) => acc + Number(x || 0), 0);
      return total || Number(product?.stock ?? product?.totalStock ?? 0);
    }
    const s = product?.stock ?? product?.inventory ?? product?.quantity ?? product?.totalStock ?? 0;
    return Number(s || 0);
  }, [selectedVariant, requiresSize, selectedSize, sizeStockMap, product]);

  const disablePurchase = useMemo(() => {
    return availableStock <= 0 || (requiresColor && !selectedColor) || (requiresSize && !selectedSize);
  }, [availableStock, requiresColor, requiresSize, selectedColor, selectedSize]);

  // check if product is added to cart (simple heuristic)
  const addedToCart = useMemo(() => {
    try {
      const pid = product?.id ?? product?._id ?? product?.product_id;
      return Array.isArray(cart) && cart.some((it) => {
        if (!it) return false;
        const p = it.product ?? it.item ?? it;
        const itemPid = p?.id ?? p?._id ?? p?.product_id;
        if (!itemPid) return false;
        if (String(itemPid) !== String(pid)) return false;
        // check options if present
        const sameColor = !selectedColor || !it.selectedColor || colorEquals(it.selectedColor, selectedColor);
        const sameSize = !selectedSize || !it.selectedSize || sizeEquals(it.selectedSize, selectedSize);
        return sameColor && sameSize;
      });
    } catch {
      return false;
    }
  }, [cart, product, selectedColor, selectedSize]);

  // format currency INR
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

  // small helpers
  function prevImage() {
    setSelectedImage((s) => (s - 1 + galleryImages.length) % galleryImages.length);
  }
  function nextImage() {
    setSelectedImage((s) => (s + 1) % galleryImages.length);
  }

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

  // wishlist toggle (basic)
  async function handleTopWishlistToggle() {
    if (!wishlistCtx || !wishlistCtx.toggle) {
      showToast("Wishlist not available");
      return;
    }
    setWlBusyTop(true);
    try {
      await wishlistCtx.toggle(product);
      setIsWishlisted((s) => !s);
    } catch (err) {
      console.warn("wishlist toggle failed", err);
      showToast("Could not update wishlist");
    } finally {
      setWlBusyTop(false);
    }
  }

  async function addToCartHandler() {
    if (!addToCart) {
      showToast("Cart not available");
      return;
    }
    if (disablePurchase && !addedToCart) {
      showToast("Please select size and color");
      return;
    }
    try {
      const payload = {
        product: product,
        quantity: Number(quantity || 1),
        product_id: product?.id ?? product?._id ?? null,
        price: product?.price ?? product?.cost ?? 0,
        images: Array.isArray(product?.images) ? product.images.join(",") : product?.images ?? product?.image ?? "",
        selectedColor: selectedColor || null,
        selectedSize: selectedSize || null,
        variantId: selectedVariant?.id || selectedVariant?._id || null,
      };
      await addToCart(payload);
      showToast("Added to cart");
      if (fetchCart) fetchCart();
    } catch (err) {
      console.error("addToCart failed", err);
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
    const url = typeof window !== "undefined" ? window.location.href : "/";
    if (navigator.share) {
      try {
        await navigator.share({ title: product?.name || "Product", url });
      } catch (err) {
        showToast("Share cancelled");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Could not copy link");
    }
  }

  function formatZipInput(raw) {
    const cleaned = String(raw || "").replace(/[^\d]/g, "").slice(0, 6);
    setZipRaw(cleaned);
    setZipDisplay(cleaned.replace(/(\d{3})(\d{0,3})/, (_, a, b) => (b ? `${a} ${b}` : a)));
  }

  async function checkDelivery() {
    const pin = zipRaw.trim();
    if (!/^\d{6}$/.test(pin)) {
      setDeliveryMsg({ ok: false, text: "Please enter a valid 6-digit PIN" });
      return;
    }
    setIsCheckingDelivery(true);
    try {
      const url = `${API_BASE}/api/shipping/estimate?pin=${encodeURIComponent(pin)}&cod=0`;
      const res = await fetch(url);

      if (!res.ok) {
        setDeliveryMsg({ ok: false, text: "Could not fetch delivery estimate" });
        return;
      }

      const json = await res.json();
      const companies = json?.estimate || [];

      if (Array.isArray(companies) && companies.length > 0) {
        const sorted = companies.filter((c) => c && c.etd).sort((a, b) => new Date(a.etd) - new Date(b.etd));
        const best = sorted[0] || companies[0];
        const etdRaw = best.etd || best.estimated_delivery;

        if (etdRaw) {
          const date = new Date(etdRaw);
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const dayName = days[date.getDay()];
          const day = String(date.getDate()).padStart(2, "0");
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          setDeliveryMsg({ ok: true, text: `Delivery Expected by ${dayName}, ${day}-${month}-${year}` });
          return;
        }
      }

      setDeliveryMsg({ ok: false, text: "Sorry, delivery is not available to this PIN" });
    } catch (err) {
      console.warn("shipping estimate failed", err);
      setDeliveryMsg({ ok: false, text: "Could not fetch delivery estimate" });
    } finally {
      setIsCheckingDelivery(false);
    }
  }

  if (!product) {
    return <div className="p-8 text-center text-black dark:text-white">Loading product...</div>;
  }

  // derived UI helpers
  const shortDescLimit = 160;
  const descriptionText = product.description || "";

  return (
    <div className="bg-white dark:bg-black min-h-screen text-black dark:text-white pb-32">
      <div className="max-w-screen-xl mx-auto p-4 md:p-6 space-y-8">
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border border-gray-200/60 dark:border-gray-700/60">
          {/* Left: gallery */}
          <div>
            <div className="relative">
              <button
                onClick={() => openLightbox(selectedImage)}
                className="w-full block rounded-xl overflow-hidden"
                aria-label="Open image"
              >
                <img
                  src={galleryImages[selectedImage]}
                  alt={`${product.name} - image ${selectedImage + 1}`}
                  className="w-full h-[48vw] sm:h-[380px] md:h-[460px] lg:h-[520px] object-cover rounded-xl shadow transition-transform duration-300 hover:scale-[1.01]"
                />
              </button>

              <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                {selectedImage + 1}/{galleryImages.length}
              </div>

              <button
                onClick={prevImage}
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30"
                aria-label="Previous image"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={nextImage}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30"
                aria-label="Next image"
              >
                <ChevronRight />
              </button>
            </div>

            <div className="flex gap-3 mt-3 overflow-x-auto thumbs-container py-1 snap-x snap-mandatory">
              {galleryImages.map((g, i) => {
                const isActive = i === selectedImage;
                return (
                  <button
                    key={`${g}-${i}`}
                    onClick={() => setSelectedImage(i)}
                    aria-selected={isActive}
                    aria-label={`Image ${i + 1}`}
                    title={`Image ${i + 1}`}
                    type="button"
                    className="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden focus:outline-none snap-start"
                    style={{ scrollSnapAlign: "center" }}
                  >
                    <div className={`w-full h-full rounded-md border transition-all duration-200 overflow-hidden ${isActive ? "border-2 border-black dark:border-white shadow-md" : "border border-gray-300 dark:border-gray-700 hover:border-gray-500"}`}>
                      <img src={g} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: meta */}
          <div>
            <div className="flex items-start justify-between">
              <div className="pr-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-black dark:text-white">{product.name}</h1>

                <div className="mb-3">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    {!descriptionText || descriptionText.length <= shortDescLimit ? (
                      descriptionText
                    ) : descExpanded ? (
                      <>
                        {descriptionText}
                        <button onClick={() => setDescExpanded(false)} className="ml-2 text-sm font-medium underline underline-offset-2" aria-expanded="true" type="button">
                          Read less
                        </button>
                      </>
                    ) : (
                      <>
                        {descriptionText.slice(0, shortDescLimit).trim()}.
                        <button onClick={() => setDescExpanded(true)} className="ml-2 text-sm font-medium underline underline-offset-2" aria-expanded="false" type="button">
                          Read more
                        </button>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-2xl font-semibold mb-2">{formatINR(product.price)}</div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button onClick={handleTopWishlistToggle} disabled={wlBusyTop} aria-pressed={isWishlisted} aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 border hover:shadow focus:outline-none">
                  <Heart className={`${isWishlisted ? "text-black dark:text-white" : "text-gray-600"} w-5 h-5`} />
                </button>
              </div>
            </div>

            <div className="mb-4">
              {availableStock <= 0 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-black text-white text-sm font-semibold">Out of stock</div>
              ) : availableStock <= 10 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">Only {availableStock} left</div>
              ) : availableStock <= 20 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">Only a few left</div>
              ) : (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">In stock</div>
              )}
            </div>

            {requiresColor && (
              <div className="mb-4">
                <div className="font-medium mb-2">Color</div>
                <div className="flex gap-3 items-center">
                  {(product.colors || []).map((c, idx) => {
                    const name = typeof c === "string" ? c : (c && (c.label || c.name)) || String(c || "");
                    const hex = resolveColor(c);
                    const isSelected = colorEquals(c, selectedColor);
                    return (
                      <button
                        key={`${String(name)}-${idx}`}
                        onClick={() => setSelectedColor(c)}
                        aria-label={`color-${name} ${hex ? `(${hex})` : ""}`}
                        aria-pressed={isSelected}
                        className={`w-9 h-9 md:w-10 md:h-10 rounded-full focus:outline-none ${isSelected ? "shadow-inner ring-2 ring-offset-1 ring-black dark:ring-white" : "border border-gray-300 dark:border-gray-700"}`}
                        style={{ backgroundColor: hex }}
                        title={`${name} ${hex ? `(${hex})` : ""}`}
                        type="button"
                      />
                    );
                  })}
                  {selectedColor && (
                    <ColorDisplay color={selectedColor} resolveColor={resolveColor} getNearestColorLabel={(c) => String(c)} />
                  )}
                </div>
              </div>
            )}

            {requiresSize && (
              <div className="mb-4">
                <div className="font-medium mb-2">Size</div>
                <div className="flex gap-3 flex-wrap">
                  {(product.sizes || Object.keys(sizeStockMap) || []).map((s) => {
                    const label = typeof s === "string" ? s : (s && (s.size || s.name)) || String(s || "");
                    const active = sizeEquals(label, selectedSize);
                    return (
                      <button
                        key={String(label)}
                        onClick={() => {
                          setSelectedSize(label);
                          const avail = Number(sizeStockMap && sizeStockMap[String(label)] || 0);
                          setQuantity(avail > 0 ? 1 : 0);
                        }}
                        className={`px-3 py-2 rounded-lg border text-sm ${active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-100 dark:bg-gray-800"}`}
                        aria-pressed={active}
                        type="button"
                      >
                        {String(label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="font-medium mb-2">Quantity</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => {
                    if (!q || q <= 0) return 0;
                    return Math.max(1, q - 1);
                  })}
                  className="px-3 py-1 border rounded"
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="min-w-[36px] text-center" aria-live="polite">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => {
                    const avail = Number(availableStock || 0);
                    if (avail <= 0) return 0;
                    const curr = q || 0;
                    return Math.min(avail, curr + 1);
                  })}
                  className={`px-3 py-1 border rounded ${availableStock <= 0 || quantity >= availableStock ? "opacity-50 cursor-not-allowed" : ""}`}
                  type="button"
                  disabled={availableStock <= 0 || quantity >= availableStock}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3 items-center flex-col md:flex-row">
              <motion.button onClick={addedToCart ? goToCart : addToCartHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={disablePurchase && !addedToCart} className={`w-full md:flex-1 py-3 rounded-full flex items-center justify-center gap-2 transition ${disablePurchase && !addedToCart ? "opacity-50 cursor-not-allowed bg-gray-100 text-black" : "bg-black text-white"}`} aria-label={addedToCart ? "Go to cart" : "Add to cart"} type="button">
                <ShoppingCart /> <span className="label">{addedToCart ? "Go to Cart" : "Add to Cart"}</span>
              </motion.button>

              <motion.button onClick={buyNowHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={disablePurchase} className={`w-full md:flex-1 py-3 rounded-full flex items-center justify-center gap-2 transition ${disablePurchase ? "opacity-50 cursor-not-allowed bg-white text-black border" : "bg-white text-black border"}`} aria-label="Buy now" type="button">
                <CreditCard /> <span className="label">Buy Now</span>
              </motion.button>

              <button onClick={handleShare} type="button" className="p-2 rounded-full border ml-0 md:ml-1 hover:scale-105 transition" aria-label="Share product">
                <Share2 />
              </button>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-3">
              <input placeholder="PIN code (e.g. 123 456)" value={zipDisplay} onChange={(e) => formatZipInput(e.target.value)} className="p-3 border rounded-full w-full md:w-48 bg-white dark:bg-gray-900 text-black dark:text-white" inputMode="numeric" aria-label="PIN code" />
              <button onClick={checkDelivery} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border" type="button" disabled={isCheckingDelivery}>
                <MapPin size={16} />
                {isCheckingDelivery ? "Checking..." : "Check"}
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-300 ml-0 md:ml-4">
                {deliveryMsg ? <span className={`${deliveryMsg.ok ? "text-black dark:text-white" : "text-red-600 dark:text-red-400"}`}>{deliveryMsg.text}</span> : <span>Check estimated delivery</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews - single placement. Pass isDesktop to allow Reviews to avoid duplicate histogram on mobile */}
        <div className="w-full">
          <Reviews productId={productId} apiBase={API_BASE} currentUser={ctxUser} showToast={showToast} isDesktop={isDesktop} />
        </div>

        {/* Questions & Answers placeholder kept minimal (you can re-add logic you had earlier) */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">
          <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Questions & Answers</h3>
          <p className="text-sm text-gray-500">Questions and answers for this product (existing Q&A components remain unchanged).</p>
        </section>
      </div>

      {/* PurchaseBar handles mobile sticky purchase CTA */}
      <PurchaseBar
        addedToCart={addedToCart}
        goToCart={goToCart}
        addToCartHandler={addToCartHandler}
        buyNowHandler={buyNowHandler}
        disablePurchase={disablePurchase}
        handleShare={handleShare}
      />

      {/* lightbox */}
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

      {/* mobile toast */}
      {toastMsg && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
          <div className="px-4 py-2 bg-black text-white rounded-full shadow">{toastMsg}</div>
        </div>
      )}
    </div>
  );
}
