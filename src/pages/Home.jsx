// src/pages/Home.jsx
// Version: V2.0 – Advanced Premium Fashion Homepage
// NOTE: Navbar & Footer are intentionally untouched

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import OnSale from "../components/OnSale";

/* ---------------------------------
   Default Data (seed / fallback)
---------------------------------- */
const DEFAULT_SLIDES = [
  {
    id: "slide-1",
    src:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/dqdsmhr2165v29xajfm4.jpg",
    title: "New Season Drop",
    cta: { label: "Shop The Drop", href: "/shop?category=women" },
  },
];

const DEFAULT_SALES = [
  {
    id: "sale-1",
    title: "Winter Edit — Up to 40% Off",
    subtitle: "Selected styles for a limited time",
    isActive: true,
    banner:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/sale_banner.jpg",
    url: "/shop?promo=winter-edit",
  },
];

/* ---------------------------------
   Horizontal Scroll Helper
---------------------------------- */
function scrollSectionById(sectionId, direction = "right") {
  const root = document.getElementById(sectionId);
  if (!root) return;

  const el =
    root.querySelector(".overflow-x-auto") ||
    root.querySelector("[data-scroll]") ||
    root.querySelector("div");
  if (!el || el.scrollWidth <= el.clientWidth) return;

  el.scrollBy({
    left: direction === "right" ? el.clientWidth * 0.9 : -el.clientWidth * 0.9,
    behavior: "smooth",
  });
}

/* ---------------------------------
   Category -> default subcategory map
   (used to send sensible filter query params)
---------------------------------- */
const CATEGORY_MAP = {
  women: { label: "Women", defaultSub: "tops" },
  men: { label: "Men", defaultSub: "shirts" },
  kids: { label: "Kids", defaultSub: "toddlers" },
  nightwear: { label: "Nightwear", defaultSub: "sets" },
  sarees: { label: "Sarees", defaultSub: "silk" },
};

