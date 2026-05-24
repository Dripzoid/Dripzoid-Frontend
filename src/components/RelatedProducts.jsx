// src/components/RelatedProducts.jsx

import React from "react";
import ProductCard from "./ProductCard";

/* =====================================================
   🔥 RELATED PRODUCTS
===================================================== */

export default function RelatedProducts({
  relatedProducts = [],
  galleryImages = [],
  loading = false,
}) {
  /* =========================================
     NORMALIZE RESPONSE
  ========================================= */

  const items = React.useMemo(() => {
    /* =========================
       ARRAY RESPONSE
    ========================= */

    if (Array.isArray(relatedProducts)) {
      return relatedProducts;
    }

    /* =========================
       API OBJECT RESPONSE
    ========================= */

    if (
      relatedProducts &&
      Array.isArray(
        relatedProducts.products
      )
    ) {
      return relatedProducts.products;
    }

    return [];
  }, [relatedProducts]);

  /* =========================================
     FALLBACK IMAGE
  ========================================= */

  const fallbackImage =
    Array.isArray(
      galleryImages
    ) &&
    galleryImages.length
      ? galleryImages[0]
      : "https://via.placeholder.com/600x800?text=Dripzoid";

  /* =========================================
     LOADING STATE
  ========================================= */

  if (loading) {
    return (
      <section className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 p-4 md:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-5 text-black dark:text-white">
          You might be interested in
        </h2>

        {/* MOBILE */}

        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(
              (i) => (
                <SkeletonCard
                  key={i}
                />
              )
            )}
          </div>
        </div>

        {/* DESKTOP */}

        <div className="hidden md:grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(
            (i) => (
              <SkeletonCard
                key={i}
              />
            )
          )}
        </div>
      </section>
    );
  }

  /* =========================================
     EMPTY STATE
  ========================================= */

  if (!items.length) {
    return (
      <section className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
          You might be interested in
        </h2>

        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">
            No related products found
          </p>
        </div>
      </section>
    );
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <section className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 p-4 md:p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-5 text-black dark:text-white">
        You might be interested in
      </h2>

      {/* MOBILE */}

      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map(
            (
              product,
              index
            ) => (
              <div
                key={
                  product?.id ||
                  index
                }
                className="flex-shrink-0 w-[70%] sm:w-[48%]"
              >
                <ProductCard
                  product={toCardShape(
                    product,
                    fallbackImage
                  )}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* DESKTOP */}

      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {items.map(
          (
            product,
            index
          ) => (
            <ProductCard
              key={
                product?.id ||
                index
              }
              product={toCardShape(
                product,
                fallbackImage
              )}
            />
          )
        )}
      </div>
    </section>
  );
}

/* =====================================================
   🔥 NORMALIZE PRODUCT
===================================================== */

function toCardShape(
  product,
  fallbackImage
) {
  if (!product) {
    return {
      id: null,
      name: "Product",
      price: 0,
      images: [
        fallbackImage,
      ],
    };
  }

  /* =========================================
     IMAGE NORMALIZATION
  ========================================= */

  let images = [];

  if (
    Array.isArray(
      product.images
    )
  ) {
    images =
      product.images.filter(
        Boolean
      );
  }

  else if (
    typeof product.images ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          product.images
        );

      if (
        Array.isArray(
          parsed
        )
      ) {
        images =
          parsed.filter(
            Boolean
          );
      }
    } catch {
      images = [
        product.images,
      ];
    }
  }

  else if (
    product.image
  ) {
    images = [
      product.image,
    ];
  }

  if (!images.length) {
    images = [
      fallbackImage,
    ];
  }

  /* =========================================
     RETURN
  ========================================= */

  return {
    id:
      product.id ||
      product._id ||
      product.productId ||
      "",

    slug:
      product.slug ||
      "",

    name:
      product.name ||
      product.title ||
      "Product",

    category:
      product.category ||
      "",

    subcategory:
      product.subcategory ||
      "",

    price: Number(
      product.price ?? 0
    ),

    originalPrice:
      Number(
        product.originalPrice ??
          0
      ),

    stock: Number(
      product.stock ?? 0
    ),

    sold: Number(
      product.sold ?? 0
    ),

    featured:
      Boolean(
        product.featured
      ),

    rating: Number(
      product.rating ?? 0
    ),

    totalStock:
      Number(
        product.totalStock ??
          0
      ),

    images,

    sizes:
      Array.isArray(
        product.sizes
      )
        ? product.sizes
        : [],

    sizeRows:
      Array.isArray(
        product.sizeRows
      )
        ? product.sizeRows
        : [],

    sizeStock:
      product.sizeStock ||
      {},
  };
}

/* =====================================================
   🔥 SKELETON CARD
===================================================== */

function SkeletonCard() {
  return (
    <div className="animate-pulse flex-shrink-0 w-[70%] sm:w-[48%] md:w-auto">
      {/* IMAGE */}

      <div className="bg-gray-200 dark:bg-gray-800 aspect-square rounded-2xl mb-4"></div>

      {/* TITLE */}

      <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded mb-3"></div>

      {/* PRICE */}

      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
    </div>
  );
}
