import React, { useEffect, useState } from "react";
import tinycolor from "tinycolor2";
import ProductCard from "../components/ProductCard";

const API_BASE = process.env.REACT_APP_API_BASE || "";

// --- helpers ---
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
    hash = hash & hash;
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

  // fetch categories → extract Men subcategories
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/categories`);
        const json = await res.json();
        const raw = Array.isArray(json) ? json : (json.categories || json || []);
        const menCat = raw.find((c) =>
          (c?.name ?? "").toLowerCase() === CATEGORY.toLowerCase()
        );
        const subs = (menCat?.subcategories || []).map((s) =>
          typeof s === "string" ? s : s?.name ?? String(s)
        );
        if (mounted) setSubcategories(subs);
      } catch (err) {
        console.error("Failed to load Men subcategories:", err);
        if (mounted) setSubcategories([]);
      }
    })();
    return () => { mounted = false };
  }, []);

  // fetch colors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        const json = await res.json();
        if (mounted) setColorsList(json.colors || []);
      } catch {
        if (mounted) setColorsList(["White", "Black", "Blue"]);
      }
    })();
    return () => { mounted = false };
  }, []);

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
      else { params.append("limit", perPage); params.append("page", page); }

      const res = await fetch(`${API_BASE}/api/products?${params}`);
      const raw = await res.json();
      const productsArray = raw?.data || raw || [];
      const serverMeta = raw?.meta ?? {};
      setMeta({
        total: serverMeta.total ?? productsArray.length,
        page: serverMeta.page ?? page,
        pages: serverMeta.pages ?? 1,
        limit: serverMeta.limit ?? perPage
      });
      setProducts(productsArray);
    } catch (err) {
      console.error("Error fetching Men products:", err);
      setProducts([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); },
    [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  const toggleSubcategory = (sub) =>
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-3">Subcategories</h2>
        <div className="flex flex-wrap gap-2">
          {subcategories.map((sub) => {
            const active = selectedSubcategories.includes(sub);
            return (
              <button key={sub}
                onClick={() => toggleSubcategory(sub)}
                className={`px-3 py-1 rounded-full border text-sm ${active ? "bg-black text-white" : "border-gray-300"}`}>
                {sub}
              </button>
            )
          })}
        </div>
      </aside>

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Men’s Collection</h1>
        {loading ? <p>Loading...</p> :
          products.length === 0 ? <p>No products found</p> :
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
        }
      </main>
    </div>
  );
}
