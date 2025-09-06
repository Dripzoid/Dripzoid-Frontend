// src/components/FiltersSidebar.jsx
import React from "react";

export default function FiltersSidebar({
  filters,
  setFilters,
  categories = [],
  colors = [],
  onClear,
}) {
  return (
    <aside className="w-72 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-bold">Filters</h4>
        <button className="text-sm text-gray-500" onClick={onClear}>Clear</button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Search</label>
        <input
          value={filters.search || ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          placeholder="Search products..."
          className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          value={filters.category || ""}
          onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined, page: 1 })}
          className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Color</label>
        <select
          value={filters.color || ""}
          onChange={(e) => setFilters({ ...filters, color: e.target.value || undefined, page: 1 })}
          className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white"
        >
          <option value="">All</option>
          {colors.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ""}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value || undefined, page: 1 })}
            className="w-1/2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice || ""}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value || undefined, page: 1 })}
            className="w-1/2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Sort</label>
        <select
          value={filters.sort || "newest"}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })}
          className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
      </div>
    </aside>
  );
}
