// src/components/FilterSidebar.jsx
import React, { useEffect, useRef } from "react";
import tinycolor from "tinycolor2";
import { X } from "lucide-react";

/* ---------- Color helpers ---------- */
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

const swatchBorder = (parsedColor, selected) => {
  if (selected) return "2px solid rgba(0,0,0,0.08)";
  if (!parsedColor) return "1px solid rgba(0,0,0,0.12)";
  return colorIsLight(parsedColor)
    ? "1px solid rgba(0,0,0,0.12)"
    : "1px solid rgba(255,255,255,0.12)";
};

/* ---------- Component ---------- */
/**
 Props expected (controlled):
 - isOpen, isStatic, onClose, onApply
 - categoryData: [{ name, subcategories: [...] }]  OR  { categories: [...] } (we normalize)
 - colorsList, MIN, MAX
 - selectedSubcategories (array of {category, subcategory} preferred)  -- but we handle string legacy too
 - setSelectedSubcategories
 - expandedCategories, setExpandedCategories
 - priceRange, setPriceRange
 - selectedColors, setSelectedColors
 - sortOption, setSortOption
 - clearFilters
*/
export default function FilterSidebar({
  isOpen = false,
  isStatic = false,
  onClose = () => {},
  onApply = () => {},
  categoryData = [],
  colorsList = [],
  MIN = 0,
  MAX = 10000,

  selectedSubcategories = [],
  setSelectedSubcategories = () => {},
  expandedCategories = [],
  setExpandedCategories = () => {},
  priceRange = [MIN, MAX],
  setPriceRange = () => {},
  selectedColors = [],
  setSelectedColors = () => {},
  sortOption = "",
  setSortOption = () => {},
  clearFilters = () => {},
}) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!isStatic && isOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    }
  }, [isOpen, isStatic]);

  /* ---------- Normalization helpers ---------- */

  // Normalize incoming categoryData into predictable shape: [{ name, subcategories: [string] }]
  const normalizeCategories = (raw) => {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : raw.categories ?? raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((c) => {
        const name = (c && c.name) ? String(c.name).trim() : String(c).trim();
        const subsRaw = c && c.subcategories ? c.subcategories : [];
        const subs = (Array.isArray(subsRaw) ? subsRaw : [])
          .map((s) => (typeof s === "string" ? s.trim() : (s && s.name ? String(s.name).trim() : String(s).trim())))
          .filter(Boolean);
        return { name: name || "Uncategorized", subcategories: subs };
      })
      .filter(Boolean);
  };

  const normalizedCategories = normalizeCategories(categoryData);

  // Preferred order, but unknown categories will be sorted alphabetically after these
  const categoryOrder = ["Men", "Women", "Kids"];
  const sortedCategories = [...normalizedCategories].sort((a, b) => {
    const ia = categoryOrder.indexOf(a.name);
    const ib = categoryOrder.indexOf(b.name);
    const va = ia === -1 ? Number.POSITIVE_INFINITY : ia;
    const vb = ib === -1 ? Number.POSITIVE_INFINITY : ib;
    if (va !== vb) return va - vb;
    // fallback to locale compare
    return String(a.name).localeCompare(String(b.name));
  });

  /* ---------- Selection helpers (defensive) ---------- */

  // compares a single selected item (string or object) to a category/subname pair
  const selectionEquals = (sel, categoryName, subName) => {
    if (!sel) return false;
    // plain string matches either "Sub" or "Category:Sub"
    if (typeof sel === "string") {
      const raw = sel.trim().toLowerCase();
      if (raw === subName.trim().toLowerCase()) return true;
      const pair = `${categoryName}:${subName}`.trim().toLowerCase();
      if (raw === pair) return true;
      return false;
    }
    // object forms: try multiple candidate keys (some of your earlier code used different keys)
    if (typeof sel === "object") {
      const cat = (sel.category ?? sel.categoryName ?? sel.categoryId ?? "").toString().trim().toLowerCase();
      const sub = (sel.subcategory ?? sel.sub ?? sel.subId ?? sel.name ?? "").toString().trim().toLowerCase();
      return cat === categoryName.toString().trim().toLowerCase() && sub === subName.toString().trim().toLowerCase();
    }
    return false;
  };

  const isSelected = (categoryName, subName) =>
    Array.isArray(selectedSubcategories) && selectedSubcategories.some((s) => selectionEquals(s, categoryName, subName));

  const toggleSubcategory = (categoryName, subName) => {
    const normalizedCategory = String(categoryName).trim();
    const normalizedSub = String(subName).trim();
    setSelectedSubcategories((prev = []) => {
      const exists = prev.some((s) => selectionEquals(s, normalizedCategory, normalizedSub));
      if (exists) {
        return prev.filter((s) => !selectionEquals(s, normalizedCategory, normalizedSub));
      }
      // add canonical object shape that the Shop/Men/Women pages expect:
      return [...prev, { category: normalizedCategory, subcategory: normalizedSub }];
    });
  };

  const toggleCategory = (categoryName) =>
    setExpandedCategories((prev = []) =>
      prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
    );

  const handlePriceChange = (index, rawValue) => {
    const value = Number(rawValue);
    const next = Array.isArray(priceRange) ? [...priceRange] : [MIN, MAX];
    if (index === 0) next[0] = Math.min(Math.max(MIN, value), next[1]);
    else next[1] = Math.max(Math.min(MAX, value), next[0]);
    setPriceRange(next);
  };

  /* ---------- UI ---------- */
  const Inner = (
    <div className="p-6 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        {!isStatic && (
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close filters"
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X />
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium mb-3">Categories</h3>
        <div className="space-y-3">
          {sortedCategories.map((category) => (
            <div key={category.name}>
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
                aria-expanded={expandedCategories.includes(category.name)}
              >
                <span className="font-medium">{category.name}</span>
                <span className="text-sm font-bold select-none">
                  {expandedCategories.includes(category.name) ? "−" : "+"}
                </span>
              </button>

              {expandedCategories.includes(category.name) && Array.isArray(category.subcategories) && (
                <div className="mt-2 ml-6 flex flex-wrap gap-2">
                  {category.subcategories.map((sub) => {
                    const subLabel = typeof sub === "string" ? sub : String(sub?.name ?? sub).trim();
                    const active = isSelected(category.name, subLabel);
                    return (
                      <button
                        key={`${category.name}::${subLabel}`}
                        onClick={() => toggleSubcategory(category.name, subLabel)}
                        className={`px-3 py-1 rounded-full text-sm border transition ${
                          active
                            ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                            : "bg-white dark:bg-transparent text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                        aria-pressed={active}
                      >
                        {subLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {sortedCategories.length === 0 && <div className="text-sm text-gray-500">No categories available</div>}
        </div>
      </div>

      {/* Price */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-3">Price Range (₹)</h3>
        <div className="flex items-center justify-between mb-2 text-sm font-semibold">
          <div>₹{(priceRange?.[0] ?? MIN).toLocaleString()}</div>
          <div>₹{(priceRange?.[1] ?? MAX).toLocaleString()}</div>
        </div>
        <div className="relative py-2">
          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full relative">
            <div
              className="absolute h-2 bg-black dark:bg-white rounded-full"
              style={{
                left: `${((priceRange?.[0] ?? MIN) / MAX) * 100}%`,
                right: `${100 - ((priceRange?.[1] ?? MAX) / MAX) * 100}%`,
              }}
            />
          </div>

          <input
            type="range"
            min={MIN}
            max={MAX}
            step={100}
            value={priceRange?.[0] ?? MIN}
            onChange={(e) => handlePriceChange(0, e.target.value)}
            className="range-input lower absolute left-0 top-0 w-full"
          />
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={100}
            value={priceRange?.[1] ?? MAX}
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
            const selected = Array.isArray(selectedColors) && selectedColors.includes(rawColor);
            return (
              <button
                key={`${rawColor}-${i}`}
                onClick={() =>
                  setSelectedColors((prev = []) => (prev.includes(rawColor) ? prev.filter((x) => x !== rawColor) : [...prev, rawColor]))
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
          {(!colorsList || colorsList.length === 0) && <div className="text-sm text-gray-500">No colors</div>}
        </div>
      </div>

      {/* Sort */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-3">Sort By</h3>
        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="w-full rounded-md px-3 py-2 border border-gray-300 dark:border-gray-700">
          <option value="">Select</option>
          <option value="low-high">Price: Low to High</option>
          <option value="high-low">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => {
            onApply?.();
            if (!isStatic) onClose?.();
          }}
          className="flex-1 px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black font-medium"
        >
          Apply filters
        </button>
        <button
          onClick={() => {
            clearFilters?.();
            if (!isStatic) onClose?.();
          }}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700"
        >
          Clear
        </button>
      </div>
    </div>
  );

  /* ---------- Render (static vs sliding) ---------- */
  if (isStatic) {
    return (
      <aside className="w-80 border-r border-gray-200 dark:border-gray-700 p-0">
        {Inner}
      </aside>
    );
  }

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 bottom-0 transform w-80 bg-white dark:bg-black shadow-lg transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        id="filters-panel"
      >
        {Inner}
      </aside>
    </>
  );
}
