// src/pages/ProductDetailsPage.jsx
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Share2,
  Heart,
  ShoppingCart,
  CreditCard,
  Send,
  ThumbsUp,
  ThumbsDown,
  X,
} from "lucide-react";
import { Avatar } from "@mui/material";
import Reviews from "../components/Reviews"; // ensure correct path
import ProductCard from "../components/ProductCard"; // ensure correct path
import { useCart } from "../contexts/CartContext"; // adapt if different
import { useWishlist } from "../contexts/WishlistContext"; // adapt if different
import { UserContext } from "../contexts/UserContext"; // adapt if different

// --- constants (adapt if you already have them elsewhere) ---
const API_BASE = process.env.REACT_APP_API_BASE || "/api";

// --- helper functions (kept similar to your uploaded file) ---
function stringToHslColor(str = "", s = 65, l = 40) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function formatRelativeIST(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return String(date);
  }
}

/* -------------------- MAIN COMPONENT -------------------- */
export default function ProductDetailsPage() {
  const { id: routeProductId } = useParams();
  const productId = routeProductId || "demo-kurta-1";
  const navigate = useNavigate();

  // contexts (adapt if your hooks differ)
  const { addToCart, buyNow: ctxBuyNow, cart = [], fetchCart } = useCart() || {};
  const wishlistCtx = useWishlist() || {};
  const {
    wishlist = [],
    addToWishlist = async () => {},
    removeFromWishlist = async () => {},
    fetchWishlist = async () => {},
  } = wishlistCtx;
  const { user: ctxUser } = useContext(UserContext) || {};

  // local state
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
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);

  // gallery & lightbox
  const [galleryImages, setGalleryImages] = useState([
    // fallback images; will be replaced by product.images when loaded
    "https://via.placeholder.com/1200x900?text=Product+Image",
  ]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // description expand
  const [descExpanded, setDescExpanded] = useState(false);

  // toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  function showToast(message, ttl = 3500) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), ttl);
  }
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (ctxUser) setCurrentUser(ctxUser);
  }, [ctxUser]);

  // wishlist helper
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
      String(
        w.product_id ?? w.id ?? w.productId ?? (w.product && w.product.id) ?? ""
      ) === String(canonicalPid)
    );
  }, [wishlist, canonicalPid]);

  const [wlBusyTop, setWlBusyTop] = useState(false);
  async function handleTopWishlistToggle() {
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
      console.warn("Wishlist toggle failed", err);
      showToast("Wishlist action failed");
    } finally {
      setWlBusyTop(false);
    }
  }

  // fetch product + qa + related
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
          try {
            const qdata = await qRes.json();
            if (Array.isArray(qdata)) qjson = qdata;
            else if (Array.isArray(qdata.questions)) qjson = qdata.questions;
            else if (Array.isArray(qdata.data)) qjson = qdata.data;
            else qjson = [];
          } catch {
            qjson = [];
          }
        }

        if (!mounted) return;

        setProduct(pjson || null);
        const imgs =
          (pjson && (pjson.images || pjson.image || pjson.gallery || [])) ||
          [];
        setGalleryImages(Array.isArray(imgs) && imgs.length ? imgs : galleryImages);

        // simple QA enrichment (just set)
        setQuestions(qjson || []);

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
          const filtered = Array.isArray(list) ? list : [];
          setRelatedProducts(filtered);
        } catch (err) {
          console.warn("related fetch failed", err);
        }
      } catch (err) {
        console.error("loadAll failed", err);
        if (mounted) setProduct(null);
      }
    }
    loadAll();
    return () => {
      mounted = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // gallery helpers
  const prevImage = () => {
    setSelectedImage((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  };
  const nextImage = () => {
    setSelectedImage((i) => (i + 1) % galleryImages.length);
  };
  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);

  // zip formatting
  function formatZipInput(val) {
    const digits = String(val || "").replace(/\D/g, "").slice(0, 6);
    setZipRaw(digits);
    if (digits.length <= 3) setZipDisplay(digits);
    else setZipDisplay(digits.slice(0, 3) + " " + digits.slice(3));
  }

  // CHECK DELIVERY with spinner
  async function checkDelivery() {
    const pin = zipRaw.trim();
    if (!/^\d{6}$/.test(pin)) {
      setDeliveryMsg({ ok: false, text: "Please enter a valid 6-digit PIN" });
      return;
    }
    setIsCheckingDelivery(true);
    setDeliveryMsg(null);
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
        const sorted = companies
          .filter((c) => c && c.etd)
          .sort((a, b) => new Date(a.etd) - new Date(b.etd));
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
          setDeliveryMsg({
            ok: true,
            text: `Delivery expected by ${dayName}, ${day} ${month} ${year}`,
          });
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

  // UI helpers
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

  // Add to cart / buy handlers (preserve your previous behaviour)
  function goToCart() {
    navigate("/cart");
  }
  function buyNowHandler() {
    const needSelectionError = false; // adapt if requiresColor/Size logic used
    if (needSelectionError) {
      showToast("Select size and color");
      return;
    }
    if (!product) {
      showToast("No product loaded");
      return;
    }
    // construct item then navigate to checkout (kept simple)
    const itemForCheckout = {
      product,
      quantity: Number(quantity || 1),
      product_id: product?.id || product?._id || productId,
      price: product?.price ?? 0,
      images: Array.isArray(product?.images) ? product.images : [galleryImages[0]],
      selectedColor,
      selectedSize,
    };
    navigate("/checkout", {
      state: { items: [itemForCheckout], mode: "buy-now", fromCart: false },
    });
    showToast("Proceeding to checkout...");
  }

  // ensure thumbnails scroll nicely on mobile by using overflow-x-auto
  const isLoaded = Boolean(product);

  // Short-circuit: if product hasn't loaded show placeholder
  if (!isLoaded) {
    return (
      <div className="bg-white dark:bg-black min-h-screen text-black dark:text-white pb-20">
        <div className="container mx-auto p-4 md:p-6">
          <div className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-6 border border-gray-200/60 dark:border-gray-700/60">
            <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded" />
              <div>
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Derived flags
  const descriptionText = product.description || "";
  const shortDescLimit = 160;
  const isLongDescription = descriptionText.length > shortDescLimit;

  return (
    <div className="bg-white dark:bg-black min-h-screen text-black dark:text-white pb-24">
      <div className="container mx-auto p-4 md:p-6 space-y-8">
        {/* Gallery + details */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border border-gray-200/60 dark:border-gray-700/60">
          {/* LEFT: Gallery */}
          <div className="relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => openLightbox(selectedImage)}
                aria-label="Open gallery"
                className="w-full block"
              >
                <img
                  src={galleryImages[selectedImage]}
                  alt={`${product.name} - image ${selectedImage + 1}`}
                  className="w-full h-[56vh] md:h-[60vh] lg:h-[72vh] object-cover rounded-xl shadow"
                />
              </button>

              <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-1 rounded text-xs">
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

            {/* thumbnails, horizontally scrollable on small screens */}
            <div className="flex gap-3 mt-3 overflow-x-auto thumbs-container py-1">
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
                    className="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden focus:outline-none"
                  >
                    <div
                      className={`w-full h-full rounded-md border transition-all duration-200 overflow-hidden ${isActive ? "border-2 border-black dark:border-white shadow-md" : "border border-gray-300 dark:border-gray-700 hover:border-gray-500"}`}
                    >
                      <img src={g} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Details */}
          <div>
            <div className="flex items-start justify-between">
              <div className="pr-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-black dark:text-white">{product.name}</h1>

                <div className="mb-3">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    {!isLongDescription ? (
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
                        {descriptionText.slice(0, shortDescLimit).trim()}...
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
              {product.stock <= 0 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-black text-white text-sm font-semibold">Out of stock</div>
              ) : product.stock <= 10 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">Only {product.stock} left</div>
              ) : (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">In stock</div>
              )}
            </div>

            {/* (Color / Size selectors kept compact - if present) */}
            {product.colors?.length > 0 && (
              <div className="mb-4">
                <div className="font-medium mb-2">Color</div>
                <div className="flex gap-3 items-center flex-wrap">
                  {product.colors.map((c, idx) => {
                    const name = typeof c === "string" ? c : (c && (c.label || c.name)) || String(c || "");
                    const hex = typeof c === "string" && c.startsWith("#") ? c : undefined;
                    const isSelected = String(selectedColor) === String(name);
                    return (
                      <button
                        key={`${String(name)}-${idx}`}
                        onClick={() => setSelectedColor(name)}
                        aria-label={`color-${name}`}
                        aria-pressed={isSelected}
                        className={`w-9 h-9 md:w-10 md:h-10 rounded-full focus:outline-none ${isSelected ? "ring-2 ring-offset-1 ring-black dark:ring-white shadow-inner" : "border border-gray-300 dark:border-gray-700"}`}
                        style={{ backgroundColor: hex || undefined }}
                        title={`${name}`}
                        type="button"
                      >
                        {!hex && <span className="sr-only">{name}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.sizes?.length > 0 && (
              <div className="mb-4">
                <div className="font-medium mb-2">Size</div>
                <div className="flex gap-3 flex-wrap">
                  {product.sizes.map((s) => {
                    const active = String(s) === String(selectedSize);
                    return (
                      <button key={String(s)} onClick={() => setSelectedSize(s)} className={`px-3 py-2 rounded-lg border text-sm ${active ? "bg-black text-white" : "bg-gray-100 dark:bg-gray-800"}`} aria-pressed={active} type="button">
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
                <button onClick={() => setQuantity((q) => Math.min(product.stock || q, q + 1))} className={`px-3 py-1 border rounded ${product.stock <= 0 || quantity >= product.stock ? "opacity-50 cursor-not-allowed" : ""}`} type="button" disabled={product.stock <= 0 || quantity >= product.stock} aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div className="flex gap-3 items-center flex-col md:flex-row">
              <motion.button onClick={addedToCart ? goToCart : () => { addToCart && addToCart({ product, quantity }); setAddedToCart(true); showToast("Added to cart"); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`w-full md:flex-1 py-2 rounded-full flex items-center justify-center gap-2 transition ${product.stock <= 0 ? "opacity-50 cursor-not-allowed" : "bg-black text-white"}`} aria-label={addedToCart ? "Go to cart" : "Add to cart"} type="button">
                <ShoppingCart /> <span className="label">{addedToCart ? "Go to Cart" : "Add to Cart"}</span>
              </motion.button>

              <motion.button onClick={buyNowHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`w-full md:flex-1 py-2 rounded-full flex items-center justify-center gap-2 transition ${product.stock <= 0 ? "opacity-50 cursor-not-allowed bg-white text-black border" : "bg-white text-black border"}`} aria-label="Buy now" type="button">
                <CreditCard /> <span className="label">Buy Now</span>
              </motion.button>

              <button onClick={() => { navigator?.share ? navigator.share({ title: product.name, text: product.description, url: window.location.href }) : (navigator.clipboard && navigator.clipboard.writeText(window.location.href)); showToast("Share options opened or link copied"); }} type="button" className="p-2 rounded-full border ml-0 md:ml-1 hover:scale-105 transition" aria-label="Share product">
                <Share2 />
              </button>
            </div>

            {/* PIN + Delivery check with spinner */}
            <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-3">
              <input placeholder="PIN code (e.g. 123 456)" value={zipDisplay} onChange={(e) => formatZipInput(e.target.value)} className="p-3 border rounded-full w-full md:w-48 bg-white dark:bg-gray-900 text-black dark:text-white" inputMode="numeric" aria-label="PIN code" />
              <button onClick={checkDelivery} disabled={isCheckingDelivery} className={`shadow-[inset_0_0_0_2px_#616467] text-black px-4 py-2 rounded-full tracking-widest uppercase font-bold bg-transparent hover:bg-[#616467] hover:text-white dark:text-neutral-200 transition duration-200 flex items-center gap-2 ${isCheckingDelivery ? "opacity-80 cursor-wait" : ""}`} type="button" aria-live="polite">
                <MapPin size={16} />
                {isCheckingDelivery ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"></path>
                    </svg>
                    Checking...
                  </>
                ) : (
                  "Check"
                )}
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-300 ml-0 md:ml-4">
                {deliveryMsg ? <span className={`${deliveryMsg.ok ? "text-black dark:text-white" : "text-red-600 dark:text-red-400"}`}>{deliveryMsg.text}</span> : <span>Check estimated delivery</span>}
              </div>
            </div>
          </div>
        </section>

        {/* YOU MIGHT LIKE (related) — show grid on desktop, horizontally scrollable on mobile */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">
          <h2 className="text-xl font-bold mb-4 text-black dark:text-white">You might be interested in</h2>
          <div className="md:hidden">
            {/* mobile: horizontally scrollable */}
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
              {(relatedProducts && relatedProducts.length ? relatedProducts : [1, 2, 3, 4]).map((p, i) => {
                const productObj = typeof p === "object"
                  ? { id: p.id || p._id, name: p.name || p.title || `Product ${i + 1}`, price: p.price || 2499, images: p.images || (p.image ? [p.image] : []) }
                  : { id: i + 1, name: `Product ${p}`, price: 2499, images: [galleryImages[0]] };
                return (
                  <div key={productObj.id || i} className="snap-start flex-shrink-0 w-64">
                    <ProductCard product={productObj} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(relatedProducts && relatedProducts.length ? relatedProducts : [1, 2, 3, 4]).map((p, i) => {
              const productObj = typeof p === "object"
                ? { id: p.id || p._id, name: p.name || p.title || `Product ${i + 1}`, price: p.price || 2499, images: p.images || (p.image ? [p.image] : []) }
                : { id: i + 1, name: `Product ${p}`, price: 2499, images: [galleryImages[0]] };
              return <ProductCard key={productObj.id || i} product={productObj} />;
            })}
          </div>
        </section>

        {/* REVIEWS — single placement (just above QA) */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">
          <Reviews productId={productId} apiBase={API_BASE} currentUser={currentUser} showToast={showToast} />
        </section>

        {/* Q & A section */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">
          <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Questions & answers</h2>
          {Array.isArray(questions) && questions.length > 0 ? (
            <ul className="space-y-4">
              {questions.map((q) => {
                const qid = q.id || q._id || Math.random();
                const displayName = q.userName || q.name || "Anonymous";
                const initials = (displayName || "A").split(" ").map((p) => p?.[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
                return (
                  <li key={qid} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar sx={{ width: 40, height: 40, bgcolor: stringToHslColor(displayName || initials), color: "#fff" }}>{initials}</Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-black dark:text-white">{displayName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{q.createdAt ? formatRelativeIST(q.createdAt) : ""}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <button onClick={() => { handleVote && handleVote(qid, "question", "like"); }} className={`flex items-center gap-1 px-2 py-1 rounded ${userVotes[qid] === "like" ? "bg-black/10 dark:bg-white/10" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`} type="button" aria-label="Like question">
                              <ThumbsUp size={14} /> <span>{q.likes || 0}</span>
                            </button>
                            <button onClick={() => { handleVote && handleVote(qid, "question", "dislike"); }} className={`flex items-center gap-1 px-2 py-1 rounded ${userVotes[qid] === "dislike" ? "bg-black/10 dark:bg-white/10" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`} type="button" aria-label="Dislike question">
                              <ThumbsDown size={14} /> <span>{q.dislikes || 0}</span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-sm text-gray-900 dark:text-gray-100">{q.text}</p>
                        </div>

                        {/* answers */}
                        {(q.answers || []).length > 0 && (
                          <div className="ml-12 mt-3 space-y-3">
                            {q.answers.map((a, idx) => {
                              const aId = a.id || a._id || idx;
                              const aName = a.userName || a.name || "Anonymous";
                              const initialsA = (aName || "A").split(" ").map((p) => p?.[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
                              return (
                                <div key={aId} className="flex items-start gap-3">
                                  <Avatar sx={{ width: 36, height: 36, bgcolor: stringToHslColor(aName || initialsA), color: "#fff" }}>{initialsA}</Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-black dark:text-white">{aName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{a.createdAt ? formatRelativeIST(a.createdAt) : ""}</p>
                                      </div>
                                    </div>
                                    <div className="mt-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                      <p className="text-sm text-gray-900 dark:text-gray-100">{a.text}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* answer input */}
                        <div className="ml-12 mt-3 flex gap-2 items-start">
                          <input value={answerInputs[qid] || ""} onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [qid]: e.target.value }))} placeholder="Write an answer." className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-900 text-sm text-black dark:text-white" aria-label={`Answer to question ${qid}`} />
                          <button onClick={async () => {
                            const text = (answerInputs[qid] || "").trim();
                            if (!text) { showToast("Type an answer first"); return; }
                            setAnswerLoading((s) => ({ ...s, [qid]: true }));
                            setAnswerInputs((s) => ({ ...s, [qid]: "" }));
                            try {
                              // call the API (kept generic, adjust as needed)
                              await fetch(`${API_BASE}/api/qa/${encodeURIComponent(qid)}/answers`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                                body: JSON.stringify({ text }),
                              });
                              showToast("Answer posted");
                              // optimistically add answer locally (or refetch)
                              setQuestions((prev) => prev.map((qq) => {
                                if (String(qq.id) === String(qid) || String(qq._id) === String(qid)) {
                                  return { ...qq, answers: [...(qq.answers || []), { id: Date.now(), text, userName: currentUser?.name || "You", createdAt: new Date().toISOString() }] };
                                }
                                return qq;
                              }));
                            } catch (err) {
                              console.error("post answer failed", err);
                              showToast("Could not post answer");
                            } finally {
                              setAnswerLoading((s) => ({ ...s, [qid]: false }));
                            }
                          }} disabled={(answerLoading[qid] === true) || !(answerInputs[qid] && answerInputs[qid].trim())} className={`px-3 py-2 rounded-full border ${answerLoading[qid] ? "opacity-60 cursor-not-allowed" : "bg-black text-white"}`} type="button" aria-label={`Post answer to question ${qid}`}>
                            {answerLoading[qid] ? "..." : <Send size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">No questions yet.</p>
          )}
        </section>
      </div>

      {/* lightbox modal */}
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

      {toast && (
        <div className="fixed right-6 top-6 z-60">
          <div className="px-4 py-2 rounded shadow bg-black text-white">{toast}</div>
        </div>
      )}
    </div>
  );
}
