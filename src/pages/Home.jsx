// src/pages/Home.jsx
// Version: V2.3 – Added Premium Play Store CTA (Web Only)

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Smartphone } from "lucide-react";

import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import FAQSection from "../components/FAQSection";

/* ---------------------------------
   Helpers
---------------------------------- */

// Detect TWA / PWA
function isInTWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// Detect Mobile
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}


// Embedded CTA (Below Hero)
function PlayStoreSection() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isInTWA() && isMobile()) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 mb-20">
      <div className="rounded-3xl bg-gradient-to-r from-black to-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/10">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 512 512">
              <path fill="#34A853" d="M325.3 234.3L104.6 13.6c-7.7 7.7-12.6 18.4-12.6 30.3v424.3c0 11.9 4.9 22.6 12.6 30.3l220.7-220.7z"/>
              <path fill="#FBBC05" d="M349.3 258.3l68.6-39.7c18.3-10.6 18.3-37.2 0-47.8l-68.6-39.7-24 24 24 24z"/>
              <path fill="#EA4335" d="M104.6 498.4c7.7 7.7 18.4 12.6 30.3 12.6 6.8 0 13.3-1.6 19.1-4.6l220.7-127.4-24-24-246.1 143.4z"/>
              <path fill="#4285F4" d="M104.6 13.6l246.1 143.4 24-24L154 5.6C148.2 2.6 141.7 1 134.9 1c-11.9 0-22.6 4.9-30.3 12.6z"/>
            </svg>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-semibold">
              Shop Faster on Dripzoid App 🚀
            </h3>
            <p className="text-sm text-white/70">
              Smoother experience • Exclusive deals • Faster checkout
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <a
          href="https://play.google.com/store/apps/details?id=com.dripzoid.twa&pcampaignid=web_share"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:scale-105 transition flex items-center gap-2 shadow-lg"
        >
          <Smartphone size={18} />
          Download App
        </a>
      </div>
    </section>
  );
}

/* ---------------------------------
   Default Data
---------------------------------- */

const DEFAULT_SLIDES = [
  {
    id: "slide-1",
    src:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/dqdsmhr2165v29xajfm4.jpg",
    title: "New Season Drop",
    cta: { label: "Shop Now", href: "/shop" },
  },
];

const DEFAULT_SALES = [
  {
    id: "sale-1",
    title: "Limited Time Offers",
    isActive: true,
    banner:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/sale_banner.jpg",
    url: "/shop",
  },
];

/* ---------------------------------
   Home Page
---------------------------------- */

export default function HomePage() {
  const [slides, setSlides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("home.slides")) || DEFAULT_SLIDES;
    } catch {
      return DEFAULT_SLIDES;
    }
  });

  const [sales, setSales] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("home.sales")) || DEFAULT_SALES;
    } catch {
      return DEFAULT_SALES;
    }
  });

  useEffect(() => {
    localStorage.setItem("home.slides", JSON.stringify(slides));
  }, [slides]);

  useEffect(() => {
    localStorage.setItem("home.sales", JSON.stringify(sales));
  }, [sales]);

  const activeSale = sales.find((s) => s.isActive) || null;

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-black text-black dark:text-white">
      <div className="h-16" />

      {/* HERO */}
     <section className="mb-10">
  <Hero slides={slides} heroPromo={activeSale} />
</section>

{/* ✅ Embedded Play Store CTA */}
<PlayStoreSection />

      {/* CATEGORY */}
      <section className="max-w-7xl mx-auto px-6 mb-28">
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            { label: "Men", to: "/men", img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769234530/my_project/q9yp4y9u9db6plxswvqm.jpg" },
            { label: "Women", to: "/women", img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769234485/my_project/jjohfsp34dtkjqpbwdju.jpg" },
            { label: "Kids", to: "/kids", img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769234558/my_project/axzwtgc54k9u7jcryawe.jpg" },
          ].map((cat) => (
            <Link key={cat.label} to={cat.to} className="group">
              <div className="aspect-square rounded-full overflow-hidden mb-4 shadow-md group-hover:scale-105 transition">
                <img src={cat.img} alt={cat.label} className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-semibold tracking-wide">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <FeaturedSection />
      </section>

      {/* TRENDING */}
      <section className="max-w-7xl mx-auto px-6 mb-40">
        <TrendingSection />
      </section>

      {/* TRUST */}
      <section className="border-t border-slate-200 dark:border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {[
            { title: "Fast Shipping", subtitle: "Powered by Shiprocket", img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769225552/my_project/focg52j1sxvgcdswqml3.jpg" },
            { title: "Secure Payments", subtitle: "Trusted Razorpay Gateway", img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769225506/my_project/qkqygkjqz364i7ym0nm1.jpg" },
            { title: "Premium Fabrics", subtitle: "Crafted by Dripzoid", img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1768910178/my_project/nwugfdsdrkdtv7obsoq9.png" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white dark:bg-slate-900 shadow-lg p-8 text-center hover:shadow-xl transition">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 dark:border-slate-800">
        <FAQSection className="mt-24 mb-24" />
      </section>

    </main>
  );
}
