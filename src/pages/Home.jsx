// src/pages/Home.jsx
// Version: V1.1 (Premium Startup Release)

import React from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import OnSale from "../components/OnSale";

// -----------------------------
// Hero slides (Editorial / Fashion)
// -----------------------------
const slides = [
  {
    id: 1,
    src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/dqdsmhr2165v29xajfm4.jpg",
    title: "Launch Sale is Live",
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
    left:
      direction === "right"
        ? el.clientWidth * 0.9
        : -el.clientWidth * 0.9,
    behavior: "smooth",
  });
}

// -----------------------------
// Home Page (V1.1 – Premium)
// -----------------------------
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-black dark:bg-black dark:text-white antialiased">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />

      {/* =============================
          HERO (Editorial Focus)
      ============================== */}
      <section className="mb-20">
        <Hero slides={slides} />
      </section>

      {/* =============================
          PRIMARY COLLECTION CTA
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-28">
        <div className="relative overflow-hidden rounded-2xl p-12 text-center shadow-sm">
          {/* Soft luxury background */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#f7f5f2] to-[#ffffff] dark:from-slate-900 dark:to-black" />

          <span className="block text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400 mb-4">
            New Season Drop
          </span>

          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5">
            Designed for Modern Living
          </h2>

          <p className="max-w-xl mx-auto text-sm md:text-base text-slate-600 dark:text-slate-300 mb-10">
            Discover thoughtfully curated styles — blending comfort,
            craftsmanship, and contemporary fashion.
          </p>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center px-10 py-4 rounded-full text-sm font-semibold tracking-wide transition-all bg-black text-white dark:bg-white dark:text-black hover:scale-[1.02]"
          >
            Explore Collection
          </Link>
        </div>
      </section>

      {/* =============================
          ON SALE (Only when active)
      ============================== */}
      <section
        id="sale"
        className="relative max-w-7xl mx-auto px-6 mb-28"
      >
        {/* Desktop Scroll Controls */}
        <button
          aria-label="Scroll sale left"
          onClick={() => scrollSectionById("sale", "left")}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 dark:bg-black/70 shadow backdrop-blur items-center justify-center"
        >
          ←
        </button>

        <button
          aria-label="Scroll sale right"
          onClick={() => scrollSectionById("sale", "right")}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 dark:bg-black/70 shadow backdrop-blur items-center justify-center"
        >
          →
        </button>

        <OnSale />
      </section>

      {/* =============================
          FEATURED PICKS
      ============================== */}
      <section
        id="featured"
        className="max-w-7xl mx-auto px-6 mb-28"
      >
        <div className="mb-10">
          <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
            Featured Picks
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Handpicked styles our customers love.
          </p>
        </div>

        <FeaturedSection />
      </section>

      {/* =============================
          TRENDING NOW
      ============================== */}
      <section
        id="trending"
        className="max-w-7xl mx-auto px-6 mb-32"
      >
        <div className="mb-10">
          <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
            Trending Now
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Styles defining this season.
          </p>
        </div>

        <TrendingSection />
      </section>
    </main>
  );
}
