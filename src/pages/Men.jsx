// src/pages/Men.jsx
import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FiltersSidebar"; // ✅ reuse component

const API_BASE = process.env.REACT_APP_API_BASE;

export default function Men() {
  const CATEGORY = "Men";
  const MIN = 0;
  const MAX = 10000;

  // Filters / UI state
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]); // not needed much here
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sortOption, setSortOption] = useState("");

  // Products + pagination
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 12 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPageOptions = ["12", "24", "48", "all"];
  const [perPage, setPerPage] = useState("12");

  // Sidebar open/close (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Men-only subcategories
  const menSubcategories = [
    { name: "Shirts" },
    { name: "Pants" },
    { name: "Hoodies" },
    { name: "Jeans" },
  ];
  const categoryData = [{ name: "Men", subcategories: menSubcategories.map((s) => s.name) }];

  // Clear filters
  const clearFilters = () => {
    setSelectedSubcategories([]);
    setExpandedCategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    setPerPage("12");
    setPage(1);
  };

  // Fetch colors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        const json = await res.json();
        if (mounted) {
          setColorsList(Array.isArray(json.colors) && json.colors.length ? json.colors : []);
        }
      } catch {
        if (mounted) setColorsList(["White", "Black", "Blue", "Gray"]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", CATEGORY);

      if (selectedSubcategories.length > 0) {
        params.append("subcategory", selectedSubcategories.join(","));
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
      if (!res.ok) throw new Error("Fetch failed");
      const raw = await res.json();

      const productsArray = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.data)
        ? raw.data
        : [];

      const serverMeta = raw?.meta || {};
      const total = Number(serverMeta.total ?? productsArray.length) || 0;
      const serverPage = Number(serverMeta.page ?? page) || 1;
      const limitUsed =
        Number(serverMeta.limit ?? (perPage === "all" ? total : Number(perPage))) ||
        (perPage === "all" ? total : Number(perPage));
      const serverPages =
        Number(serverMeta.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1)))) || 1;

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

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

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
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between w-full mb-4">
          <div>
            <h1 className="text-2xl font-bold">Men's Collection</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Shop by subcategories</p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="perPage" className="text-sm text-gray-500 dark:text-gray-400 mr-2">Per page:</label>
            <select
              id="perPage"
              value={perPage}
              onChange={(e) => handlePerPageChange(e.target.value)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>

            {perPage !== "all" && meta.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button onClick={prevPage} disabled={page <= 1} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50">Prev</button>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Page <strong>{meta.page}</strong> of <strong>{meta.pages}</strong>
                </div>
                <button onClick={nextPage} disabled={meta.page >= meta.pages} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile sidebar */}
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
}
