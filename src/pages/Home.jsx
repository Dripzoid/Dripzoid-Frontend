import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import OnSale from "../components/OnSale";

// -----------------------------
// Helper data (only used by Hero)
// -----------------------------
const slides = [
  { id: 1, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031336/my_project/zvipefqerhrrwazser7f.jpg", title: "Festive Sale — Up to 15% off" },
  { id: 2, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031334/my_project/nfozagnujns4vatuaht5.jpg", title: "New Arrivals At Dripzoid" },
  { id: 3, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755030052/my_project/f7iaebagidtamdcquino.jpg", title: "Dripzoid's First Drop" },
];

// -----------------------------
// Small utility to find the first horizontal scrollable element inside a section
// Best-effort — depends on how your imported components render, but it'll work in most cases.
// -----------------------------
function scrollSectionById(sectionId, direction = "right") {
  const root = document.getElementById(sectionId);
  if (!root) return;

  // heuristics: look for a common class or element that is horizontally scrollable
  const selectorCandidates = [
    ".overflow-x-auto",
    "[data-scroll]",
    ".scrollable",
    ".products",
    ".items",
    ".hs-scroll",
    "div",
  ];

  let el = null;
  for (const sel of selectorCandidates) {
    const found = root.querySelector(sel);
    if (found) {
      // make sure it actually scrolls horizontally
      const style = window.getComputedStyle(found);
      if (style.overflowX === "auto" || style.overflowX === "scroll" || found.scrollWidth > found.clientWidth) {
        el = found;
        break;
      }

      // last-resort fallback: accept any found element
      if (!el) el = found;
    }
  }

  if (!el) return;
  const amount = Math.round(el.clientWidth * 0.9);
  el.scrollBy({ left: direction === "right" ? amount : -amount, behavior: "smooth" });
}

// -----------------------------
// Main Page
// -----------------------------
export default function HomePage() {
  // quick state to force re-render if needed (not strictly necessary)
  const [, setTick] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased space-y-12">
      {/* spacer — useful if navbar is fixed */}
      <div className="h-16" />

      {/* Hero / Carousel */}
      <Hero slides={slides} />

      {/* Shop Now CTA (theme-friendly) */}
      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="rounded-2xl p-8 text-center shadow-lg overflow-hidden relative">
          {/* background adapts to theme: subtle light gradient in light mode, stronger gradient in dark mode */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white to-slate-100 dark:from-slate-900 dark:to-slate-800" />

          <h2 className="text-3xl md:text-4xl font-bold mb-4">Shop the Drop</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">Discover new arrivals, limited editions and curated favourites.</p>

          {/* Button styling flips to remain visible in both themes */}
          <Link
            to="/shop"
            className="inline-block px-8 py-4 rounded-lg font-semibold shadow transition-colors
                       bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-transparent hover:opacity-95"
            aria-label="Shop Now"
          >
            Shop Now
          </Link>
        </div>
      </div>

      {/* Featured Section (imported component) */}
      <section id="featured" className="relative max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold tracking-tight">Featured</h3>
          <Link to="/shop" className="text-sm underline-offset-4 hover:underline">View all</Link>
        </div>

        {/* overlay arrows (desktop) — these try to scroll the first horizontal container inside the imported component */}
        <button
          aria-label="Scroll Featured left"
          onClick={() => scrollSectionById("featured", "left")}
          className="hidden md:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          aria-label="Scroll Featured right"
          onClick={() => scrollSectionById("featured", "right")}
          className="hidden md:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* the imported component that contains the products */}
        <div className="mt-2">
          <FeaturedSection />
        </div>

        {/* mobile swipe hint */}
        <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
          <span className="text-xs text-slate-500">Swipe</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* Trending Section */}
      <section id="trending" className="relative max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold tracking-tight">Trending</h3>
          <div />
        </div>

        <button
          aria-label="Scroll Trending left"
          onClick={() => scrollSectionById("trending", "left")}
          className="hidden md:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          aria-label="Scroll Trending right"
          onClick={() => scrollSectionById("trending", "right")}
          className="hidden md:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="mt-2">
          <TrendingSection />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
          <span className="text-xs text-slate-500">Swipe</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* On Sale Section */}
      <section id="sale" className="relative max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold tracking-tight">On Sale</h3>
          <div />
        </div>

        <button
          aria-label="Scroll Sale left"
          onClick={() => scrollSectionById("sale", "left")}
          className="hidden md:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          aria-label="Scroll Sale right"
          onClick={() => scrollSectionById("sale", "right")}
          className="hidden md:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 dark:bg-black/75 shadow-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="mt-2">
          <OnSale />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
          <span className="text-xs text-slate-500">Swipe</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* small re-render helper (not used visually) */}
      <div style={{ display: "none" }} aria-hidden />
    </div>
  );
}
