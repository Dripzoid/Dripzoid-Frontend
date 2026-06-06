import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Heart } from "lucide-react";
import { useWishlist } from "../contexts/WishlistContext";
import { normalizeImages } from "../utils/images";

const API_BASE = process.env.REACT_APP_API_BASE;

export default function TrendingSection() {
  const {
    items,
    wishlist: legacyWishlist,
    addToWishlist,
    removeFromWishlist,
  } = useWishlist();

  const wishlistData = items || legacyWishlist || [];

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistUpdatingId, setWishlistUpdatingId] = useState(null);

  /* =========================
     WISHLIST IDS
  ========================= */
  const wishlistIds = useMemo(() => {
    const ids = new Set();

    if (!Array.isArray(wishlistData)) return ids;

    wishlistData.forEach((item) => {
      const id =
        item?.product_id ||
        item?.productId ||
        item?.id ||
        item?.product?.id;

      if (id) ids.add(String(id));
    });

    return ids;
  }, [wishlistData]);

  const isInWishlist = (productId) => {
    return wishlistIds.has(String(productId));
  };

  /* =========================
     FETCH TRENDING PRODUCTS
  ========================= */
  useEffect(() => {
    let mounted = true;

    const fetchTrendingProducts = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `${API_BASE}/api/trending?trending=true`
        );

        if (!mounted) return;

        const products = res?.data?.products || [];

        setProducts(products);
      } catch (error) {
        console.error(
          "Trending products fetch failed:",
          error?.response?.data || error
        );

        setProducts([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchTrendingProducts();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     HELPERS
  ========================= */
  const firstImage = (images) => {
    const arr = normalizeImages(images);
    return arr[0] || "/fallback-product.png";
  };

  const getDiscountPercentage = (price, originalPrice) => {
    if (!price || !originalPrice) return null;

    return Math.round(
      ((originalPrice - price) / originalPrice) * 100
    );
  };

  /* =========================
     WISHLIST TOGGLE
  ========================= */
  const handleWishlistToggle = async (product) => {
    if (!product) return;

    const id = product.id;
    const inWishlist = isInWishlist(id);

    try {
      setWishlistUpdatingId(id);

      if (inWishlist) {
        await removeFromWishlist(id);
      } else {
        await addToWishlist(id);
      }
    } catch (err) {
      console.error("Wishlist update failed:", err);
    } finally {
      setWishlistUpdatingId(null);
    }
  };

  /* =========================
     PRODUCT CLICK
  ========================= */
  const openProduct = (product) => {
    if (!product?.id) return;

    window.open(
      `https://dripzoid.com/product/${product.id}`,
      "_blank"
    );
  };

  return (
    <section className="py-6 bg-white dark:bg-black">
      <div className="container mx-auto px-4 lg:px-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
            Trending
          </h2>

          <span className="text-sm text-slate-500 dark:text-slate-400">
            {products.length} items
          </span>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            Loading trending products...
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            No trending products available.
          </div>
        ) : (
          <>
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-2">

              {products.map((product) => {
                const id = product.id;

                const active = isInWishlist(id);

                const loadingWishlist =
                  wishlistUpdatingId === id;

                const image = firstImage(product.images);

                const discount = getDiscountPercentage(
                  product.price,
                  product.originalPrice
                );

                const outOfStock =
                  Number(product.totalStock || 0) <= 0;

                return (
                  <article
                    key={id}
                    onClick={() =>
                      !outOfStock && openProduct(product)
                    }
                    className="relative flex-none w-[180px] md:w-[260px] bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer snap-start"
                  >
                    {/* IMAGE */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-900">

                      <img
                        src={image}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />

                      {discount > 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                          {discount}% OFF
                        </div>
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            Out Of Stock
                          </span>
                        </div>
                      )}

                      {/* WISHLIST */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWishlistToggle(product);
                        }}
                        disabled={loadingWishlist}
                        className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                          active
                            ? "bg-red-500 text-white"
                            : "bg-white/90 text-black"
                        } ${
                          loadingWishlist
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Heart
                          size={16}
                          fill={active ? "currentColor" : "none"}
                        />
                      </button>
                    </div>

                    {/* CONTENT */}
                    <div className="p-3">

                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 min-h-[40px]">
                        {product.name}
                      </h3>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">

                        <span className="font-bold text-black dark:text-white">
                          ₹{product.price}
                        </span>

                        {product.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ₹{product.originalPrice}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">

                        <span className="text-xs text-slate-500">
                          {product.category}
                        </span>

                        <span
                          className={`text-xs font-medium ${
                            outOfStock
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {outOfStock
                            ? "Out of Stock"
                            : `${product.totalStock} left`}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* MOBILE HINT */}
            <div className="mt-4 flex items-center justify-center gap-2 md:hidden">
              <span className="text-xs text-slate-500">
                Swipe for more
              </span>

              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M9 6L15 12L9 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
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
