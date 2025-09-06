// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom"; // use Link for client-side nav
import Hero from "../components/Hero";
import Featured from "../components/FeaturedSection";

// Option A: Public folder logos (leave as-is if logos are in public/)
// const logoLight = "/logo-light.png";
// const logoDark = "/logo-dark.png";

// Option B: Import from src/assets (uncomment if logos are in src/assets)
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
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Hero carousel */}
        <Hero slides={slides} autoPlayMs={4500} />

        {/* Large logo + Shop Now CTA */}
        <section aria-label="brand-hero" className="flex flex-col items-center justify-center -mt-6">
          <div className="w-56 md:w-72 lg:w-96 h-auto">
            {/* If using public/ folder logos, keep the /logo-*.png paths.
                If using imports from src/assets, replace src with {logoLight} / {logoDark}. */}
            <img
              src="/logo-light.png"
              alt="Dripzoid logo"
              className="block w-full h-auto object-contain drop-shadow-xl dark:hidden"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <img
              src="/logo-dark.png"
              alt="Dripzoid logo (dark)"
              className="hidden w-full h-auto object-contain drop-shadow-xl dark:block"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          <Link
            to="/shop"
            className="mt-6 inline-block px-8 py-4 rounded-2xl text-lg font-semibold bg-black text-white dark:bg-white dark:text-black shadow-lg transition-opacity hover:opacity-90"
            aria-label="Shop now"
          >
            Shop Now
          </Link>
        </section>

        {/* Featured products */}
        <section id="featured">
          <Featured />
        </section>
      </main>
    </div>
  );
}
