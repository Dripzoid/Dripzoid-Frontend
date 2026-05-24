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

    if (
      Array.isArray(
        relatedProducts
      )
    ) {
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
      : "/placeholder.png";

  /* =========================================
     LOADING STATE
  ========================================= */

  if (loading) {
    return (
      <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">

        <h2 className="text-xl font-bold mb-5 text-black dark:text-white">
          You might be interested in
        </h2>

        {/* MOBILE */}

        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4">

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
      <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-6 border border-gray-200/60 dark:border-gray-700/60">

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
    <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">

      <h2 className="text-xl font-bold mb-5 text-black dark:text-white">
        You might be interested in
      </h2>

      {/* MOBILE */}

      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4">

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
                className="flex-shrink-0 min-w-[60%] sm:min-w-[45%] snap-start"
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

  const images =
    Array.isArray(
      product.images
    ) &&
    product.images.length
      ? product.images
      : product.image
      ? [product.image]
      : [fallbackImage];

  /* =========================================
     PRESERVE BACKEND DATA
  ========================================= */

  return {
    ...product,

    id:
      product.id ||
      product._id ||
      product.productId ||
      null,

    slug:
      product.slug ||
      "",

    name:
      product.name ||
      product.title ||
      "Product",

    price:
      Number(
        product.price ??
          product.cost ??
          0
      ),

    originalPrice:
      Number(
        product.originalPrice ??
          0
      ),

    images,

    category:
      product.category ||
      "",

    subcategory:
      product.subcategory ||
      "",

    stock:
      product.stock ??
      0,

    totalStock:
      product.totalStock ??
      0,

    featured:
      Boolean(
        product.featured
      ),

    sold:
      Number(
        product.sold ??
          0
      ),

    rating:
      Number(
        product.rating ??
          0
      ),

    sizeStock:
      product.sizeStock ||
      {},

    sizeRows:
      Array.isArray(
        product.sizeRows
      )
        ? product.sizeRows
        : [],

    sizes:
      Array.isArray(
        product.sizes
      )
        ? product.sizes
        : [],
  };
}

/* =====================================================
   🔥 SKELETON CARD
===================================================== */

function SkeletonCard() {
  return (
    <div className="animate-pulse flex-shrink-0 min-w-[60%] sm:min-w-[45%] md:min-w-0">

      {/* IMAGE */}

      <div className="bg-gray-200 dark:bg-gray-800 aspect-[3/3.5] rounded-xl mb-4"></div>

      {/* TITLE */}

      <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded mb-3"></div>

      {/* PRICE */}

      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
    </div>
  );
}
