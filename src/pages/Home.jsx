// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Hero from "../components/Hero";
import Featured from "../components/FeaturedSection";

export default function HomePage() {
  const slides = [
    {
      id: 1,
      src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031336/my_project/zvipefqerhrrwazser7f.jpg",
      title: "Festive Sale — Up to 15% off",
    },
    {
      id: 2,
      src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031334/my_project/nfozagnujns4vatuaht5.jpg",
      title: "New Arrivals At Dripzoid",
    },
    {
      id: 3,
      src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755030052/my_project/f7iaebagidtamdcquino.jpg",
      title: "Dripzoid's First Drop",
    },
    {
      id: 4,
      src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1756676776/my_project/jyvt5sydat3fpislo31y.jpg",
      title: "Shinchan",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
      {/* Floating Announcement Bar */}
      <motion.div
        className="bg-black text-white text-center py-2 text-sm fixed top-0 inset-x-0 z-40"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        🎉 Free Shipping on Orders Above ₹999 — Limited Time Offer!
      </motion.div>

      <main className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 lg:pt-28 space-y-20">
        {/* HERO SECTION */}
        <section aria-label="hero" className="relative">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <Hero slides={slides} autoPlayMs={4500} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-3xl sm:text-5xl font-extrabold text-white drop-shadow-lg"
              >
                Wear the Confidence
              </motion.h1>
            </div>
          </div>
        </section>

        {/* BRAND CARD SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-40 h-40 bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center shadow-inner">
              <img
                src="/logo-light.png"
                alt="Dripzoid logo"
                className="w-32 dark:hidden"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <img
                src="/logo-dark.png"
                alt="Dripzoid dark logo"
                className="hidden dark:block w-32"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight">Dripzoid</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">wear the confidence</p>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/shop"
                className="inline-block px-8 py-3 mt-3 rounded-2xl text-lg font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg hover:opacity-90"
              >
                Shop Now
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* FEATURED SECTION */}
        <motion.section id="featured" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">Featured</h3>
            <Link to="/shop" className="text-sm underline-offset-4 hover:underline">View all</Link>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/20 shadow-sm">
            <Featured />
          </div>
        </motion.section>

        {/* TRENDING SECTION */}
        <motion.section id="trending" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">Trending Now</h3>
            <Link to="/collections/trending" className="text-sm underline-offset-4 hover:underline">View all</Link>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-pink-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/20 shadow-sm">
            <Featured />
          </div>
        </motion.section>

        {/* SALE SECTION */}
        <motion.section id="sale" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">On Sale</h3>
            <Link to="/collections/sale" className="text-sm underline-offset-4 hover:underline">Shop Sale</Link>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/20 shadow-sm">
            <Featured />
          </div>
        </motion.section>

        {/* FOOTER CTA */}
        <motion.section
          className="py-10 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white text-center shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h4 className="text-2xl font-bold">Ready to elevate your fit?</h4>
          <p className="mt-2 text-sm opacity-90">Shop the latest collection — crafted for comfort, built for confidence.</p>

          <div className="mt-4 flex items-center justify-center gap-4">
            <Link to="/shop" className="inline-flex items-center px-6 py-3 rounded-xl bg-white text-indigo-600 font-semibold shadow-md">
              Start Shopping
            </Link>
            <a href="/help/size-guide" className="text-sm underline opacity-90">
              Size Guide
            </a>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
