// src/pages/Kids.jsx
import React, { useState, useEffect, useCallback } from "react";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FiltersSidebar";

const API_BASE = process.env.REACT_APP_API_BASE || "";

const MIN = 0;
const MAX = 10000;

const Kids = () => {
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]);

  const [sortOption, setSortOption] = useState("");
  const [categoryData, setCategoryData] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 0 });
  const [loading, setLoading] = useState(false);

  const perPageOptions = ["12", "24", "36", "all"];
  const [perPage, setPerPage] = useState("12");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Fetch categories (Kids only)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/categories?category=Kids`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const json = await res.json();

        const raw = Array.isArray(json) ? json : json.categories || [];
        const mapped = raw.map((c) => {
          const name = c?.name ?? String(c);
          const subs = (c?.subcategories || []).map((s) =>
            typeof s === "string" ? s : s?.name ?? String(s)
          );
          return { name: String(name), subcategories: subs.filter(Boolean) };
        });

        if (mounted) setCategoryData(mapped);
      } catch (err) {
        console.error("Error fetching categories:", err);
        if (mounted) setCategoryData([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Fetch available colors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        if (!res.ok) throw new Error("Failed to fetch colors");
        const json = await res.json();
        if (mounted) {
          setColorsList(json?.colors?.length ? json.colors : ["#f5f5f5", "#e8e1da", "#dbeaf0"]);
        }
      } catch {
        if (mounted) setColorsList(["#f5f5f5", "#e8e1da", "#dbeaf0"]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", "kids"); // filter only Kids products

      if (selectedSubcategories.length > 0) {
        const mapped = selectedSubcategories.map(
          (sel) =>
            `${encodeURIComponent(sel.category.toLowerCase())}:${encodeURIComponent(
              sel.subcategory.toLowerCase()
            )}`
        );
        params.append("subcategory", mapped.join(","));
      }

      if (selectedColors.length > 0) {
        params.append("colors", selectedColors.join(","));
      }

      params.append("minPrice", priceRange[0]);
      params.append("maxPrice", priceRange[1]);

      if (sortOption === "low-high") params.append("sort", "price_asc");
      else if (sortOption === "high-low") params.append("sort", "price_desc");
      else if (sortOption === "newest") params.append("sort", "newest");

      if (perPage !== "all") {
        params.append("limit", perPage);
        params.append("page", page);
      }

      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      const data = await res.json();

      const productsArray = Array.isArray(data) ? data : data?.data || [];
      const serverMeta = data?.meta || {};
      const total = Number(serverMeta.total ?? productsArray.length) || 0;
      const serverPage = Number(serverMeta.page ?? page) || 1;
      const limitUsed =
        perPage === "all" ? total : Number(serverMeta.limit ?? perPage ?? 12);
      const serverPages =
        perPage === "all" ? 1 : Number(serverMeta.pages ?? Math.ceil(total / (limitUsed || 1)));

      setMeta({ total, page: serverPage, pages: serverPages, limit: limitUsed });
      setProducts(productsArray);

      if (page > serverPages && serverPages > 0) setPage(1);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
      setMeta({ total: 0, page: 1, pages: 1, limit: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // --- Reset all filters
  const clearFilters = () => {
    setSelectedSubcategories([]);
    setExpandedCategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    setPerPage("12");
    setPage(1);
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Sidebar (desktop) */}
      <div className="hidden lg:block">
        <FilterSidebar
          isStatic
          categoryData={categoryData}
          colorsList={colorsList}
          MIN={MIN}
          MAX={MAX}
          selectedSubcategories={selectedSubcategories}
          setSelectedSubcategories={setSelectedSubcategories}
          expandedCategories={expandedCategories}
          setExpandedCategories={setExpandedCategories}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          selectedColors={selectedColors}
          setSelectedColors={setSelectedColors}
          sortOption={sortOption}
          setSortOption={setSortOption}
          clearFilters={clearFilters}
          onApply={() => setPage(1)}
        />
      </div>

      {/* Main products */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex items-center justify-between w-full mb-4">
          <h1 className="text-xl font-bold">Kids’ Shop</h1>
          <div className="flex items-center gap-3">
            <label htmlFor="perPage" className="text-sm">
              Per page:
            </label>
            <select
              id="perPage"
              value={perPage}
              onChange={(e) => {
                setPerPage(e.target.value);
                setPage(1);
              }}
              className="rounded-md pl-3 pr-8 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All" : opt}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700"
            >
              Apply Filters & Sorting
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p>No products found</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {perPage !== "all" && meta.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border rounded-md"
                >
                  Prev
                </button>
                <span>
                  Page {meta.page} of {meta.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                  disabled={meta.page >= meta.pages}
                  className="px-3 py-1 border rounded-md"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Sidebar (mobile) */}
      <FilterSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onApply={() => {
          setPage(1);
          setSidebarOpen(false);
        }}
        categoryData={categoryData}
        colorsList={colorsList}
        MIN={MIN}
        MAX={MAX}
        selectedSubcategories={selectedSubcategories}
        setSelectedSubcategories={setSelectedSubcategories}
        expandedCategories={expandedCategories}
        setExpandedCategories={setExpandedCategories}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        selectedColors={selectedColors}
        setSelectedColors={setSelectedColors}
        sortOption={sortOption}
        setSortOption={setSortOption}
        clearFilters={clearFilters}
      />
    </div>
  );
};

export default Kids;
