import React from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import OnSale from "../components/OnSale";

// -----------------------------
// Helper data (Hero)
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

  const selectorCandidates = [
    ".overflow-x-auto",
    "[data-scroll]",
    ".scrollable",
    ".products",
    ".items",
    "div",
  ];

  let el = null;
  for (const sel of selectorCandidates) {
    const found = root.querySelector(sel);
    if (!found) continue;

    if (found.scrollWidth > found.clientWidth) {
      el = found;
      break;
    }
  }

  if (!el) return;
  const amount = Math.round(el.clientWidth * 0.9);
  el.scrollBy({
    left: direction === "right" ? amount : -amount,
    behavior: "smooth",
  });
}

// -----------------------------
// Home Page
// -----------------------------
export default function HomePage() {
  return (
    <div className="min-h-screen text-base bg-white text-black dark:bg-black dark:text-white antialiased space-y-12">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />

      {/* Hero */}
      <Hero slides={slides} />

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="relative rounded-2xl p-8 text-center shadow-lg overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white to-slate-100 dark:from-slate-900 dark:to-slate-800" />

          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Shop the Drop
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
            Discover new arrivals, limited editions and curated favourites.
          </p>

          <Link
            to="/shop"
            className="inline-block px-8 py-4 rounded-lg font-semibold shadow transition-colors bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-95"
          >
            Shop Now
          </Link>
        </div>
      </div>

      {/* On Sale */}
      <section id="sale" className="relative max-w-6xl mx-auto px-4">
        <button
          aria-label="Scroll Sale left"
          onClick={() => scrollSectionById("sale", "left")}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow"
        >
          ←
        </button>

        <button
          aria-label="Scroll Sale right"
          onClick={() => scrollSectionById("sale", "right")}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow"
        >
          →
        </button>

        <div className="mt-2">
          <OnSale />
        </div>
      </section>

      {/* Featured */}
      <section id="featured" className="relative max-w-6xl mx-auto px-4">
        <div className="mt-2">
          <FeaturedSection />
        </div>
      </section>

      {/* Trending */}
      <section id="trending" className="relative max-w-6xl mx-auto px-4">
        <div className="mt-2">
          <TrendingSection />
        </div>
      </section>
    </div>
  );
}
