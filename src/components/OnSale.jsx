import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Heart } from "lucide-react";
import { useWishlist } from "../contexts/WishlistContext";
import { normalizeImages } from "../utils/images";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function OnSale() {
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [sales, setSales] = useState([]); // array of sales, each with products[]
  const [loading, setLoading] = useState(true);
  const [wishlistUpdatingId, setWishlistUpdatingId] = useState(null);

  /* ---------------- Wishlist helpers ---------------- */
  const wishlistIds = useMemo(() => {
    const s = new Set();
    if (!Array.isArray(wishlist)) return s;
    for (const it of wishlist) {
      const id = it?.product_id ?? it?.id ?? it?.productId;
      if (id != null) s.add(Number(id));
    }
    return s;
  }, [wishlist]);

  const isInWishlist = (productId) =>
    productId != null && wishlistIds.has(Number(productId));

  /* ---------------- Fetch sales ---------------- */
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get(`${API_BASE}/api/public/sales`)
      .then((res) => {
        if (!mounted) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        // Ensure products arrays exist and normalize thumbnails/images if needed
        const normalized = data.map((sale) => {
          const products = Array.isArray(sale.products) ? sale.products : [];
          const normalizedProducts = products.map((p) => {
            const images = Array.isArray(p.images) ? p.images : normalizeImages(p.images);
            const thumbnail = p.thumbnail || images[0] || null;
            // Ensure numeric prices or null
            const price = p.price != null ? Number(p.price) : null;
            const originalPrice = p.originalPrice != null ? Number(p.originalPrice) : null;
            return { ...p, images, thumbnail, price, originalPrice };
          });
          return { ...sale, products: normalizedProducts };
        });

        setSales(normalized);
      })
      .catch((err) => {
        console.error("Error fetching sale products:", err);
        setSales([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- Image helper ---------------- */
  const firstImage = (product) => {
    if (!product) return "/fallback-product.png";
    if (product?.thumbnail) return product.thumbnail;
    const arr = normalizeImages(product?.images);
    return arr[0] || "/fallback-product.png";
  };

  /* ---------------- Discount helper ---------------- */
  const computeDiscountPercent = (price, originalPrice) => {
    if (!originalPrice || originalPrice <= 0 || price == null) return null;
    const percent = Math.round(((originalPrice - price) / originalPrice) * 100);
    return percent > 0 ? percent : null;
  };

  /* ---------------- Wishlist toggle ---------------- */
  const handleWishlistToggle = async (product) => {
    if (!product) return;
    try {
      setWishlistUpdatingId(product.id);
      isInWishlist(product.id)
        ? await removeFromWishlist(product.id)
        : await addToWishlist(product.id);
    } catch (err) {
      console.error("Wishlist update failed", err);
    } finally {
      setWishlistUpdatingId(null);
    }
  };

  /* ---------------- Derived totals ---------------- */
  const totalProducts = useMemo(() => {
    return sales.reduce((acc, s) => acc + (Array.isArray(s.products) ? s.products.length : 0), 0);
  }, [sales]);

  /* ================== UI ================== */
  return (
    <section className="py-6 bg-white dark:bg-black">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Main heading */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
            Now On Sales
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {totalProducts} items
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading sale items…
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No sale items available.
          </div>
        ) : (
          <>
            {sales.map((sale) => (
              <div key={sale.id} className="mb-8">
                {/* Row header with sale name */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {sale.title || sale.name || "Sale"}
                  </h3>
                  {/* optional: product count for this sale */}
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {Array.isArray(sale.products) ? sale.products.length : 0} items
                  </div>
                </div>

                <div
                  data-scroll="true"
                  className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2"
                >
                  {Array.isArray(sale.products) && sale.products.length > 0 ? (
                    sale.products.map((p) => {
                      const discount = computeDiscountPercent(p.price, p.originalPrice);
                      return (
                        <article
                          key={`${sale.id}-${p.id}`}
                          className="flex-none w-1/2 md:w-1/4 snap-start bg-white dark:bg-black border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer relative"
                          onClick={() =>
                            window.open(`https://dripzoid.com/product/${p.id}`, "_blank")
                          }
                          aria-labelledby={`product-${sale.id}-${p.id}-title`}
                        >
                          {/* Image area with overlays */}
                          <div className="aspect-[4/5] w-full overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
                            <img
                              src={firstImage(p)}
                              alt={p.name || "Product"}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                              draggable="false"
                            />

                            {/* sale title badge (top-left) */}
                            {(sale.title || sale.name) && (
                              <span className="absolute left-3 top-3 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
                                {sale.title || sale.name}
                              </span>
                            )}

                            {/* discount bubble (top-right) */}
                            {discount != null && (
                              <div className="absolute right-3 top-3">
                                <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                  {discount}% OFF
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Product info */}
                          <div className="p-3 flex items-center justify-between">
                            <div className="pr-2 min-w-0">
                              <h4
                                id={`product-${sale.id}-${p.id}-title`}
                                className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                              >
                                {p.name}
                              </h4>

                              <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-base font-semibold text-black dark:text-white">
                                  ₹{p.price ?? "—"}
                                </span>
                                {p.originalPrice && p.originalPrice > p.price && (
                                  <span className="text-sm line-through text-slate-400">
                                    ₹{p.originalPrice}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWishlistToggle(p);
                              }}
                              disabled={wishlistUpdatingId === p.id}
                              aria-disabled={wishlistUpdatingId === p.id}
                              className={`p-2 rounded-full transition ${
                                isInWishlist(p.id)
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                              }`}
                              title={
                                isInWishlist(p.id)
                                  ? "Remove from wishlist"
                                  : "Add to wishlist"
                              }
                            >
                              <Heart size={16} />
                            </button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400 px-4 py-6">
                      No items in this sale.
                    </div>
                  )}
                </div>

                {/* mobile swipe hint per row */}
                <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
                  <span className="text-xs text-slate-500">Swipe</span>
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
