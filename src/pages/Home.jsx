import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom"; // client-side nav
import { motion, AnimatePresence } from "framer-motion";
import Hero from "../components/Hero"; // keeps your existing hero carousel
import Featured from "../components/FeaturedSection"; // keeps existing featured products

// If you prefer to import logos from src/assets, uncomment these
// import logoLight from "../assets/logo-light.png";
// import logoDark from "../assets/logo-dark.png";

export default function HomePage() {
  const slides = [
    { id: 1, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031336/my_project/zvipefqerhrrwazser7f.jpg", title: "Festive Sale — Up to 15% off" },
    { id: 2, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031334/my_project/nfozagnujns4vatuaht5.jpg", title: "New Arrivals At Dripzoid" },
    { id: 3, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755030052/my_project/f7iaebagidtamdcquino.jpg", title: "Dripzoid's First Drop" },
    { id: 4, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1756676776/my_project/jyvt5sydat3fpislo31y.jpg", title: "Shinchan" },
  ];

  const collections = useMemo(
    () => [
      { id: "c1", name: "Streetwear Essentials", subtitle: "Bold, comfy & effortless", image: slides[0].src },
      { id: "c2", name: "Limited Drops", subtitle: "Only a few pieces left", image: slides[1].src },
      { id: "c3", name: "Newcomers", subtitle: "Fresh fits for every day", image: slides[2].src },
    ],
    []
  );

  const categories = useMemo(
    () => [
      { id: 1, name: "T-Shirts", image: slides[0].src },
      { id: 2, name: "Hoodies", image: slides[1].src },
      { id: 3, name: "Accessories", image: slides[2].src },
      { id: 4, name: "Footwear", image: slides[3].src },
    ],
    []
  );

  // testimonials carousel state
  const testimonials = [
    { id: 1, name: "Asha R.", text: "Quality is unreal — fits perfectly and shipping was super-fast!" },
    { id: 2, name: "Rahul M.", text: "I get compliments every time I wear their tees. Highly recommend." },
    { id: 3, name: "Sima K.", text: "Premium feel for an amazing price. Will buy again." },
  ];
  const [tIndex, setTIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTIndex((i) => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-900 dark:to-black text-gray-900 dark:text-gray-100 antialiased">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Hero carousel (keeps your existing, with a wider container and visual chrome) */}
        <section aria-label="hero" className="relative">
          {/* decorative background radial */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <svg className="absolute left-0 top-0 transform -translate-x-1/3 -translate-y-1/3 opacity-20 dark:opacity-10" width="600" height="600" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="300" cy="300" r="260" fill="url(#g)" />
              <defs>
                <radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(300 300) scale(260)">
                  <stop stopColor="#fff" stopOpacity="0.6" />
                  <stop offset="1" stopColor="#000" stopOpacity="0.02" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: hero + super-charged CTA */}
            <div className="lg:col-span-7">
              <Hero slides={slides} autoPlayMs={4500} />

              {/* feature bullets under hero */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Free shipping</span>
                  <span className="opacity-80">Orders over ₹799</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">30-day returns</span>
                  <span className="opacity-80">Hassle-free</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Secure payment</span>
                  <span className="opacity-80">Encrypted</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Premium materials</span>
                  <span className="opacity-80">Quality first</span>
                </div>
              </div>
            </div>

            {/* Right: Brand card + quick links */}
            <aside className="lg:col-span-5">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-6 shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 p-2">
                    <img src="/logo-light.png" alt="Dripzoid logo" className="max-h-12 block dark:hidden" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <img src="/logo-dark.png" alt="Dripzoid logo" className="max-h-12 hidden dark:block" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">Dripzoid</h3>
                    <p className="text-sm opacity-80">Curated streetwear drops — ethical fabrics, standout design.</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link to="/shop" className="inline-flex items-center justify-center rounded-xl px-4 py-3 bg-black text-white dark:bg-white dark:text-black font-semibold shadow">Shop the Drop</Link>
                  <Link to="/collections" className="inline-flex items-center justify-center rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">Explore Collections</Link>
                </div>

                <div className="mt-5 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Fast delivery</span>
                    <span className="font-semibold">2–4 days</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span>Support</span>
                    <span className="font-semibold">24/7 chat</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link to="/offers" className="text-sm underline">View current offers</Link>
                </div>
              </motion.div>

              {/* floating badges */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-800 shadow">
                  <h4 className="font-semibold">Limited edition</h4>
                  <p className="text-xs opacity-80">Artwork collabs dropping soon</p>
                </div>
                <div className="rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-800 shadow">
                  <h4 className="font-semibold">Sustainable</h4>
                  <p className="text-xs opacity-80">Eco fabrics & low waste</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Collections spotlight (grid cards) */}
        <section aria-label="collections" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Featured Collections</h2>
            <Link to="/collections" className="text-sm underline">See all</Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((c, idx) => (
              <motion.article key={c.id} whileHover={{ scale: 1.02 }} className="group relative rounded-2xl overflow-hidden shadow-lg">
                <img src={c.image} alt={c.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute left-4 bottom-4 text-white">
                  <h3 className="text-lg font-bold">{c.name}</h3>
                  <p className="text-sm opacity-90">{c.subtitle}</p>
                  <Link to={`/collections/${c.id}`} className="mt-3 inline-block text-xs font-semibold px-3 py-2 rounded-full bg-white text-black">Explore</Link>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* categories horizontal scroll to avoid empty space */}
        <section aria-label="categories" className="space-y-4">
          <h3 className="text-xl font-semibold">Shop by category</h3>

          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {categories.map((cat) => (
              <div key={cat.id} className="min-w-[220px] snap-start rounded-2xl shadow-lg overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <img src={cat.image} alt={cat.name} className="w-full h-36 object-cover" />
                <div className="p-4">
                  <h4 className="font-semibold">{cat.name}</h4>
                  <p className="text-sm opacity-80 mt-1">Curated picks</p>
                  <Link to={`/shop?category=${encodeURIComponent(cat.name)}`} className="mt-3 inline-block text-xs font-semibold px-3 py-2 rounded-full bg-black text-white">Shop</Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured products (keeps your original component) */}
        <section id="featured">
          <Featured />
        </section>

        {/* Testimonials + Newsletter */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg">
            <h3 className="text-lg font-bold">What customers say</h3>

            <div className="mt-4">
              <AnimatePresence mode="popLayout">
                <motion.blockquote key={testimonials[tIndex].id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.45 }} className="text-gray-800 dark:text-gray-100">
                  <p className="text-xl leading-relaxed">“{testimonials[tIndex].text}”</p>
                  <footer className="mt-3 text-sm opacity-80">— {testimonials[tIndex].name}</footer>
                </motion.blockquote>
              </AnimatePresence>

              <div className="mt-6 flex gap-3">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTIndex(i)} className={`h-2 rounded-full ${i === tIndex ? "w-10" : "w-4"} bg-gray-300 dark:bg-gray-600 transition-all`} aria-label={`Show testimonial ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl p-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg">
            <h4 className="font-bold">Join the drip</h4>
            <p className="text-sm opacity-80 mt-1">Exclusive updates, early drops & members-only promos.</p>

            <form className="mt-4 grid grid-cols-1 gap-3" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="email" className="sr-only">Email</label>
              <input id="email" type="email" placeholder="you@email.com" required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-transparent placeholder:opacity-60" />
              <button type="submit" className="rounded-xl px-4 py-3 bg-black text-white font-semibold">Subscribe</button>
            </form>

            <div className="mt-4 text-xs opacity-70">We respect your inbox. Unsubscribe anytime.</div>
          </aside>
        </section>

        {/* final CTA */}
        <section className="rounded-2xl p-8 bg-black text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Ready to upgrade your wardrobe?</h3>
            <p className="opacity-80">Discover drops, limited editions and everyday essentials — all in one place.</p>
          </div>

          <div className="flex gap-3">
            <Link to="/shop" className="inline-flex items-center justify-center rounded-2xl px-6 py-3 bg-white text-black font-semibold">Shop Now</Link>
            <Link to="/contact" className="inline-flex items-center justify-center rounded-2xl px-6 py-3 border border-white/20">Get in touch</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
