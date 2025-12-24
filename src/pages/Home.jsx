import React from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import OnSale from "../components/OnSale";

// -----------------------------
// Hero slides
// -----------------------------
const slides = [
  {
    id: 1,
    src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/dqdsmhr2165v29xajfm4.jpg",
    title: "Launch Sale is Live Now..!",
  },
];

// -----------------------------
// Horizontal scroll helper
// -----------------------------
function scrollSectionById(sectionId, direction = "right") {
  const root = document.getElementById(sectionId);
  if (!root) return;

  const candidates = [
    ".overflow-x-auto",
    "[data-scroll]",
    ".scrollable",
    ".products",
    ".items",
    "div",
  ];

  let el = null;
  for (const sel of candidates) {
    const found = root.querySelector(sel);
    if (found && found.scrollWidth > found.clientWidth) {
      el = found;
      break;
    }
  }

  if (!el) return;

  el.scrollBy({
    left: direction === "right" ? el.clientWidth * 0.9 : -el.clientWidth * 0.9,
    behavior: "smooth",
  });
}

// -----------------------------
// Home Page (OLD FORMAT RESTORED)
// -----------------------------
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />

      {/* =============================
          HERO
      ============================== */}
      <section className="mb-14">
        <Hero slides={slides} />
      </section>

      {/* =============================
          CTA (Old-style spacing)
      ============================== */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <div className="relative rounded-xl p-8 text-center shadow-md">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white to-slate-100 dark:from-slate-900 dark:to-slate-800" />

          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Shop the Drop
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
            Discover new arrivals, limited editions and curated favourites.
          </p>

          <Link
            to="/shop"
            className="inline-block px-8 py-4 rounded-lg font-semibold shadow transition bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-95"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* =============================
          ON SALE
      ============================== */}
      <section
        id="sale"
        className="relative max-w-6xl mx-auto px-4 mb-20"
      >
        <button
          aria-label="Scroll sale left"
          onClick={() => scrollSectionById("sale", "left")}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow items-center justify-center"
        >
          ←
        </button>

        <button
          aria-label="Scroll sale right"
          onClick={() => scrollSectionById("sale", "right")}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow items-center justify-center"
        >
          →
        </button>

        <OnSale />
      </section>

      {/* =============================
          FEATURED
      ============================== */}
      <section
        id="featured"
        className="max-w-6xl mx-auto px-4 mb-20"
      >
        <FeaturedSection />
      </section>

      {/* =============================
          TRENDING
      ============================== */}
      <section
        id="trending"
        className="max-w-6xl mx-auto px-4 mb-24"
      >
        <TrendingSection />
      </section>
    </main>
  );
}