/* ---------------------------------
   Home Page
---------------------------------- */
export default function HomePage() {
  // slides & sales live here and are passed down to Hero & OnSale
  const [slides, setSlides] = useState(() => {
    try {
      const raw = localStorage.getItem("home.slides");
      return raw ? JSON.parse(raw) : DEFAULT_SLIDES;
    } catch {
      return DEFAULT_SLIDES;
    }
  });

  const [sales, setSales] = useState(() => {
    try {
      const raw = localStorage.getItem("home.sales");
      return raw ? JSON.parse(raw) : DEFAULT_SALES;
    } catch {
      return DEFAULT_SALES;
    }
  });

  // persist locally (optional; can be removed if you'd rather load from API)
  useEffect(() => {
    try {
      localStorage.setItem("home.slides", JSON.stringify(slides));
    } catch {}
  }, [slides]);

  useEffect(() => {
    try {
      localStorage.setItem("home.sales", JSON.stringify(sales));
    } catch {}
  }, [sales]);

  // CRUD helpers for slides (Hero can call these via props)
  function addSlide(newSlide) {
    setSlides((s) => [{ id: `slide-${Date.now()}`, ...newSlide }, ...s]);
  }
  function removeSlide(id) {
    setSlides((s) => s.filter((x) => x.id !== id));
  }
  function updateSlide(id, patch) {
    setSlides((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  // CRUD helpers for sales (OnSale can call these via props)
  function addSale(newSale) {
    setSales((s) => [{ id: `sale-${Date.now()}`, ...newSale }, ...s]);
  }
  function removeSale(id) {
    setSales((s) => s.filter((x) => x.id !== id));
  }
  function toggleSaleActive(id) {
    setSales((s) => s.map((x) => (x.id === id ? { ...x, isActive: !x.isActive } : x)));
  }
  function updateSale(id, patch) {
    setSales((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  // Select the first active sale (if any)
  const activeSale = sales.find((s) => s.isActive) || null;

  // categories displayed in UI (order preserved)
  const categories = ["Women", "Men", "Kids", "Nightwear", "Sarees"];

  return (
    <main className="min-h-screen bg-[#fafafa] text-black dark:bg-black dark:text-white antialiased">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />

      {/* =============================
          HERO (Fashion Editorial)
          - passes slides + slide handlers (add/update/remove)
          - heroPromo (activeSale) is provided so Hero can optionally surface sale
      ============================== */}
      <section className="mb-24">
        <Hero
          slides={slides}
          addSlide={addSlide}
          removeSlide={removeSlide}
          updateSlide={updateSlide}
          heroPromo={activeSale}
        />
      </section>

      {/* =============================
          CATEGORY SPOTLIGHT
          - Ethnic replaced with Sarees
          - Links go to /shop with category + subcategory query params
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-28">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-6 text-center">
          {categories.map((label) => {
            const key = label.toLowerCase();
            const cat = CATEGORY_MAP[key] || { label, defaultSub: "all" };
            const to = `/shop?category=${encodeURIComponent(key)}&subcategory=${encodeURIComponent(
              cat.defaultSub
            )}`;

            return (
              <Link key={label} to={to} className="group">
                <div className="aspect-square rounded-full bg-[#f1f1f1] dark:bg-slate-800 mb-3 transition-transform group-hover:scale-105" />
                <span className="text-sm font-medium tracking-wide">{cat.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* =============================
          COLLECTION HIGHLIGHT
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="text-center mb-14">
          <span className="text-xs tracking-widest uppercase text-slate-500">The Drop</span>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mt-3">Curated for Modern Living</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {["Festive Wear", "Everyday Comfort", "Work Essentials"].map((title) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl bg-[#f5f5f5] dark:bg-slate-900"
            >
              <div className="aspect-[4/5] transition-transform group-hover:scale-105 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <Link
                  to={`/shop?collection=${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`}
                  className="text-sm underline underline-offset-4"
                >
                  Explore Collection →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =============================
          ON SALE (Conditional)
          - Section id: on-sale
          - Dynamic heading based on active sale (title / subtitle)
          - Pass sales + handlers so OnSale can create/manage sales
      ============================== */}
      <section id="on-sale" className="relative max-w-7xl mx-auto px-6 mb-32">
        <button
          onClick={() => scrollSectionById("on-sale", "left")}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 dark:bg-black/70 shadow items-center justify-center"
          aria-label="scroll sale left"
        >
          ←
        </button>

        <button
          onClick={() => scrollSectionById("on-sale", "right")}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 dark:bg-black/70 shadow items-center justify-center"
          aria-label="scroll sale right"
        >
          →
        </button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="text-xs tracking-widest uppercase text-slate-500">Featured</span>
            <h2 className="text-3xl font-semibold tracking-tight mt-1">{activeSale ? activeSale.title : "On Sale"}</h2>
            {activeSale && activeSale.subtitle && (
              <p className="text-sm text-slate-600 dark:text-slate-400">{activeSale.subtitle}</p>
            )}
          </div>

          {/* small quick controls (optional) */}
          <div className="flex items-center gap-2">
            {sales.length > 0 && (
              <button
                onClick={() => toggleSaleActive(sales[0].id)}
                className="text-sm px-3 py-1 rounded-md border"
                title="Toggle first sale active (quick demo)"
              >
                {sales[0].isActive ? "Deactivate" : "Activate"}
              </button>
            )}
          </div>
        </div>

        <OnSale
          sales={sales}
          addSale={addSale}
          removeSale={removeSale}
          updateSale={updateSale}
          toggleSaleActive={toggleSaleActive}
        />
      </section>

      {/* =============================
          FEATURED (component handles title)
          removed duplicated heading per request
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <FeaturedSection />
      </section>

      {/* =============================
          TRENDING (component handles title)
          removed duplicated heading per request
      ============================== */}
      <section className="max-w-7xl mx-auto px-6 mb-40">
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
