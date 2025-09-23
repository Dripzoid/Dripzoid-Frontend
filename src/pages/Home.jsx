// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import Featured from "../components/FeaturedSection";
import { motion } from "framer-motion";
import { Sparkles, Star, TrendingUp } from "lucide-react";

export default function HomePage() {
  const slides = [
    { id: 1, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031336/my_project/zvipefqerhrrwazser7f.jpg", title: "Festive Sale — Up to 15% off" },
    { id: 2, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031334/my_project/nfozagnujns4vatuaht5.jpg", title: "New Arrivals At Dripzoid" },
    { id: 3, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755030052/my_project/f7iaebagidtamdcquino.jpg", title: "Dripzoid's First Drop" },
    { id: 4, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1756676776/my_project/jyvt5sydat3fpislo31y.jpg", title: "Shinchan" },
  ];

  const highlights = [
    { icon: <Sparkles className="w-6 h-6" />, title: "Exclusive Drops", desc: "Limited edition designs you won’t find elsewhere." },
    { icon: <TrendingUp className="w-6 h-6" />, title: "Premium Quality", desc: "Curated fabrics & elevated styles." },
    { icon: <Star className="w-6 h-6" />, title: "Top Rated", desc: "Loved by 10,000+ drip enthusiasts." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-white dark:from-black dark:via-neutral-900 dark:to-black text-black dark:text-white antialiased">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-24">
        {/* Hero carousel */}
        <Hero slides={slides} autoPlayMs={4500} />

        {/* Logo + CTA Section */}
        <section
          aria-label="brand-hero"
          className="flex flex-col items-center justify-center text-center space-y-6"
        >
          <motion.div
            className="w-56 md:w-72 lg:w-96 h-auto relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src="/logo-light.png"
              alt="Dripzoid logo"
              className="block w-full h-auto object-contain drop-shadow-2xl dark:hidden"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <img
              src="/logo-dark.png"
              alt="Dripzoid logo (dark)"
              className="hidden w-full h-auto object-contain drop-shadow-2xl dark:block"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </motion.div>

          <p className="max-w-lg text-neutral-600 dark:text-neutral-300 text-sm sm:text-base">
            Where streetwear meets creativity — <span className="font-semibold">crafted for bold individuals.</span>
          </p>

          <Link
            to="/shop"
            className="px-10 py-4 rounded-2xl text-lg font-semibold bg-black text-white dark:bg-white dark:text-black shadow-xl transition-transform transform hover:scale-105 hover:shadow-2xl"
            aria-label="Shop now"
          >
            Shop Now
          </Link>
        </section>

        {/* Highlights Section */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {highlights.map((item, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-3 p-6 bg-neutral-100 dark:bg-neutral-800 rounded-2xl shadow-md hover:shadow-xl transition-all"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
            >
              <div className="p-3 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-lg">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Featured products */}
        <section id="featured" className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">Featured Picks</h2>
          <Featured />
        </section>
      </main>
    </div>
  );
}
