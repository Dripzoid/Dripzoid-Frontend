// src/pages/Kids.jsx
import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FilterSidebar";

const API_BASE = process.env.REACT_APP_API_BASE;

export default function Kids() {
  const CATEGORY = "Kids";

  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [sortOption, setSortOption] = useState("");
  const [perPage, setPerPage] = useState("12");
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 12 });
  const [loading, setLoading] = useState(false);

  const [subcategories, setSubcategories] = useState([]);

  // fetch subcategories for Kids from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/products/categories?category=Kids`
        );
        const data = await res.json();
        if (data?.categories?.length) {
          setSubcategories(data.categories[0].subcategories || []);
        }
      } catch (err) {
        console.error("Failed to fetch subcategories:", err);
      }
    })();
  }, []);

  // fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", CATEGORY);
      if (selectedSubcategories.length)
        params.append("subcategory", selectedSubcategories.join(","));
      if (selectedColors.length)
        params.append("colors", selectedColors.join(","));
      params.append("minPrice", String(priceRange[0]));
      params.append("maxPrice", String(priceRange[1]));
      if (sortOption === "low-high") params.append("sort", "price_asc");
      else if (sortOption === "high-low") params.append("sort", "price_desc");
      else if (sortOption === "newest") params.append("sort", "newest");
      if (perPage === "all") params.append("limit", "all");
      else {
        params.append("limit", String(perPage));
        params.append("page", String(page));
      }

      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      const raw = await res.json();

      let productsArray = [];
      if (!raw) productsArray = [];
      else if (Array.isArray(raw)) productsArray = raw;
      else if (raw.data && Array.isArray(raw.data)) productsArray = raw.data;
      else
        productsArray = Object.values(raw).filter(
          (v) => v && typeof v === "object" && (v.id || v.name || v.price)
        );

      const serverMeta = raw?.meta ?? {};
      const total = Number(serverMeta.total ?? productsArray.length) || 0;
      const serverPage = Number(serverMeta.page ?? page) || 1;
      const limitUsed =
        Number(serverMeta.limit ?? (perPage === "all" ? total : Number(perPage))) ||
        (perPage === "all" ? total : Number(perPage));
      const serverPages =
        Number(
          serverMeta.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1)))
        ) || 1;

      setMeta({ total, page: serverPage, pages: serverPages, limit: limitUsed });
      setProducts(productsArray || []);
      if (page > serverPages && serverPages > 0) setPage(1);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setMeta({ total: 0, page: 1, pages: 1, limit: 0 });
    } finally {
      setLoading(false);
    }
  };

  // refetch when filters change
  useEffect(() => {
    fetchProducts();
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(meta.pages || 1, p + 1));

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors">
      {/* Sidebar */}
      <FilterSidebar
        category={CATEGORY}
        subcategories={subcategories}
        selectedSubcategories={selectedSubcategories}
        setSelectedSubcategories={setSelectedSubcategories}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        selectedColors={selectedColors}
        setSelectedColors={setSelectedColors}
        sortOption={sortOption}
        setSortOption={setSortOption}
        clearAll={() => {
          setSelectedSubcategories([]);
          setPriceRange([0, 10000]);
          setSelectedColors([]);
          setSortOption("");
          setPerPage("12");
          setPage(1);
        }}
        applyFilters={fetchProducts}
        buttonLabel="Apply Filters & Sorting"
      />

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between w-full mb-4">
          <div>
            <h1 className="text-2xl font-bold">Kids' Collection</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Subcategory filtered view
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 dark:text-gray-400 mr-2">
              Per page:
            </label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(e.target.value);
                setPage(1);
              }}
              className="rounded-md pl-3 pr-8 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="48">48</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p>No products found</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {perPage !== "all" && meta.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={prevPage}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Page <strong>{meta.page}</strong> of{" "}
                  <strong>{meta.pages}</strong>
                </div>
                <button
                  onClick={nextPage}
                  disabled={meta.page >= meta.pages}
                  className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
