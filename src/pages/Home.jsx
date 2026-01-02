// src/pages/Home.jsx
// Version: V1.2 – Premium Fashion Homepage
// NOTE: Navbar & Footer are intentionally untouched

import React from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import OnSale from "../components/OnSale";

/* ---------------------------------
   Hero Slides (Editorial Style)
---------------------------------- */
const slides = [
  {
    id: 1,
    src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/dqdsmhr2165v29xajfm4.jpg",
    title: "New Season Drop",
  },
];

/* ---------------------------------
   Horizontal Scroll Helper
---------------------------------- */
function scrollSectionById(sectionId, direction = "right") {
  const root = document.getElementById(sectionId);
  if (!root) return;

  const el = root.querySelector(".overflow-x-auto, [data-scroll], div");
  if (!el || el.scrollWidth <= el.clientWidth) return;

  el.scrollBy({
    left:
      direction === "right"
        ? el.clientWidth * 0.9
        : -el.clientWidth * 0.9,
    behavior: "smooth",
  });
}

/* ---------------------------------
   Home Page
---------------------------------- */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-black dark:bg-black dark:text-white antialiased">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />

      {/* =============================
          HERO (Fashion Editorial)
      ============================== */}
      <section className="mb-24">
        <Hero slides={slides} />
      </section>

      {/* =============================
          CATEGORY SPOTLIGHT
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-28">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-6 text-center">
          {["Women", "Men", "Kids", "Nightwear", "Ethnic"].map((cat) => (
            <Link
              key={cat}
              to={`/shop?category=${cat.toLowerCase()}`}
              className="group"
            >
              <div className="aspect-square rounded-full bg-[#f1f1f1] dark:bg-slate-800 mb-3 transition-transform group-hover:scale-105" />
              <span className="text-sm font-medium tracking-wide">
                {cat}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* =============================
          COLLECTION HIGHLIGHT
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="text-center mb-14">
          <span className="text-xs tracking-widest uppercase text-slate-500">
            The Drop
          </span>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mt-3">
            Curated for Modern Living
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            "Festive Wear",
            "Everyday Comfort",
            "Work Essentials",
          ].map((title) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl bg-[#f5f5f5] dark:bg-slate-900"
            >
              <div className="aspect-[4/5] transition-transform group-hover:scale-105 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-lg font-semibold mb-2">
                  {title}
                </h3>
                <span className="text-sm underline underline-offset-4">
                  Explore Collection →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =============================
          ON SALE (Conditional)
      ============================== */}
      <section
        id="sale"
        className="relative max-w-7xl mx-auto px-6 mb-32"
      >
        <button
          onClick={() => scrollSectionById("sale", "left")}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 dark:bg-black/70 shadow items-center justify-center"
        >
          ←
        </button>

        <button
          onClick={() => scrollSectionById("sale", "right")}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 dark:bg-black/70 shadow items-center justify-center"
        >
          →
        </button>

        <OnSale />
      </section>

      {/* =============================
          FEATURED PICKS
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="mb-10">
          <h3 className="text-3xl font-semibold tracking-tight mb-2">
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
      <section className="max-w-7xl mx-auto px-6 mb-40">
        <div className="mb-10">
          <h3 className="text-3xl font-semibold tracking-tight mb-2">
            Trending Now
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            What everyone is wearing this season.
          </p>
        </div>

        <TrendingSection />
      </section>

      {/* =============================
          TRUST STRIP
      ============================== */}
      <section className="border-t border-slate-200 dark:border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-center">
          <div>🚚 Free Shipping</div>
          <div>🔄 Easy Returns</div>
          <div>💳 Secure Payments</div>
          <div>🧵 Premium Fabric</div>
        </div>
      </section>
    </main>
  );
}
