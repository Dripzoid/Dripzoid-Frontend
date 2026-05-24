// src/pages/Women.jsx

import React, {
  useEffect,
  useState,
} from "react";

import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FiltersSidebar";

import { FiFilter } from "react-icons/fi";

const API_BASE =
  process.env.REACT_APP_API_BASE || "";

const MIN = 0;
const MAX = 10000;

export default function Women() {
  /* =========================================
     STATES
  ========================================= */

  const [
    selectedSubcategories,
    setSelectedSubcategories,
  ] = useState([]);

  const [
    expandedCategories,
    setExpandedCategories,
  ] = useState([]);

  const [priceRange, setPriceRange] =
    useState([MIN, MAX]);

  const [sortOption, setSortOption] =
    useState("");

  const [categoryData, setCategoryData] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const perPageOptions = [
    "12",
    "24",
    "36",
    "all",
  ];

  const [perPage, setPerPage] =
    useState("all");

  const [page, setPage] = useState(1);

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 0,
  });

  /* =========================================
     FETCH CATEGORIES
  ========================================= */

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/products/categories?category=women`
        );

        if (!res.ok) {
          throw new Error(
            "Failed to fetch categories"
          );
        }

        const json = await res.json();

        const raw = Array.isArray(json)
          ? json
          : json.categories || [];

        const mapped = raw.map((c) => ({
          name:
            c?.category ||
            c?.name ||
            "",

          subcategories: Array.isArray(
            c?.subcategories
          )
            ? c.subcategories.map((s) =>
                typeof s === "string"
                  ? s
                  : s?.subcategory ||
                    s?.name
              )
            : [],
        }));

        if (mounted) {
          setCategoryData(mapped);
        }
      } catch (err) {
        console.error(
          "Category fetch error:",
          err
        );

        if (mounted) {
          setCategoryData([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================
     FETCH PRODUCTS
  ========================================= */

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const params =
        new URLSearchParams();

      params.append("category", "women");

      /* =========================
         SUBCATEGORY FILTER
      ========================= */

      if (
        selectedSubcategories.length > 0
      ) {
        params.append(
          "subcategory",
          selectedSubcategories
            .map((item) =>
              item.subcategory
            )
            .join(",")
        );
      }

      /* =========================
         PRICE FILTER
      ========================= */

      params.append(
        "minPrice",
        priceRange[0]
      );

      params.append(
        "maxPrice",
        priceRange[1]
      );

      /* =========================
         SORTING
      ========================= */

      if (sortOption === "low-high") {
        params.append(
          "sort",
          "price_asc"
        );
      }

      else if (
        sortOption === "high-low"
      ) {
        params.append(
          "sort",
          "price_desc"
        );
      }

      else if (
        sortOption === "newest"
      ) {
        params.append(
          "sort",
          "newest"
        );
      }

      /* =========================
         PAGINATION
      ========================= */

      if (perPage !== "all") {
        params.append(
          "limit",
          perPage
        );

        params.append(
          "page",
          page
        );
      }

      const url =
        `${API_BASE}/api/products?${params.toString()}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(
          `Fetch failed ${res.status}`
        );
      }

      const data =
        await res.json();

      /* =====================================
         NEW BACKEND RESPONSE FIX
      ===================================== */

      const productsArray =
        data?.products || [];

      const total =
        Number(data?.count) || 0;

      const limitUsed =
        perPage === "all"
          ? total
          : Number(perPage);

      const pages =
        perPage === "all"
          ? 1
          : Math.ceil(
              total / limitUsed
            );

      setProducts(productsArray);

      setMeta({
        total,
        page,
        pages,
        limit: limitUsed,
      });
    } catch (err) {
      console.error(
        "Products fetch error:",
        err
      );

      setProducts([]);

      setMeta({
        total: 0,
        page: 1,
        pages: 1,
        limit: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  /* =========================================
     REFETCH
  ========================================= */

  useEffect(() => {
    fetchProducts();

    // eslint-disable-next-line
  }, [
    selectedSubcategories,
    priceRange,
    sortOption,
    perPage,
    page,
  ]);

  /* =========================================
     HELPERS
  ========================================= */

  const clearFilters = () => {
    setSelectedSubcategories([]);

    setExpandedCategories([]);

    setPriceRange([MIN, MAX]);

    setSortOption("");

    setPerPage("all");

    setPage(1);
  };

  const handlePerPageChange = (
    value
  ) => {
    setPerPage(value);

    setPage(1);
  };

  const prevPage = () => {
    setPage((prev) =>
      Math.max(1, prev - 1)
    );
  };

  const nextPage = () => {
    setPage((prev) =>
      Math.min(meta.pages, prev + 1)
    );
  };

  /* =========================================
     SKELETON
  ========================================= */

  const SkeletonCard = () => (
  <div className="animate-pulse">

    {/* IMAGE */}

    <div className="bg-gray-200 dark:bg-gray-800 aspect-[3/3.5] rounded-xl mb-4"></div>

    {/* TITLE */}

    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded mb-3"></div>

    {/* PRICE */}

    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
  </div>
);

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">

      {/* SIDEBAR */}

      <div className="hidden lg:block">
        <FilterSidebar
          isStatic
          categoryData={categoryData}
          MIN={MIN}
          MAX={MAX}
          selectedSubcategories={selectedSubcategories}
          setSelectedSubcategories={setSelectedSubcategories}
          expandedCategories={expandedCategories}
          setExpandedCategories={setExpandedCategories}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          sortOption={sortOption}
          setSortOption={setSortOption}
          clearFilters={clearFilters}
          onApply={() => setPage(1)}
        />
      </div>

      {/* MAIN */}

      <main className="flex-1 p-4 sm:p-6">

        {/* TOP BAR */}

        <div className="flex items-center justify-between mb-5">

          <h1 className="text-2xl font-bold">
            Women’s Shop
          </h1>

          <div className="flex items-center gap-3">

            {/* PER PAGE */}

            <div className="hidden sm:flex items-center gap-2">

              <label className="text-sm">
                Per page:
              </label>

              <select
                value={perPage}
                onChange={(e) =>
                  handlePerPageChange(
                    e.target.value
                  )
                }
                className="border rounded-md px-3 py-1 bg-white dark:bg-zinc-900"
              >
                {perPageOptions.map(
                  (opt) => (
                    <option
                      key={opt}
                      value={opt}
                    >
                      {opt === "all"
                        ? "All"
                        : opt}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* FILTER BUTTON */}

            <button
              onClick={() =>
                setSidebarOpen(true)
              }
              className="flex items-center gap-2 border rounded-md px-3 py-1"
            >
              <FiFilter />

              <span className="hidden lg:inline">
                Filters
              </span>
            </button>
          </div>
        </div>

        {/* PRODUCTS */}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({
              length: 6,
            }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold mb-2">
              No products found
            </h2>

            <p className="text-gray-500">
              Try changing filters
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>

            {/* PAGINATION */}

            {perPage !== "all" &&
              meta.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">

                  <button
                    onClick={prevPage}
                    disabled={page <= 1}
                    className="px-4 py-2 border rounded-md disabled:opacity-50"
                  >
                    Prev
                  </button>

                  <span>
                    Page {meta.page} of{" "}
                    {meta.pages}
                  </span>

                  <button
                    onClick={nextPage}
                    disabled={
                      meta.page >=
                      meta.pages
                    }
                    className="px-4 py-2 border rounded-md disabled:opacity-50"
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
