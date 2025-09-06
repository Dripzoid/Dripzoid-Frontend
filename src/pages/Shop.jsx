import React, { useState, useEffect } from "react";
import { FaMale, FaFemale, FaChild } from "react-icons/fa";
import tinycolor from "tinycolor2";
import ProductCard from "../components/ProductCard"; // adjust path if needed

const API_BASE = process.env.REACT_APP_API_BASE; // change if backend URL differs

// Helpers (outside component)
const normalizeColor = (raw) => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;

  // Try tinycolor parsing
  let tc = tinycolor(s);
  if (tc.isValid()) return tc.toHexString();

  // Try cleaned variants
  const cleaned = s.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  tc = tinycolor(cleaned);
  if (tc.isValid()) return tc.toHexString();

  const firstToken = cleaned.split(" ")[0];
  tc = tinycolor(firstToken);
  if (tc.isValid()) return tc.toHexString();

  // Deterministic fallback hash -> hex
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

const Shop = () => {
  // Slider constants (use these for initial priceRange)
  const MIN = 0;
  const MAX = 10000;

  // Filters / UI state
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  // <-- default price range now covers full MIN..MAX so "All" truly returns everything
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]); // raw DB strings
  const [sortOption, setSortOption] = useState("");

  // Products state + pagination meta
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 0 });
  const [loading, setLoading] = useState(false);

  // Pagination controls
  // keep values as strings so <select> values match exactly
  const perPageOptions = ["12", "24", "36", "all"];
  const [perPage, setPerPage] = useState("12"); // default per-page (string)
  const [page, setPage] = useState(1);

  // Category/subcategory metadata (UI only)
  const categoryData = [
    {
      name: "Men",
      icon: <FaMale className="w-5 h-5" />,
      subcategories: [
        { name: "Shirts", icon: "👕" },
        { name: "Pants", icon: "👖" },
        { name: "Hoodies", icon: "🧥" },
        { name: "Jeans", icon: "👖" },
      ],
    },
    {
      name: "Women",
      icon: <FaFemale className="w-5 h-5" />,
      subcategories: [
        { name: "Kurtis", icon: "👗" },
        { name: "Skirts", icon: "👗" },
        { name: "Jeans", icon: "👖" },
        { name: "Shirts", icon: "👕" },
      ],
    },
    {
      name: "Kids",
      icon: <FaChild className="w-5 h-5" />,
      subcategories: [
        { name: "Shirts", icon: "👕" },
        { name: "Pants", icon: "👖" },
        { name: "Hoodies", icon: "🧥" },
        { name: "Skirts", icon: "👗" },
      ],
    },
  ];

  // UI interaction helpers
  const toggleCategory = (category) =>
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );

  const toggleSubcategory = (subcategory) =>
    setSelectedSubcategories((prev) =>
      prev.includes(subcategory) ? prev.filter((c) => c !== subcategory) : [...prev, subcategory]
    );

  const handlePriceChange = (index, rawValue) => {
    const value = Number(rawValue);
    const next = [...priceRange];
    if (index === 0) next[0] = Math.min(Math.max(MIN, value), next[1]);
    else next[1] = Math.max(Math.min(MAX, value), next[0]);
    setPriceRange(next);
  };

  const clearFilters = () => {
    setSelectedSubcategories([]);
    setExpandedCategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    // reset pagination as UX convenience
    setPerPage("12");
    setPage(1);
  };

  // Fetch distinct colors from backend (on mount)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        if (!res.ok) throw new Error("Failed to fetch colors");
        const json = await res.json();
        if (!mounted) return;
        if (json.colors && json.colors.length) setColorsList(json.colors);
        else setColorsList(["#f5f5f5", "#e8e1da", "#dbeaf0", "#f9f0f5"]);
      } catch (err) {
        console.warn("Could not load colors from API, using fallback", err);
        if (mounted) setColorsList(["#f5f5f5", "#e8e1da", "#dbeaf0", "#f9f0f5"]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build query and fetch products (now includes limit & page)
  // Build query and fetch products (robust to different backend shapes)
const fetchProducts = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams();

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

    if (perPage === "all") {
      params.append("limit", "all");
    } else {
      params.append("limit", String(perPage));
      params.append("page", String(page));
    }

    const url = `${API_BASE}/api/products?${params.toString()}`;
    // debug:
    // console.log("Fetching products:", url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
    const data = await res.json();

    // Normalize payload -> productsArray
    // Cases:
    // 1) { meta, data: [...] } => use data
    // 2) [...] (array) => use it directly
    // 3) {0: {...}, 1: {...}} numeric-keyed object => Object.values(...)
    // 4) else => []
    let productsArray = [];
    if (data == null) {
      productsArray = [];
    } else if (Array.isArray(data)) {
      productsArray = data;
    } else if (data.data && Array.isArray(data.data)) {
      productsArray = data.data;
    } else if (typeof data === "object") {
      // could be numeric-keyed object or single product object
      // pick object.values and filter only objects with id/name to avoid picking meta
      const vals = Object.values(data);
      // If values look like product objects, use them
      const maybeProducts = vals.filter(v => v && typeof v === "object" && (v.id !== undefined || v.name !== undefined || v.price !== undefined));
      if (maybeProducts.length > 0) productsArray = maybeProducts;
      else productsArray = [];
    } else {
      productsArray = [];
    }

    // Determine server meta (if present) or compute from productsArray & perPage
    const serverMeta = (data && data.meta && typeof data.meta === "object") ? data.meta : {};
    const total = Number(serverMeta.total ?? (Array.isArray(productsArray) ? productsArray.length : 0)) || 0;
    const serverPage = Number(serverMeta.page ?? page) || 1;
    const limitUsed = Number(serverMeta.limit ?? (perPage === "all" ? total : Number(perPage))) || (perPage === "all" ? total : Number(perPage));
    const serverPages = Number(serverMeta.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1)))) || 1;

    // debug helpful info
    console.debug("Products fetch normalized:", { url, raw: data, productsCount: productsArray.length, total, serverPage, serverPages, limitUsed });

    setMeta({
      total,
      page: serverPage,
      pages: serverPages,
      limit: limitUsed,
    });

    setProducts(productsArray || []);

    // if requested page is out of bounds (e.g. backend adjusted pages), snap back to 1
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


  // refetch when filters, pagination, or sorting change
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  // Helper to render a swatch style border that shows well in light/dark
  const swatchBorder = (parsedColor, selected) => {
    if (selected) return "2px solid rgba(0,0,0,0.08)";
    if (!parsedColor) return "1px solid rgba(0,0,0,0.12)";
    return colorIsLight(parsedColor) ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.12)";
  };

  // Pagination handlers
  const handlePerPageChange = (val) => {
    setPerPage(val);
    setPage(1); // reset to first page on per-page change
  };
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(meta.pages || 1, p + 1));

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={clearFilters} className="text-sm underline">
            Clear
          </button>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium mb-3">Categories</h3>
          <div className="space-y-3">
            {categoryData.map((category) => (
              <div key={category.name}>
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <span className="flex items-center gap-3 text-sm">
                    <span className="p-2 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                      {category.icon}
                    </span>
                    <span className="font-medium">{category.name}</span>
                  </span>
                  <span className="text-sm font-bold select-none">{expandedCategories.includes(category.name) ? "−" : "+"}</span>
                </button>

                {expandedCategories.includes(category.name) && (
                  <div className="mt-2 ml-10 flex flex-wrap gap-2">
                    {category.subcategories.map((sub) => {
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
                )}
              </div>
            ))}
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

        {/* Colors (DB-driven swatches, no inner text) */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Colors</h3>
          <div className="flex gap-2 flex-wrap">
            {colorsList.map((rawColor, i) => {
              const parsed = normalizeColor(rawColor);
              const selected = selectedColors.includes(rawColor);
              return (
                <button
                  key={`${rawColor}-${i}`}
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
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full rounded-md px-3 py-2 border border-gray-300 dark:border-gray-700"
          >
            <option value="">Select</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </aside>

      {/* Products */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between w-full mb-4">
          {/* Left side content here (filters, search, etc.) */}
          <div>
            {/* Example placeholder for other controls */}
            <p className="text-sm text-gray-500 dark:text-gray-400">Some filters here</p>
          </div>

          {/* Right side - Per Page Selector */}
          <div className="flex items-center">
            <label
              htmlFor="perPage"
              className="text-sm text-gray-500 dark:text-gray-400 mr-2"
            >
              Per page:
            </label>

            <div className="relative inline-block">
              <select
                id="perPage"
                value={perPage}
                onChange={(e) => handlePerPageChange(e.target.value)}
                className="rounded-md pl-3 pr-8 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm appearance-none focus:outline-none"
              >
                {perPageOptions.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>
                    {opt === "all" ? "All" : opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>




        {
          loading ? (
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

              {/* Pagination controls */}
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
                    Page <strong>{meta.page}</strong> of <strong>{meta.pages}</strong>
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
          )
        }
      </main >
    </div >
  );
};

export default Shop;
