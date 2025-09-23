// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import Featured from "../components/FeaturedSection";

// Optional: If you keep svg/png logos in src/assets uncomment these
// import logoLight from "../assets/logo-light.png";
// import logoDark from "../assets/logo-dark.png";

export default function HomePage() {
  const slides = [
    { id: 1, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031336/my_project/zvipefqerhrrwazser7f.jpg", title: "Festive Sale — Up to 15% off" },
    { id: 2, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031334/my_project/nfozagnujns4vatuaht5.jpg", title: "New Arrivals At Dripzoid" },
    { id: 3, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755030052/my_project/f7iaebagidtamdcquino.jpg", title: "Dripzoid's First Drop" },
    { id: 4, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1756676776/my_project/jyvt5sydat3fpislo31y.jpg", title: "Shinchan" },
  ];

  return (
    // Outer wrapper - light theme is white by requirement
    <div className="min-h-screen bg-white text-black dark:bg-slate-900 dark:text-white antialiased">
      {/* Centered page container */}
      <main className="max-w-7xl mx-auto px-6 py-10 md:py-14 space-y-12">
        {/* Top navigation (logo left, categories center, account/search right) */}
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            {/* Logo: prefer importing from src/assets for bundlers; otherwise use /logo-*.png in public/ */}
            <div className="w-32 md:w-40 lg:w-48">
              <img
                src="/logo-light.png"
                alt="Dripzoid logo"
                className="block w-full h-auto object-contain drop-shadow-sm dark:hidden"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/logo-dark.png"
                alt="Dripzoid logo (dark)"
                className="hidden w-full h-auto object-contain drop-shadow-sm dark:block"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>

          <nav className="hidden md:flex gap-6 text-sm md:text-base font-medium tracking-wide">
            <Link to="/men" className="hover:underline">MEN</Link>
            <Link to="/women" className="hover:underline">WOMEN</Link>
            <Link to="/kids" className="hover:underline">KIDS</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/signin" className="text-sm md:text-base">Sign in</Link>
            <button aria-label="search" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main hero card: large rounded card with left content and right model image (matches uploaded image layout) */}
        <section aria-label="hero-card" className="w-full">
          <div className="rounded-2xl shadow-xl overflow-hidden bg-white dark:bg-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-12 items-center">
              {/* Left side text area */}
              <div className="md:col-span-7 p-8 md:p-12 lg:p-16">
                <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-amber-800 dark:text-amber-300">
                  DRIPZOID
                </h2>
                <p className="mt-6 text-2xl md:text-3xl font-medium text-gray-700 dark:text-gray-200 leading-relaxed">
                  STYLE THAT POPS
                </p>
                <div className="mt-8">
                  <Link
                    to="/shop"
                    aria-label="Shop now"
                    className="inline-block px-8 py-3 rounded-2xl text-lg font-semibold bg-amber-700 text-white shadow-md hover:opacity-95 transition"
                  >
                    SHOP NOW
                  </Link>
                </div>
              </div>

              {/* Right side image area */}
              <div className="md:col-span-5 relative h-72 md:h-96 lg:h-96">
                {/* Use the first slide's image as the large model image. Provide object-cover and position similar to image. */}
                <img
                  src={slides[0].src}
                  alt="model"
                  className="absolute inset-0 h-full w-full object-cover object-right md:object-center"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories row (pills) */}
        <section aria-label="categories" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h3 className="text-lg md:text-xl font-serif">CATEGORIES</h3>

          <div className="flex gap-4">
            <button className="px-6 py-2 rounded-xl bg-sky-200 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 shadow-sm">MEN</button>
            <button className="px-6 py-2 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-800/40 dark:text-sky-200 shadow-sm">WOMEN</button>
            <button className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200 shadow-sm">KIDS</button>
          </div>
        </section>

        {/* Featured products */}
        <section id="featured">
          <div className="rounded-xl bg-white dark:bg-transparent p-6 md:p-8 shadow-sm">
            <h4 className="text-2xl md:text-3xl font-serif mb-6">FEATURED PRODUCTS</h4>

            {/* Keep the Featured component but give it a container that matches styling from the image */}
            <div className="">
              <Featured />
            </div>
          </div>
        </section>

        {/* Footer spacing */}
        <div className="h-8" />
      </main>
    </div>
  );
}
