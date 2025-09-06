// src/pages/Men.jsx
import React, { useEffect, useState } from "react";
import { FaMale } from "react-icons/fa";
import tinycolor from "tinycolor2";
import ProductCard from "../components/ProductCard";

const API_BASE = process.env.REACT_APP_API_BASE;

const normalizeColor = (raw) => {
  if (raw === null || raw === undefined) return null;
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

  // deterministic fallback
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hex = ((hash >>> 0) & 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`;
};

const colorIsLight = (cssColor) => {
  if (!cssColor) return false;
  try {
    return tinycolor(cssColor).isLight();
  } catch {
    return false;
  }
};

export default function Men() {
  const CATEGORY = "Men";
  const MIN = 0;
  const MAX = 10000;

  // UI state
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sortOption, setSortOption] = useState("");
  const [perPage, setPerPage] = useState("12"); // "12","24","48","all"
  const [page, setPage] = useState(1);

  // products state
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 12 });
  const [loading, setLoading] = useState(false);

  // Men's subcategories (UI)
  const menSubcategories = [
    { name: "Shirts", icon: "👕" },
    { name: "Pants", icon: "👖" },
    { name: "Hoodies", icon: "🧥" },
    { name: "Jeans", icon: "👖" },
  ];

  // Helpers
  const toggleSubcategory = (sub) =>
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );

  const handlePriceChange = (index, rawValue) => {
    const value = Number(rawValue);
    const next = [...priceRange];
    if (index === 0) next[0] = Math.min(Math.max(MIN, value), next[1]);
    else next[1] = Math.max(Math.min(MAX, value), next[0]);
    setPriceRange(next);
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedSubcategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    setPerPage("12");
    setPage(1);
  };

  // Fetch available colors from backend (on mount)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        if (!res.ok) throw new Error("Failed to fetch colors");
        const json = await res.json();
        if (!mounted) return;
        setColorsList(Array.isArray(json.colors) && json.colors.length ? json.colors : []);
      } catch (err) {
        console.warn("Could not fetch colors, using fallback", err);
        if (mounted) setColorsList(["White", "Black", "Blue", "Gray"]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build query and fetch products (robust normalization)
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // fixed category
      params.append("category", CATEGORY);

      if (selectedSubcategories.length > 0) {
        params.append("subcategory", selectedSubcategories.join(","));
      }
      if (selectedColors.length > 0) {
        params.append("colors", selectedColors.join(","));
      }
      params.append("minPrice", String(priceRange[0]));
      params.append("maxPrice", String(priceRange[1]));

      if (sortOption === "low-high") params.append("sort", "price_asc");
      else if (sortOption === "high-low") params.append("sort", "price_desc");
      else if (sortOption === "newest") params.append("sort", "newest");

      if (perPage === "all") {
        params.append("limit", "all");
      } else {
        params.append("limit", String(perPage));
        params.append("page", String(page));
      }

      const url = `${API_BASE}/api/products?${params.toString()}`;
      // console.debug("Fetching products:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      const raw = await res.json();

      // Normalize payload
      let productsArray = [];
      if (!raw) productsArray = [];
      else if (Array.isArray(raw)) productsArray = raw;
      else if (raw.data && Array.isArray(raw.data)) productsArray = raw.data;
      else {
        const vals = Object.values(raw).filter(
          (v) =>
            v &&
            typeof v === "object" &&
            (v.id !== undefined || v.name !== undefined || v.price !== undefined)
        );
        productsArray = vals.length > 0 ? vals : [];
      }

      const serverMeta = raw && raw.meta && typeof raw.meta === "object" ? raw.meta : {};
      const total = Number(serverMeta.total ?? (Array.isArray(productsArray) ? productsArray.length : 0)) || 0;
      const serverPage = Number(serverMeta.page ?? page) || 1;
      const limitUsed =
        Number(serverMeta.limit ?? (perPage === "all" ? total : Number(perPage))) ||
        (perPage === "all" ? total : Number(perPage));
      const serverPages = Number(serverMeta.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1)))) || 1;

      // Debug
      // console.debug("Products fetch normalized:", { url, raw, productsCount: productsArray.length, total, serverPage, serverPages, limitUsed });

      setMeta({ total, page: serverPage, pages: serverPages, limit: limitUsed });
      setProducts(productsArray || []);

      if (page > serverPages && serverPages > 0) {
        setPage(1);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
      setMeta({ total: 0, page: 1, pages: 1, limit: 0 });
    } finally {
      setLoading(false);
    }
  };

  // refetch when filters change
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  // Swatch border helper
  const swatchBorder = (parsedColor, selected) => {
    if (selected) return "2px solid rgba(0,0,0,0.08)";
    if (!parsedColor) return "1px solid rgba(0,0,0,0.12)";
    return colorIsLight(parsedColor) ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.12)";
  };

  // Pagination helpers
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(meta.pages || 1, p + 1));

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={clearFilters} className="text-sm underline">Clear</button>
        </div>

        {/* Subcategories (Men-only) */}
        <div>
          <h3 className="text-sm font-medium mb-3">Subcategories</h3>
          <div className="flex flex-wrap gap-2">
            {menSubcategories.map((sub) => {
              const active = selectedSubcategories.includes(sub.name);
              return (
                <button
                  key={sub.name}
                  onClick={() => toggleSubcategory(sub.name)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition select-none ${active
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-white dark:bg-transparent text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  aria-pressed={active}
                >
                  <span className="text-lg">{sub.icon}</span>
                  <span>{sub.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Price Range */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Price Range (₹)</h3>
          <div className="flex items-center justify-between mb-2 text-sm font-semibold">
            <div>₹{priceRange[0].toLocaleString()}</div>
            <div>₹{priceRange[1].toLocaleString()}</div>
          </div>
          <div className="relative py-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full relative">
              <div
                className="absolute h-2 bg-black dark:bg-white rounded-full"
                style={{
                  left: `${(priceRange[0] / MAX) * 100}%`,
                  right: `${100 - (priceRange[1] / MAX) * 100}%`,
                }}
              />
            </div>

            <input
              type="range"
              min={MIN}
              max={MAX}
              step={100}
              value={priceRange[0]}
              onChange={(e) => handlePriceChange(0, e.target.value)}
              className="range-input lower absolute left-0 top-0 w-full"
            />
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={100}
              value={priceRange[1]}
              onChange={(e) => handlePriceChange(1, e.target.value)}
              className="range-input upper absolute left-0 top-0 w-full"
            />
          </div>
        </div>

        {/* Colors */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Colors</h3>
          <div className="flex gap-2 flex-wrap">
            {colorsList.map((rawColor, i) => {
              const parsed = normalizeColor(rawColor);
              const selected = selectedColors.includes(rawColor);
              return (
                <button
                  key={`${String(rawColor)}-${i}`}
                  onClick={() =>
                    setSelectedColors((prev) =>
                      prev.includes(rawColor) ? prev.filter((x) => x !== rawColor) : [...prev, rawColor]
                    )
                  }
                  aria-label={`color-${rawColor}`}
                  title={String(rawColor)}
                  className={`w-8 h-8 rounded-full transition flex items-center justify-center focus:outline-none ${selected ? "ring-2 ring-offset-1" : ""}`}
                  style={{
                    background: parsed || "transparent",
                    border: swatchBorder(parsed, selected),
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Sort */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Sort By</h3>
          <select
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
            className="w-full rounded-md px-3 py-2 border border-gray-300 dark:border-gray-700"
          >
            <option value="">Select</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </aside>

      {/* Products area */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between w-full mb-4">
          <div>
            <h1 className="text-2xl font-bold">Men's Collection</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Subcategory filtered view</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 dark:text-gray-400 mr-2">Per page:</label>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(e.target.value); setPage(1); }}
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

            {/* Pagination */}
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
    </div>
  );
}
