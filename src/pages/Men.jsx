// src/pages/Men.jsx
import React, { useEffect, useState } from "react";
import tinycolor from "tinycolor2";
import ProductCard from "../components/ProductCard";

const API_BASE = process.env.REACT_APP_API_BASE || "";

// --- Helpers for colors ---
const normalizeColor = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let tc = tinycolor(s);
  if (tc.isValid()) return tc.toHexString();
  const cleaned = s.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  tc = tinycolor(cleaned);
  if (tc.isValid()) return tc.toHexString();
  const firstToken = cleaned.split(" ")[0];
  tc = tinycolor(firstToken);
  if (tc.isValid()) return tc.toHexString();
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
    hash &= hash;
  }
  const hex = ((hash >>> 0) & 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`;
};
const colorIsLight = (cssColor) => !!cssColor && tinycolor(cssColor).isLight();

export default function Men() {
  const CATEGORY = "Men";
  const MIN = 0, MAX = 10000;

  const [subcategories, setSubcategories] = useState([]); // fetched dynamically
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sortOption, setSortOption] = useState("");
  const [perPage, setPerPage] = useState("12");
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 12 });
  const [loading, setLoading] = useState(false);

  // --- Fetch Men subcategories dynamically
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/categories`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const json = await res.json();
        const raw = Array.isArray(json) ? json : json.categories || [];
        const menCat = raw.find(
          (c) => (c?.name || "").toLowerCase() === CATEGORY.toLowerCase()
        );
        const subs = (menCat?.subcategories || []).map((s) =>
          typeof s === "string" ? s : s?.name ?? String(s)
        );
        if (mounted) setSubcategories(subs);
      } catch (err) {
        console.error("Error fetching Men subcategories:", err);
        if (mounted) setSubcategories([]);
      }
    })();
    return () => (mounted = false);
  }, []);

  // --- Fetch colors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        if (!res.ok) throw new Error("Failed to fetch colors");
        const json = await res.json();
        if (mounted) {
          setColorsList(Array.isArray(json.colors) ? json.colors : []);
        }
      } catch {
        if (mounted) setColorsList(["Black", "White", "Gray", "Blue"]);
      }
    })();
    return () => (mounted = false);
  }, []);

  // --- Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", CATEGORY);
      if (selectedSubcategories.length) {
        params.append("subcategory", selectedSubcategories.join(","));
      }
      if (selectedColors.length) params.append("colors", selectedColors.join(","));
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
      const productsArray = raw?.data ?? (Array.isArray(raw) ? raw : []);
      const serverMeta = raw?.meta ?? {};
      const total = Number(serverMeta.total ?? productsArray.length) || 0;
      const serverPage = Number(serverMeta.page ?? page) || 1;
      const limitUsed =
        Number(serverMeta.limit ?? (perPage === "all" ? total : Number(perPage))) ||
        (perPage === "all" ? total : Number(perPage));
      const serverPages =
        Number(serverMeta.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1)))) ||
        1;
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

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  const toggleSubcategory = (sub) =>
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );

  const clearFilters = () => {
    setSelectedSubcategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    setPerPage("12");
    setPage(1);
  };

  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(meta.pages || 1, p + 1));

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={clearFilters} className="text-sm underline">
            Clear
          </button>
        </div>
        {/* Subcategories */}
        <h3 className="text-sm font-medium mb-3">Subcategories</h3>
        <div className="flex flex-wrap gap-2">
          {subcategories.map((sub) => {
            const active = selectedSubcategories.includes(sub);
            return (
              <button
                key={sub}
                onClick={() => toggleSubcategory(sub)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  active
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-white dark:bg-transparent text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Men&apos;s Collection</h1>
        {loading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p>No products found</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {perPage !== "all" && meta.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={prevPage}
                  disabled={page <= 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-sm">
                  Page <strong>{meta.page}</strong> of{" "}
                  <strong>{meta.pages}</strong>
                </div>
                <button
                  onClick={nextPage}
                  disabled={page >= meta.pages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
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
