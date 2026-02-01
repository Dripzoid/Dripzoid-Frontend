import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Heart } from "lucide-react";
import { useWishlist } from "../contexts/WishlistContext";
import { normalizeImages } from "../utils/images";

const API_BASE = process.env.REACT_APP_API_BASE;

export default function OnSale() {
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
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

        const sales = Array.isArray(res?.data) ? res.data : [];

        // 🔥 FLATTEN: sales -> products
        const flatProducts = sales.flatMap((sale) =>
          Array.isArray(sale.products)
            ? sale.products.map((p) => ({
                ...p,
                saleTitle: sale.title, // optional (future use)
              }))
            : []
        );

        setProducts(flatProducts);
      })
      .catch((err) => {
        console.error("Error fetching sale products:", err);
        setProducts([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- Image helper ---------------- */
  const firstImage = (product) => {
    if (product?.thumbnail) return product.thumbnail;
    const arr = normalizeImages(product?.images);
    return arr[0] || "/fallback-product.png";
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

  /* ================== UI ================== */
  return (
    <section className="py-6 bg-white dark:bg-black">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
            On Sale
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {products.length} items
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading sale items…
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No sale items available.
          </div>
        ) : (
          <>
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2">
              {products.map((p) => (
                <article
                  key={p.id}
                  className="flex-none w-1/2 md:w-1/4 snap-start bg-white dark:bg-black border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() =>
                    window.open(`https://dripzoid.com/product/${p.id}`, "_blank")
                  }
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <img
                      src={firstImage(p)}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                      draggable="false"
                    />
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div className="pr-2 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {p.name}
                      </h3>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-base font-semibold text-black dark:text-white">
                          ₹{p.price}
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
              ))}
            </div>

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
          </>
        )}
      </div>
    </section>
  );
}
