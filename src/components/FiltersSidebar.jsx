import React, { useEffect, useRef } from "react";
import { FaMale, FaFemale, FaChild } from "react-icons/fa";
import tinycolor from "tinycolor2";
import { X } from "lucide-react";

/**
 * FilterSidebar
 *
 * Props:
 * - isOpen: boolean (only used when not isStatic) — controls panel visibility
 * - isStatic: boolean — when true renders as a normal sidebar (no overlay / slide panel)
 * - onClose: () => void — called to close the panel (keyboard / close button / apply)
 * - onApply: () => void — called when user clicks Apply (filters should already be in state)
 * - categoryData: array (categories metadata)
 * - colorsList: array (raw color strings from DB)
 * - MIN, MAX: numbers for price range bounds
 *
 * All filter state is controlled by parent (Shop) and passed via props:
 * - selectedSubcategories, setSelectedSubcategories
 * - expandedCategories, setExpandedCategories
 * - priceRange, setPriceRange
 * - selectedColors, setSelectedColors
 * - sortOption, setSortOption
 * - clearFilters
 *
 * Note: this component intentionally keeps no internal filter state so Shop remains the source of truth.
 */

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

const swatchBorder = (parsedColor, selected) => {
  if (selected) return "2px solid rgba(0,0,0,0.08)";
  if (!parsedColor) return "1px solid rgba(0,0,0,0.12)";
  return colorIsLight(parsedColor) ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.12)";
};

export default function FilterSidebar({
  isOpen = false,
  isStatic = false,
  onClose = () => {},
  onApply = () => {},
  categoryData = [],
  colorsList = [],
  MIN = 0,
  MAX = 10000,

  // Controlled state from parent
  selectedSubcategories,
  setSelectedSubcategories,
  expandedCategories,
  setExpandedCategories,
  priceRange,
  setPriceRange,
  selectedColors,
  setSelectedColors,
  sortOption,
  setSortOption,
  clearFilters,
}) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    // When the sliding panel is opened focus the close button for accessibility
    if (!isStatic && isOpen) {
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isStatic]);

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

  const Inner = (
    <div className="p-6 w-80">
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
                <span className="text-sm font-bold select-none">
                  {expandedCategories.includes(category.name) ? "−" : "+"}
                </span>
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
            // keep panel open so user can continue, but if it's sliding panel we close to match UX expectation
            if (!isStatic) onClose?.();
          }}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700"
        >
          Clear
        </button>
      </div>
    </div>
  );

  // Static (desktop) rendering
  if (isStatic) {
    return <aside className="w-80 border-r border-gray-200 dark:border-gray-700 p-0">{Inner}</aside>;
  }

  // Panel rendering (overlay + slide-in)
  return (
    <>
      {/* overlay */}
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* panel */}
      <aside
        className={`fixed right-0 top-0 bottom-0 transform w-80 bg-white dark:bg-black shadow-lg transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        role="dialog"
        aria-modal="true"
      >
        {Inner}
      </aside>
    </>
  );
}
