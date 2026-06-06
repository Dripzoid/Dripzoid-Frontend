import React, { useEffect, useState } from "react";
import axios from "axios";

import ProductCard from "../components/ProductCard";

const API_BASE = process.env.REACT_APP_API_BASE;

export default function TrendingSection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

        setProducts(res?.data?.products || []);
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
            {/* PRODUCTS */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex-none w-[180px] md:w-[260px] snap-start"
                >
                  <ProductCard
                    product={product}
                    showWishlist={true}
                    showStock={true}
                    showDiscount={true}
                  />
                </div>
              ))}
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
