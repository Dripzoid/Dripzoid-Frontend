// src/pages/Shop.jsx
import React, { useState, useEffect } from "react";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FiltersSidebar"; // ensure file is named FilterSidebar.jsx
import LogoBorderLoader from "../components/LogoLoader";
const API_BASE = process.env.REACT_APP_API_BASE || "";

const MIN = 0;
const MAX = 10000;

const Shop = () => {
  // Filters / UI state (selectedSubcategories: array of { category, subcategory })
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sortOption, setSortOption] = useState("");

  // Dynamic categories: normalized to [{ name, subcategories: [ "Shirts", "Pants" ] }]
  const [categoryData, setCategoryData] = useState([]);

  // Products + pagination
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 0 });
  // start loading true so loader shows immediately on mount
  const [loading, setLoading] = useState(true);

  const perPageOptions = ["12", "24", "36", "all"];
  const [perPage, setPerPage] = useState("12");
  const [page, setPage] = useState(1);

  // Sidebar open for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Fetch categories on mount (handles either { categories: [...] } or raw array)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/categories`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const json = await res.json();

        // Normalize: accept either an array or { categories: [...] } object
        const raw = Array.isArray(json) ? json : (json.categories || json || []);
        const mapped = (raw || []).map((c) => {
          const name = c?.name ?? String(c);
          const subsRaw = c?.subcategories ?? [];
          const subs = (Array.isArray(subsRaw) ? subsRaw : []).map((s) =>
            typeof s === "string" ? s : s?.name ?? String(s)
          ).filter(Boolean);
          return { name: String(name), subcategories: subs };
        });

        if (mounted) setCategoryData(mapped);
      } catch (err) {
        console.error("Error fetching categories:", err);
        if (mounted) setCategoryData([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- Fetch colors on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        if (!res.ok) throw new Error("Failed to fetch colors");
        const json = await res.json();
        if (!mounted) return;
        if (json?.colors && json.colors.length) setColorsList(json.colors);
        else setColorsList(["#f5f5f5", "#e8e1da", "#dbeaf0", "#f9f0f5"]);
      } catch (err) {
        console.warn("Could not load colors from API, using fallback", err);
        if (mounted) setColorsList(["#f5f5f5", "#e8e1da", "#dbeaf0", "#f9f0f5"]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- Fetch products
  const fetchProducts = async () => {
    setLoading(true);

    // 2s dummy delay to let the loader show (for demo/testing)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const params = new URLSearchParams();

      // If user selected category-scoped subcategories, we send them as Category:Subcategory pairs
      if (selectedSubcategories.length > 0) {
        const mapped = selectedSubcategories.map(
          (sel) => `${encodeURIComponent(sel.category)}:${encodeURIComponent(sel.subcategory)}`
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

      if (perPage === "all") params.append("limit", "all");
      else {
        params.append("limit", String(perPage));
        params.append("page", String(page));
      }

      const url = `${API_BASE}/api/products?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      const data = await res.json();

      let productsArray = [];
      if (Array.isArray(data)) productsArray = data;
      else if (data?.data && Array.isArray(data.data)) productsArray = data.data;
      else productsArray = [];

      const serverMeta = data?.meta || {};
      const total = Number(serverMeta.total ?? productsArray.length) || 0;
      const serverPage = Number(serverMeta.page ?? page) || 1;
      const limitUsed = Number(serverMeta.limit ?? (perPage === "all" ? total : Number(perPage))) || (perPage === "all" ? total : Number(perPage));
      const serverPages = Number(serverMeta.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1)))) || 1;

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
  };

  // Re-fetch when filters change
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  // close sidebar on ESC (mobile)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sidebar helpers
  const clearFilters = () => {
    setSelectedSubcategories([]);
    setExpandedCategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    setPerPage("12");
    setPage(1);
  };

  const handlePerPageChange = (val) => { setPerPage(val); setPage(1); };
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(meta.pages || 1, p + 1));

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors">
      {/* Desktop sidebar */}
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

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex items-center justify-between w-full mb-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Shop</p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="perPage" className="text-sm text-gray-500 dark:text-gray-400 mr-2">Per page:</label>
            <select id="perPage" value={perPage} onChange={(e) => handlePerPageChange(e.target.value)} className="rounded-md pl-3 pr-8 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
              {perPageOptions.map((opt) => (<option key={String(opt)} value={String(opt)}>{opt === "all" ? "All" : opt}</option>))}
            </select>

            {/* Mobile: open sliding sidebar */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700"
              aria-controls="filters-panel"
              aria-expanded={sidebarOpen}
            >
              Apply Filters & Sorting
            </button>
          </div>
        </div>

        {loading ? (
          // centered loader while fetching
          <div className="flex items-center justify-center w-full h-72">
            <LogoBorderLoader />
          </div>
        ) : products.length === 0 ? (
          <p>No products found</p>
        ) : (
          <>
            {/* Responsive grid: mobile/tablet = 2 columns, desktop = 3 columns */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>

            {perPage !== "all" && meta.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button onClick={prevPage} disabled={page <= 1} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50">Prev</button>
                <div className="text-sm text-gray-600 dark:text-gray-300">Page <strong>{meta.page}</strong> of <strong>{meta.pages}</strong></div>
                <button onClick={nextPage} disabled={meta.page >= meta.pages} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile sidebar (sliding panel) */}
      <FilterSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onApply={() => { setPage(1); setSidebarOpen(false); }}
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

export default Shop;
