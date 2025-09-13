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
export default function FilterSidebar({
  isOpen = false,
  isStatic = false,
  onClose = () => {},
  onApply = () => {},
  categoryData = [], // backend: [{ name, subcategories: [string] }]
  colorsList = [],
  MIN = 0,
  MAX = 10000,

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
    if (!isStatic && isOpen) {
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isStatic]);

  /* ---------- Category helpers ---------- */
  const toggleCategory = (categoryName) =>
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );

  const isSelected = (categoryName, subName) =>
    selectedSubcategories.some(
      (s) => s.category === categoryName && s.subcategory === subName
    );

  const toggleSubcategory = (categoryName, subName) =>
    setSelectedSubcategories((prev) => {
      if (
        prev.some((s) => s.category === categoryName && s.subcategory === subName)
      ) {
        return prev.filter(
          (s) => !(s.category === categoryName && s.subcategory === subName)
        );
      }
      return [...prev, { category: categoryName, subcategory: subName }];
    });

  const handlePriceChange = (index, rawValue) => {
    const value = Number(rawValue);
    const next = [...priceRange];
    if (index === 0) next[0] = Math.min(Math.max(MIN, value), next[1]);
    else next[1] = Math.max(Math.min(MAX, value), next[0]);
    setPriceRange(next);
  };

  /* ---------- Sort categories manually ---------- */
  const categoryOrder = ["Men", "Women", "Kids"];
  const sortedCategories = [...categoryData].sort(
    (a, b) => categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name)
  );

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
                className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <span className="font-medium">{category.name}</span>
                <span className="text-sm font-bold select-none">
                  {expandedCategories.includes(category.name) ? "−" : "+"}
                </span>
              </button>

              {expandedCategories.includes(category.name) && (
                <div className="mt-2 ml-6 flex flex-wrap gap-2">
                  {category.subcategories.map((sub) => {
                    const active = isSelected(category.name, sub);
                    return (
                      <button
                        key={sub}
                        onClick={() => toggleSubcategory(category.name, sub)}
                        className={`px-3 py-1 rounded-full text-sm border transition ${
                          active
                            ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                            : "bg-white dark:bg-transparent text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                        aria-pressed={active}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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
            const selected = selectedColors.includes(rawColor);
            return (
              <button
                key={`${rawColor}-${i}`}
                onClick={() =>
                  setSelectedColors((prev) =>
                    prev.includes(rawColor)
                      ? prev.filter((x) => x !== rawColor)
                      : [...prev, rawColor]
                  )
                }
                aria-label={`color-${rawColor}`}
                title={String(rawColor)}
                className={`w-8 h-8 rounded-full transition flex items-center justify-center focus:outline-none ${
                  selected ? "ring-2 ring-offset-1" : ""
                }`}
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
        className={`fixed inset-0 bg-black/30 transition-opacity ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 bottom-0 transform w-80 bg-white dark:bg-black shadow-lg transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {Inner}
      </aside>
    </>
  );
}
