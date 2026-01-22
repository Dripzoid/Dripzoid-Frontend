// src/components/FilterSidebar.jsx
import React, { useEffect, useRef, useMemo } from "react";
import tinycolor from "tinycolor2";
import { X } from "lucide-react";

/* ---------- Color helpers ---------- */
const normalizeColor = (raw) => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let tc = tinycolor(s);
  if (tc.isValid()) return tc.toHexString().toLowerCase();

  // try cleaned tokens
  const cleaned = s.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  tc = tinycolor(cleaned);
  if (tc.isValid()) return tc.toHexString().toLowerCase();

  const firstToken = cleaned.split(" ")[0];
  tc = tinycolor(firstToken);
  if (tc.isValid()) return tc.toHexString().toLowerCase();

  // fallback deterministic hash -> hex
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hex = ((hash >>> 0) & 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`.toLowerCase();
};

const colorIsLight = (cssColor) => {
  if (!cssColor) return false;
  try {
    return tinycolor(cssColor).isLight();
  } catch {
    return false;
  }
};

const swatchBorderStyle = (parsedColor, selected) => {
  if (selected) return `2px solid rgba(0,0,0,0.14)`;
  if (!parsedColor) return `1px solid rgba(0,0,0,0.12)`;
  return colorIsLight(parsedColor)
    ? `1px solid rgba(0,0,0,0.12)`
    : `1px solid rgba(255,255,255,0.12)`;
};

/* ---------- Component ---------- */
/**
 Props expected (controlled):
 - isOpen, isStatic, onClose, onApply
 - categoryData: [{ name, subcategories: [...] }]
 - colorsList, MIN, MAX
 - selectedSubcategories, setSelectedSubcategories
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
      // focus close button for accessibility
      setTimeout(() => closeBtnRef.current?.focus(), 60);
    }
  }, [isOpen, isStatic]);

  /* ---------- Normalize categories ---------- */
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

  // preferred order
  const categoryOrder = ["Men", "Women", "Kids"];
  const sortedCategories = useMemo(() => {
    return [...normalizedCategories].sort((a, b) => {
      const ia = categoryOrder.indexOf(a.name);
      const ib = categoryOrder.indexOf(b.name);
      const va = ia === -1 ? Number.POSITIVE_INFINITY : ia;
      const vb = ib === -1 ? Number.POSITIVE_INFINITY : ib;
      if (va !== vb) return va - vb;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [normalizedCategories]);

  /* ---------- Selection helpers ---------- */
  const selectionEquals = (sel, categoryName, subName) => {
    if (!sel) return false;
    if (typeof sel === "string") {
      const raw = sel.trim().toLowerCase();
      if (raw === subName.trim().toLowerCase()) return true;
      const pair = `${categoryName}:${subName}`.trim().toLowerCase();
      if (raw === pair) return true;
      return false;
    }
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
      return [...prev, { category: normalizedCategory, subcategory: normalizedSub }];
    });
  };

  const toggleCategory = (categoryName) =>
    setExpandedCategories((prev = []) =>
      prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
    );

  /* ---------- Color display: show only 5-8 main colors ---------- */
  // Keep original raw label but compute normalized hex for swatch and selection matching
  const mainColorObjects = useMemo(() => {
    if (!Array.isArray(colorsList)) return [];
    const seen = new Set();
    const out = [];
    for (let i = 0; i < colorsList.length && out.length < 8; i++) {
      const raw = colorsList[i];
      const hex = normalizeColor(raw) || null;
      const key = hex || String(raw).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ raw, hex });
      }
    }
    // If we have less than 6 colors and original list is long, try a fallback by scanning the rest to fill up to 6
    if (out.length < 6 && Array.isArray(colorsList) && colorsList.length > 0) {
      for (let i = 0; i < colorsList.length && out.length < 6; i++) {
        const raw = colorsList[i];
        const hex = normalizeColor(raw) || null;
        const key = hex || String(raw).trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ raw, hex });
        }
      }
    }
    return out;
  }, [colorsList]);

  const isColorSelected = (rawColor) => {
    // preserve behavior: selectedColors contains raw values (strings)
    return Array.isArray(selectedColors) && selectedColors.includes(rawColor);
  };

  const toggleColor = (rawColor) => {
    setSelectedColors((prev = []) =>
      prev.includes(rawColor) ? prev.filter((x) => x !== rawColor) : [...prev, rawColor]
    );
  };

  /* ---------- Price helpers for slider visual ---------- */
  const leftPercent = useMemo(() => {
    const min = Number(MIN || 0);
    const max = Number(MAX || 10000);
    const cur = Number(priceRange?.[0] ?? min);
    if (max <= min) return 0;
    return Math.round(((cur - min) / (max - min)) * 100);
  }, [priceRange, MIN, MAX]);

  const rightPercent = useMemo(() => {
    const min = Number(MIN || 0);
    const max = Number(MAX || 10000);
    const cur = Number(priceRange?.[1] ?? max);
    if (max <= min) return 0;
    return 100 - Math.round(((cur - min) / (max - min)) * 100);
  }, [priceRange, MIN, MAX]);

  const handlePriceChange = (index, rawValue) => {
    const value = Number(rawValue);
    const next = Array.isArray(priceRange) ? [...priceRange] : [MIN, MAX];
    if (index === 0) next[0] = Math.min(Math.max(MIN, value), next[1]);
    else next[1] = Math.max(Math.min(MAX, value), next[0]);
    setPriceRange(next);
  };

  /* ---------- Inner panel UI ---------- */
  const Inner = (
    <div className="p-6 w-full sm:w-80 lg:w-80 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        {!isStatic && (
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close filters"
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
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
                className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition text-sm"
                aria-expanded={expandedCategories.includes(category.name)}
              >
                <span className="font-medium">{category.name}</span>
                <span className="text-sm font-bold select-none">
                  {expandedCategories.includes(category.name) ? "−" : "+"}
                </span>
              </button>

              {expandedCategories.includes(category.name) && Array.isArray(category.subcategories) && (
                <div className="mt-2 ml-4 flex flex-wrap gap-2">
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
                            : "bg-white dark:bg-transparent text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
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

        <div className="relative py-2 px-1">
          {/* TRACK */}
          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full relative">
            {/* selected range */}
            <div
              className="absolute h-2 rounded-full bg-black dark:bg-white"
              style={{
                left: `${leftPercent}%`,
                right: `${rightPercent}%`,
              }}
            />
          </div>

          {/* Two overlayed range inputs (mobile friendly thumbs) */}
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={100}
              value={priceRange?.[0] ?? MIN}
              onChange={(e) => handlePriceChange(0, e.target.value)}
              className="pointer-events-auto appearance-none w-full h-2 bg-transparent"
              aria-label="Minimum price"
              style={{
                // style thumb via pseudo is not possible here; keep default but ensure visible
                WebkitAppearance: "none",
                background: "transparent",
              }}
            />
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={100}
              value={priceRange?.[1] ?? MAX}
              onChange={(e) => handlePriceChange(1, e.target.value)}
              className="pointer-events-auto appearance-none w-full h-2 bg-transparent"
              aria-label="Maximum price"
              style={{
                WebkitAppearance: "none",
                background: "transparent",
              }}
            />
          </div>
        </div>

        {/* Numeric inputs for fine control (compact) */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Min</span>
            <input
              type="number"
              min={MIN}
              max={priceRange?.[1] ?? MAX}
              value={priceRange?.[0] ?? MIN}
              onChange={(e) => handlePriceChange(0, Number(e.target.value || MIN))}
              className="w-full rounded-md border px-2 py-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Max</span>
            <input
              type="number"
              min={priceRange?.[0] ?? MIN}
              max={MAX}
              value={priceRange?.[1] ?? MAX}
              onChange={(e) => handlePriceChange(1, Number(e.target.value || MAX))}
              className="w-full rounded-md border px-2 py-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </label>
        </div>
      </div>

      {/* Colors: show a compact set of main colors only */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-3">Colors</h3>
        <div className="grid grid-cols-8 gap-2 items-center">
          {mainColorObjects.map(({ raw, hex }, i) => {
            // hex may be null; fallback to transparent
            const parsed = hex || null;
            const selected = isColorSelected(raw);
            const textColor = colorIsLight(parsed) ? "text-gray-900" : "text-white";
            return (
              <button
                key={`${String(raw)}-${i}`}
                onClick={() => toggleColor(raw)}
                aria-label={`color-${String(raw)}`}
                title={String(raw)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                  selected ? "scale-105" : "hover:scale-105"
                }`}
                style={{
                  background: parsed || "linear-gradient(45deg,#e2e8f0,#cbd5e1)",
                  border: swatchBorderStyle(parsed, selected),
                }}
              >
                {selected ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={textColor}>
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            );
          })}

          {/* "More" button if there are more colors available */}
          {Array.isArray(colorsList) && colorsList.length > mainColorObjects.length && (
            <button
              onClick={() => {
                // show full list: toggle select all of top N as a simple fallback
                // if user wants a full color modal we can implement separately
                const remaining = colorsList.slice(mainColorObjects.length, mainColorObjects.length + 8);
                const rawValues = remaining.map((r) => r);
                // toggle these on
                setSelectedColors((prev = []) => {
                  const next = [...prev];
                  rawValues.forEach((rv) => {
                    if (!next.includes(rv)) next.push(rv);
                  });
                  return next;
                });
              }}
              className="col-span-2 ml-1 px-2 py-1 rounded-md text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent"
            >
              + More
            </button>
          )}
        </div>
        {(!colorsList || colorsList.length === 0) && <div className="text-sm text-gray-500 mt-2">No colors</div>}
      </div>

      {/* Sort */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-3">Sort By</h3>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="w-full rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        >
          <option value="">Select</option>
          <option value="low-high">Price: Low to High</option>
          <option value="high-low">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2 sticky bottom-0 bg-white dark:bg-black py-4">
        <button
          onClick={() => {
            onApply?.();
            if (!isStatic) onClose?.();
          }}
          className="flex-1 px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black font-medium shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
        >
          Apply filters
        </button>
        <button
          onClick={() => {
            clearFilters?.();
            if (!isStatic) onClose?.();
          }}
          className="px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent"
        >
          Clear
        </button>
      </div>
    </div>
  );

  /* ---------- Render (static vs sliding) ---------- */
  // Static sidebar used primarily on desktop (lg and up).
  if (isStatic) {
    return (
      <aside className="hidden lg:block w-80 border-r border-gray-200 dark:border-gray-700">
        {Inner}
      </aside>
    );
  }

  // Sliding panel (mobile-friendly). Full width on small screens, narrower on sm+.
  return (
    <>
      {/* dim backdrop */}
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 bg-black/40 transition-opacity z-40 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 bottom-0 transform z-50 w-full sm:w-96 bg-white dark:bg-black shadow-lg transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        id="filters-panel"
      >
        {Inner}
      </aside>
    </>
  );
}
