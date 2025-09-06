// src/components/FeaturedSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { normalizeImages } from "../utils/images"; // safer image handling

const API_BASE = process.env.REACT_APP_API_BASE;

export default function FeaturedSection() {
  const { addToCart: contextAddToCart, cart = [] } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [addingId, setAddingId] = useState(null);

  // Build a Set of product IDs currently present in cart
  const inCartIds = useMemo(() => {
    const s = new Set();
    if (!Array.isArray(cart)) return s;
    for (const it of cart) {
      if (!it) continue;
      if (it.id !== undefined && it.id !== null) s.add(Number(it.id));
      if (it.product_id !== undefined && it.product_id !== null) s.add(Number(it.product_id));
      if (it.productId !== undefined && it.productId !== null) s.add(Number(it.productId));
      if (it.product && (it.product.id || it.product._id)) {
        s.add(Number(it.product.id ?? it.product._id));
      }
      if (it.product && it.product.product_id) s.add(Number(it.product.product_id));
    }
    return s;
  }, [cart]);

  const isInCart = (productId) => {
    if (productId === undefined || productId === null) return false;
    return inCartIds.has(Number(productId));
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get(`${API_BASE}/api/products?featured=true`)
      .then((res) => {
        if (!mounted) return;
        const payload = res?.data ?? [];
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.data)
          ? payload.data
          : [];
        setProducts(arr);
      })
      .catch((err) => {
        console.error("Error fetching featured products:", err);
        setProducts([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const firstImage = (images) => {
    const arr = normalizeImages(images);
    return arr[0] || "/fallback-product.png";
  };

  const handleAddToCart = async (product) => {
    if (!product) return;
    if (isInCart(product.id)) return;

    try {
      setAddingId(product.id);
      await contextAddToCart(product, 1, null, null);
    } catch (err) {
      console.error("Add to cart failed:", err);
      alert("Failed to add to cart. Please login or check console for details.");
    } finally {
      setAddingId(null);
    }
  };

  const visibleProducts = showAll ? products : products.slice(0, 5);

  return (
    <section className="py-12 bg-white dark:bg-black">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-black dark:text-white">Featured Picks</h2>
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:underline"
          >
            {showAll ? "Show less" : `See all (${products.length})`}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading featured products…
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No featured products available.
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {visibleProducts.map((p) => {
              const inCart = isInCart(p.id);
              return (
                <article
                  key={p.id ?? p._id ?? p.name}
                  className="relative group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow hover:shadow-lg transition"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <img
                      src={firstImage(p.images)}
                      alt={p.name}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      draggable="false"
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="pr-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</h3>
                      <p className="mt-1 text-lg font-semibold text-black dark:text-white">₹{p.price}</p>
                    </div>

                    <button
                      onClick={() => handleAddToCart(p)}
                      disabled={addingId === p.id || inCart}
                      aria-disabled={addingId === p.id || inCart}
                      className={`p-3 rounded-full focus:outline-none transition ${
                        inCart
                          ? "bg-black/50 text-white dark:bg-white/50 dark:text-black cursor-not-allowed"
                          : "bg-black text-white dark:bg-white dark:text-black"
                      }`}
                    >
                      {addingId === p.id ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          ></path>
                        </svg>
                      ) : inCart ? (
                        <Check size={18} />
                      ) : (
                        <ShoppingCart size={18} />
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
