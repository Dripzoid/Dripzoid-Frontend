import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  useNavigate,
} from "react-router-dom";

import {
  FiHeart,
} from "react-icons/fi";

import {
  AiOutlineTag,
  AiFillStar,
} from "react-icons/ai";

import {
  useWishlist,
} from "../contexts/WishlistContext.jsx";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE;

const PLACEHOLDER =
  "https://via.placeholder.com/400";

/* =====================================================
   HELPERS
===================================================== */

function getHeaders(
  isJson = true
) {
  const headers = {};

  const token =
    localStorage.getItem(
      "token"
    ) ||
    localStorage.getItem(
      "authToken"
    ) ||
    localStorage.getItem(
      "jwt"
    ) ||
    localStorage.getItem(
      "userToken"
    );

  if (token) {
    headers[
      "Authorization"
    ] = `Bearer ${token}`;
  }

  if (isJson) {
    headers[
      "Content-Type"
    ] =
      "application/json";
  }

  return headers;
}

/* =====================================================
   PRODUCT CARD
===================================================== */

export default function ProductCard({
  product,
}) {
  const navigate =
    useNavigate();

  const [
    current,
    setCurrent,
  ] = useState(0);

  const [
    wlBusy,
    setWlBusy,
  ] = useState(false);

  const {
    wishlist = [],
    addToWishlist,
    removeFromWishlist,
    fetchWishlist,
  } =
    useWishlist() || {};

  /* =========================================
     NORMALIZE PRODUCT
  ========================================= */

  const normalized =
    useMemo(() => {
      if (!product) {
        return {};
      }

      return {
        ...product,

        id:
          product?.id ||
          product?._id ||
          product?.productId ||
          product?.product_id ||
          "",

        name:
          product?.name ||
          "Product",

        category:
          product?.category ||
          product?.categoryData
            ?.category ||
          "",

        price:
          Number(
            product?.price ||
              0
          ),

        originalPrice:
          Number(
            product?.originalPrice ||
              product?.oldPrice ||
              0
          ),

        stock:
          Number(
            product?.stock ||
              0
          ),

        seller:
          product?.seller ||
          "Dripzoid",

        images:
          Array.isArray(
            product?.images
          )
            ? product.images
            : typeof product?.images ===
              "string"
            ? product.images
                .split(",")
                .map((v) =>
                  v.trim()
                )
                .filter(
                  Boolean
                )
            : product?.image
            ? [product.image]
            : [],
      };
    }, [product]);

  const pid = String(
    normalized?.id || ""
  );

  /* =========================================
     WISHLIST
  ========================================= */

  const isWishlisted =
    useMemo(() => {
      if (!pid) {
        return false;
      }

      return (
        wishlist || []
      ).some(
        (w) =>
          String(
            w.product_id ||
              w.id ||
              w.productId ||
              w?.product
                ?.id ||
              ""
          ) === pid
      );
    }, [wishlist, pid]);

  /* =========================================
     REVIEWS
  ========================================= */

  const [
    reviewsList,
    setReviewsList,
  ] = useState([]);

  const [
    reviewsLoading,
    setReviewsLoading,
  ] = useState(false);

  useEffect(() => {
    if (!pid) {
      setReviewsList(
        []
      );

      return;
    }

    const ac =
      new AbortController();

    const fetchReviews =
      async () => {
        setReviewsLoading(
          true
        );

        try {
          const res =
            await fetch(
              `${API_BASE}/api/reviews/product/${encodeURIComponent(
                pid
              )}`,
              {
                method:
                  "GET",

                signal:
                  ac.signal,

                headers:
                  getHeaders(
                    false
                  ),
              }
            );

          if (
            !res.ok
          ) {
            throw new Error(
              "Failed to fetch reviews"
            );
          }

          const rows =
            await res.json();

          /* =====================
             NEW BACKEND
          ===================== */

          if (
            rows?.success &&
            Array.isArray(
              rows.reviews
            )
          ) {
            setReviewsList(
              rows.reviews
            );
          }

          /* =====================
             OLD BACKEND
          ===================== */

          else if (
            Array.isArray(
              rows
            )
          ) {
            setReviewsList(
              rows
            );
          }

          else {
            setReviewsList(
              []
            );
          }
        } catch (err) {
          if (
            err.name ===
            "AbortError"
          ) {
            return;
          }

          console.warn(
            "Reviews fetch failed:",
            err
          );

          setReviewsList(
            []
          );
        } finally {
          setReviewsLoading(
            false
          );
        }
      };

    fetchReviews();

    return () =>
      ac.abort();
  }, [pid]);

  /* =========================================
     RATINGS
  ========================================= */

  const avgRating =
    useMemo(() => {
      if (
        !reviewsList ||
        !reviewsList.length
      ) {
        return 0;
      }

      const sum =
        reviewsList.reduce(
          (
            acc,
            review
          ) =>
            acc +
            Number(
              review.rating ||
                0
            ),

          0
        );

      return (
        sum /
        reviewsList.length
      );
    }, [reviewsList]);

  const reviewsCount =
    reviewsList.length;

  /* =========================================
     IMAGES
  ========================================= */

  const images =
    normalized.images
      ?.length
      ? normalized.images
      : [PLACEHOLDER];

  useEffect(() => {
    setCurrent(
      (idx) =>
        images.length &&
        idx >=
          images.length
          ? 0
          : idx
    );
  }, [images]);

  const [
    imageSrc,
    setImageSrc,
  ] = useState(
    images[0]
  );

  useEffect(() => {
    setImageSrc(
      images[current] ||
        PLACEHOLDER
    );
  }, [images, current]);

  const handleImgError =
    useCallback(() => {
      setImageSrc(
        PLACEHOLDER
      );
    }, []);

  /* =========================================
     PRICING
  ========================================= */

  const hasDiscount =
    normalized.originalPrice >
      normalized.price &&
    normalized
      .originalPrice > 0;

  const discountPercent =
    hasDiscount
      ? Math.round(
          ((normalized.originalPrice -
            normalized.price) /
            normalized.originalPrice) *
            100
        )
      : 0;

  /* =========================================
     STOCK
  ========================================= */

  const getStockBadge =
    useCallback(() => {
      const stock =
        normalized.stock;

      if (
        stock ===
          null ||
        stock ===
          undefined
      ) {
        return null;
      }

      if (stock <= 0) {
        return {
          text: "Out of stock",

          tone:
            "bg-red-600 text-white",
        };
      }

      if (stock <= 5) {
        return {
          text: `Only ${stock} left`,

          tone:
            "bg-amber-500 text-black",
        };
      }

      return {
        text: "In stock",

        tone:
          "bg-green-600 text-white",
      };
    }, [normalized]);

  const stockBadge =
    getStockBadge();

  /* =========================================
     NAVIGATION
  ========================================= */

  const handleNavigate =
    useCallback(() => {
      if (!pid) {
        return;
      }

      navigate(
        `/product/${pid}`
      );
    }, [
      navigate,
      pid,
    ]);

  /* =========================================
     WISHLIST TOGGLE
  ========================================= */

  const handleWishlistToggle =
    async (e) => {
      e.stopPropagation();

      if (
        !pid ||
        wlBusy
      ) {
        return;
      }

      setWlBusy(true);

      try {
        if (
          isWishlisted
        ) {
          if (
            typeof removeFromWishlist ===
            "function"
          ) {
            await removeFromWishlist(
              pid
            );

            if (
              typeof fetchWishlist ===
              "function"
            ) {
              await fetchWishlist();
            }
          }
        } else {
          if (
            typeof addToWishlist ===
            "function"
          ) {
            await addToWishlist(
              pid
            );

            if (
              typeof fetchWishlist ===
              "function"
            ) {
              await fetchWishlist();
            }
          }
        }
      } catch (err) {
        console.warn(
          "Wishlist toggle failed:",
          err
        );
      } finally {
        setWlBusy(false);
      }
    };

  /* =========================================
     EMPTY
  ========================================= */

  if (!product) {
    return null;
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={
        handleNavigate
      }
      className="group relative w-full bg-white dark:bg-neutral-900 border border-gray-100 dark:border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      {/* IMAGE */}

      <div className="relative w-full bg-gray-50 dark:bg-gray-800 overflow-hidden">

        <div className="w-full h-40 sm:h-56 md:aspect-square md:h-auto overflow-hidden">

          <AnimatePresence mode="wait">

            <motion.img
              key={`${current}-${imageSrc}`}
              src={imageSrc}
              alt={
                normalized.name
              }
              className="w-full h-full object-cover"
              initial={{
                opacity: 0,
                scale: 1.02,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
              }}
              transition={{
                duration: 0.28,
              }}
              loading="lazy"
              decoding="async"
              onError={
                handleImgError
              }
            />

          </AnimatePresence>

        </div>

        {/* WISHLIST */}

        <button
          type="button"
          onClick={
            handleWishlistToggle
          }
          disabled={wlBusy}
          className="absolute top-3 right-3 bg-white/95 dark:bg-black/80 rounded-full p-2 shadow-sm"
        >
          <FiHeart
            size={18}
            className={
              isWishlisted
                ? "text-red-500"
                : "text-gray-500"
            }
          />
        </button>

        {/* IMAGE DOTS */}

        {images.length >
          1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">

            {images.map(
              (
                _,
                idx
              ) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(
                    e
                  ) => {
                    e.stopPropagation();

                    setCurrent(
                      idx
                    );
                  }}
                  className={`w-2.5 h-2.5 rounded-full ${
                    idx ===
                    current
                      ? "bg-white"
                      : "bg-white/60"
                  }`}
                />
              )
            )}

          </div>
        )}
      </div>

      {/* INFO */}

      <div className="p-3 sm:p-4 flex flex-col gap-1">

        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
          {
            normalized.name
          }
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {
            normalized.category
          }
        </p>

        {/* PRICE */}

        <div className="mt-1 flex items-center gap-2 flex-wrap">

          <span className="text-base font-bold text-gray-900 dark:text-white">
            ₹
            {normalized.price.toLocaleString()}
          </span>

          {hasDiscount && (
            <>
              <span className="text-xs line-through text-gray-500 dark:text-gray-400">
                ₹
                {normalized.originalPrice.toLocaleString()}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-600 text-white">
                {
                  discountPercent
                }
                % OFF
              </span>
            </>
          )}

          <AiOutlineTag className="text-green-500 ml-auto" />

        </div>

        {/* RATINGS */}

        {reviewsCount >
        0 ? (
          <div className="flex items-center mt-2 gap-2">

            <div className="flex items-center gap-0.5 text-yellow-500">

              {Array.from({
                length: 5,
              }).map(
                (
                  _,
                  idx
                ) => (
                  <AiFillStar
                    key={
                      idx
                    }
                    className={
                      idx <
                      Math.round(
                        avgRating
                      )
                        ? "opacity-100"
                        : "opacity-30"
                    }
                    style={{
                      fontSize: 12,
                    }}
                  />
                )
              )}

            </div>

            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {avgRating.toFixed(
                1
              )}
            </span>

            <span className="text-xs text-gray-500 dark:text-gray-400">
              (
              {
                reviewsCount
              }
              )
            </span>

          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            No Ratings &
            Reviews
          </div>
        )}

        {/* FOOTER */}

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">

          <span className="truncate">
            {
              normalized.seller
            }
          </span>

          {stockBadge && (
            <div
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge.tone}`}
            >
              {
                stockBadge.text
              }
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
