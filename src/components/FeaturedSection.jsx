import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import axios from "axios";
import { Heart } from "lucide-react";

import { useWishlist } from "../contexts/WishlistContext";
import { normalizeImages } from "../utils/images";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

function buildProductRoute(product) {
  const id = product?.slug || product?.id || product?._id || product?.product_id;
  return id ? `/product/${id}` : "/product";
}

function getProductId(product) {
  return (
    product?.id ||
    product?._id ||
    product?.product_id ||
    product?.productId ||
    product?.slug ||
    ""
  );
}

function getDisplayPrice(product) {
  const price = Number(product?.price ?? product?.actualPrice ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function getOriginalPrice(product) {
  const original = Number(product?.originalPrice ?? 0);
  return Number.isFinite(original) ? original : 0;
}

function getStock(product) {
  const stock = Number(product?.totalStock ?? product?.stock ?? 0);
  return Number.isFinite(stock) ? stock : 0;
}

function getCategoryLabel(product) {
  return (
    product?.categoryData?.category ||
    product?.category ||
    ""
  );
}

function getSubcategoryLabel(product) {
  return (
    product?.categoryData?.subcategory ||
    product?.subcategory ||
    ""
  );
}

export default function FeaturedSection() {
  const {
    items = [],
    addToWishlist,
    removeFromWishlist,
  } = useWishlist() || {};

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistUpdatingId, setWishlistUpdatingId] = useState(null);

  /* ================= WISHLIST IDS ================= */

  const wishlistIds = useMemo(() => {
    const set = new Set();

    if (!Array.isArray(items)) return set;

    for (const it of items) {
      if (!it) continue;

      const id =
        it.product_id ??
        it.productId ??
        it.id ??
        it.product?.id ??
        it.product?._id ??
        it.product?.product_id;

      if (id !== undefined && id !== null) {
        set.add(String(id));
      }
    }

    return set;
  }, [items]);

  const isInWishlist = useCallback(
    (productId) => {
      if (!productId) return false;
      return wishlistIds.has(String(productId));
    },
    [wishlistIds]
  );

  /* ================= FETCH FEATURED ================= */

  useEffect(() => {
    let mounted = true;

    const fetchFeatured = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `${API_BASE}/api/featured?featured=true`,
          {
            withCredentials: true,
          }
        );

        if (!mounted) return;

        const payload = res?.data ?? {};
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.products)
          ? payload.products
          : Array.isArray(payload.data)
          ? payload.data
          : [];

        setProducts(arr);
      } catch (err) {
        console.error("Error fetching featured products:", err);
        if (mounted) {
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchFeatured();

    return () => {
      mounted = false;
    };
  }, []);

  const firstImage = useCallback((images) => {
    const arr = normalizeImages(images);
    return arr[0] || "/fallback-product.png";
  }, []);

  /* ================= TOGGLE WISHLIST ================= */

  const handleWishlistToggle = async (product) => {
    if (!product) return;

    const id = getProductId(product);
    if (!id) return;

    const inWishlist = isInWishlist(id);

    try {
      setWishlistUpdatingId(String(id));

      if (inWishlist) {
        if (typeof removeFromWishlist === "function") {
          await removeFromWishlist(id);
        }
      } else {
        if (typeof addToWishlist === "function") {
          await addToWishlist(id);
        }
      }
    } catch (err) {
      console.error("Wishlist update failed:", err);
    } finally {
      setWishlistUpdatingId(null);
    }
  };

  return (
    <section className="py-6 bg-white dark:bg-black">
      <div className="container mx-auto px-4 lg:px-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
            Featured Picks
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {products.length} items
          </div>
        </div>

        {/* STATES */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading featured products…
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No featured products available.
          </div>
        ) : (
          <>
            {/* PRODUCTS */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-4 md:px-6">
              {products.map((p) => {
                const id = getProductId(p);
                const active = isInWishlist(id);
                const loadingBtn = wishlistUpdatingId === String(id);

                const route = buildProductRoute(p);
                const imageSrc = firstImage(p.images);
                const price = getDisplayPrice(p);
                const originalPrice = getOriginalPrice(p);
                const stock = getStock(p);
                const hasDiscount =
                  originalPrice > price && originalPrice > 0;

                const discountPercent = hasDiscount
                  ? Math.round(
                      ((originalPrice - price) / originalPrice) * 100
                    )
                  : 0;

                const category = getCategoryLabel(p);
                const subcategory = getSubcategoryLabel(p);

                const stockBadge =
                  stock <= 0
                    ? {
                        text: "Out of stock",
                        tone: "bg-red-600 text-white",
                      }
                    : stock <= 5
                    ? {
                        text: `Only ${stock} left`,
                        tone: "bg-amber-500 text-black",
                      }
                    : {
                        text: "In stock",
                        tone: "bg-green-600 text-white",
                      };

                return (
                  <article
                    key={id}
                    className="flex-none w-1/2 md:w-1/4 snap-start bg-white dark:bg-black border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                    onClick={() =>
                      window.open(
                        `${window.location.origin}${route}`,
                        "_blank"
                      )
                    }
                  >
                    {/* IMAGE */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
                      <img
                        src={imageSrc}
                        alt={p?.name || "Product"}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />

                      {/* STOCK BADGE */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-semibold ${stockBadge.tone}`}
                        >
                          {stockBadge.text}
                        </span>
                      </div>

                      {/* DISCOUNT BADGE */}
                      {hasDiscount && (
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-600 text-white">
                            {discountPercent}% OFF
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CONTENT */}
                    <div className="p-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {p?.name || "Product"}
                        </h3>

                        {(subcategory || category) && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                            {subcategory || category}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <p className="text-base font-semibold text-black dark:text-white">
                            ₹{price.toLocaleString()}
                          </p>

                          {hasDiscount && (
                            <p className="text-xs line-through text-slate-500 dark:text-slate-400">
                              ₹{originalPrice.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* HEART BUTTON */}
                      <div className="mt-3 flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWishlistToggle(p);
                          }}
                          disabled={loadingBtn}
                          aria-label={
                            active
                              ? "Remove from wishlist"
                              : "Add to wishlist"
                          }
                          title={
                            active
                              ? "Remove from wishlist"
                              : "Add to wishlist"
                          }
                          className={`p-2 rounded-full transition-all duration-200 ${
                            active
                              ? "bg-red-500 text-white scale-105"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:scale-105"
                          } ${
                            loadingBtn
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <Heart
                            size={16}
                            fill={active ? "currentColor" : "none"}
                            strokeWidth={2}
                          />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* MOBILE HINT */}
            <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
              <span className="text-xs text-slate-500">Swipe</span>
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
