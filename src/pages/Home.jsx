// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import Hero from "../components/Hero";
import Featured from "../components/FeaturedSection";

// NOTE: This file is intentionally large and self-contained to provide a feature-rich
// black & white themed home page with advanced UI patterns, animations, and accessible
// components. It assumes TailwindCSS + Framer Motion + react-helmet-async are installed.

// -----------------------------
// Helper data (placeholder)
// -----------------------------
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

// small product mock used across sections - replace with live API data when ready
const productSeed = (count = 8) =>
  Array.from({ length: count }).map((_, i) => ({
    id: `p-${i + 1}`,
    name: ["Studio Tee", "Track Pants", "Oversized Hoodie", "Capsule Jacket"][i % 4] + ` ${i + 1}`,
    price: 999 + i * 250,
    salePrice: i % 3 === 0 ? 799 + i * 200 : null,
    img: slides[i % slides.length].src,
    badge: i % 3 === 0 ? "Limited" : i % 5 === 0 ? "New" : null,
  }));

// -----------------------------
// Small UI components
// -----------------------------
function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden {...props}>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHeader({ title, subtitle, to }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm underline-offset-4 hover:underline">
          View all
        </Link>
      )}
    </div>
  );
}

function Price({ price, salePrice }) {
  return (
    <div className="flex items-baseline gap-2">
      {salePrice ? (
        <>
          <span className="text-sm font-semibold">₹{salePrice}</span>
          <span className="text-xs line-through text-slate-400">₹{price}</span>
        </>
      ) : (
        <span className="text-sm font-semibold">₹{price}</span>
      )}
    </div>
  );
}

function ProductCard({ product, onQuickView }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
      className="group bg-white dark:bg-black border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      <div className="relative w-full h-56 bg-slate-100 dark:bg-slate-900">
        <img src={product.img} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
        {product.badge && (
          <span className="absolute left-3 top-3 px-2 py-1 text-xs font-semibold rounded bg-black text-white/90 dark:bg-white dark:text-black">{product.badge}</span>
        )}
        <button
          onClick={() => onQuickView(product)}
          className="absolute right-3 top-3/2 bg-white/90 dark:bg-black/80 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Quick view"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{product.name}</h4>
          <Price price={product.price} salePrice={product.salePrice} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">A relaxed fit, premium fabric — made for everyday confidence.</p>

        <div className="flex items-center gap-3">
          <button className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:opacity-95">Add to cart</button>
          <button
            onClick={() => onQuickView(product)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm"
          >
            Quick
          </button>
        </div>
      </div>
    </motion.article>
  );
}

// -----------------------------
// Larger Components
// -----------------------------
function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) return setStatus({ type: "error", message: "Please enter a valid email" });
    setStatus({ type: "loading" });
    setTimeout(() => setStatus({ type: "success", message: "Subscribed — welcome to the drip." }), 900);
  };

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-3">
      <label htmlFor="newsletter" className="sr-only">Email</label>
      <input
        id="newsletter"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3 bg-transparent focus:outline-none"
      />
      <button type="submit" className="px-5 py-3 rounded-lg bg-slate-900 text-white font-semibold">Subscribe</button>
      <div className="w-full mt-2 sm:mt-0 text-sm text-center">
        {status?.type === "loading" && <span className="text-slate-500">Subscribing...</span>}
        {status?.type === "error" && <span className="text-red-500">{status.message}</span>}
        {status?.type === "success" && <span className="text-green-500">{status.message}</span>}
      </div>
    </form>
  );
}

function TestimonialCarousel({ items = [] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((s) => (s + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-black border border-slate-100 dark:border-slate-800 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.45 }}
            className="space-y-3"
          >
            <p className="text-sm text-slate-700 dark:text-slate-300">{items[index].quote}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">{items[index].initial}</div>
              <div>
                <div className="text-sm font-semibold">{items[index].name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{items[index].role}</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        {items.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full ${i === index ? "bg-slate-900" : "bg-slate-300"}`} aria-label={`Go to testimonial ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

function QuickViewModal({ product, onClose }) {
  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="relative max-w-3xl w-full bg-white dark:bg-black rounded-2xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="h-80 md:h-auto bg-slate-100 dark:bg-slate-900">
                <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{product.name}</h3>
                  <Price price={product.price} salePrice={product.salePrice} />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">High quality fabric, modern fit. Free returns and shipping over ₹999.</p>
                <div className="flex items-center gap-3">
                  <button className="flex-1 py-3 rounded-lg bg-slate-900 text-white font-semibold">Add to cart</button>
                  <button className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">Details</button>
                </div>
                <button onClick={onClose} className="text-sm underline opacity-80">Close</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// -----------------------------
// Main Page
// -----------------------------
export default function HomePage() {
  const [trending, setTrending] = useState(() => productSeed(8));
  const [featured, setFeatured] = useState(() => productSeed(6));
  const [sale, setSale] = useState(() => productSeed(6).map((p, i) => ({ ...p, salePrice: p.price - 200 - i * 50 })));
  const [quickView, setQuickView] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // mock testimonials
  const testimonials = useMemo(
    () => [
      { name: "Asha R.", role: "Designer", quote: "The material and fit are perfect. I feel confident every time.", initial: "A" },
      { name: "Vikram S.", role: "Photographer", quote: "Fast shipping and the hoodie is insanely comfortable.", initial: "V" },
      { name: "Maya P.", role: "Stylist", quote: "Great basics that hold up wash after wash.", initial: "M" },
    ],
    []
  );

  useEffect(() => {
    // In real app: fetch collections from API here
    // setFeatured(...), setTrending(...)
  }, []);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased">
      <Helmet>
        <title>Dripzoid — Wear the Confidence</title>
        <meta name="description" content="Dripzoid — premium streetwear. Wear the confidence with curated essentials and limited drops." />
        <meta property="og:title" content="Dripzoid — Wear the Confidence" />
        <meta property="og:description" content="Shop premium streetwear built for comfort and style." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Announcements */}
      <motion.div className="fixed top-4 left-1/2 -translate-x-1/2 z-50" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="text-xs bg-black/90 text-white px-4 py-2 rounded-full shadow-lg">Free shipping over ₹999 — limited time</div>
      </motion.div>

      {/* Top navigation */}
      <header className="sticky top-6 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center justify-between bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-3xl px-4 py-3 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileNavOpen((s) => !s)} aria-label="menu" className="md:hidden p-2 rounded-lg">
                <IconMenu className="text-black dark:text-white" />
              </button>

              <Link to="/" className="font-display text-lg font-bold tracking-tight">Dripzoid</Link>

              <ul className="hidden md:flex items-center gap-6 text-sm">
                <li><Link to="/shop" className="hover:underline">Shop</Link></li>
                <li><Link to="/collections/trending" className="hover:underline">Trending</Link></li>
                <li><Link to="/collections/sale" className="hover:underline">Sale</Link></li>
                <li><Link to="/about" className="hover:underline">About</Link></li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3 bg-transparent rounded-lg p-1">
                <button onClick={() => setSearchOpen((s) => !s)} className="p-2 rounded-md" aria-label="search">
                  <IconSearch className="text-black dark:text-white" />
                </button>
                <Link to="/account" className="text-sm hidden sm:inline">Account</Link>
              </div>

              <Link to="/cart" className="bg-black text-white dark:bg-white dark:text-black px-3 py-2 rounded-lg text-sm font-semibold">Cart</Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60">
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="w-72 bg-white dark:bg-black h-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="font-bold text-lg">Dripzoid</div>
                <button onClick={() => setMobileNavOpen(false)} className="p-2">Close</button>
              </div>
              <ul className="flex flex-col gap-4">
                <li><Link to="/shop" onClick={() => setMobileNavOpen(false)}>Shop</Link></li>
                <li><Link to="/collections/trending" onClick={() => setMobileNavOpen(false)}>Trending</Link></li>
                <li><Link to="/collections/sale" onClick={() => setMobileNavOpen(false)}>Sale</Link></li>
                <li><Link to="/about" onClick={() => setMobileNavOpen(false)}>About</Link></li>
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-start justify-center pt-28 px-4">
            <div className="w-full max-w-3xl bg-white dark:bg-black rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <IconSearch className="text-slate-600 dark:text-slate-300" />
                <input autoFocus placeholder="Search for products, tees, hoodies..." className="w-full bg-transparent outline-none" />
                <button onClick={() => setSearchOpen(false)} className="text-sm">Close</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 pt-10 pb-24 space-y-20">
        {/* HERO */}
        <section aria-label="hero" className="relative">
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            <Hero slides={slides} autoPlayMs={4200} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-8">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">Wear the Confidence</h1>
                <p className="mt-3 text-base text-slate-200 max-w-lg">Elevated essentials and statement pieces — minimal, bold, and built to last.</p>
                <div className="mt-6 flex items-center gap-3">
                  <Link to="/shop" className="px-6 py-3 rounded-2xl bg-white text-black font-semibold">Shop Now</Link>
                  <Link to="/collections/new" className="px-4 py-3 rounded-2xl border border-white/30 text-white">New</Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Brand intro and features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white dark:bg-black p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h2 className="text-2xl font-bold">Dripzoid — Built Different</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">We focus on fit, fabric and design — essentials that make you feel confident.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">Premium Fabric</div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">Free Shipping</div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">Easy Returns</div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">Sustainable</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <SectionHeader title="Featured" subtitle="Hand-picked styles" to="/shop" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-black p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <SectionHeader title="Trending" subtitle="Loved this week" to="/collections/trending" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                {trending.slice(0, 4).map((p) => (
                  <div key={p.id} className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                    <img src={p.img} alt={p.name} className="w-full h-36 object-cover" />
                    <div className="p-3">
                      <div className="text-sm font-medium">{p.name}</div>
                      <Price price={p.price} salePrice={p.salePrice} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trending large section */}
        <section>
          <div className="bg-white dark:bg-black p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <SectionHeader title="Trending Now" subtitle="Hot right now" to="/collections/trending" />

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trending.map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
              ))}
            </div>
          </div>
        </section>

        {/* Sale large section */}
        <section>
          <div className="bg-white dark:bg-black p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <SectionHeader title="On Sale" subtitle="Limited time savings" to="/collections/sale" />

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sale.map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
              ))}
            </div>
          </div>
        </section>

        {/* Editorial strip */}
        <section>
          <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="h-48 md:h-auto">
                <img src={slides[0].src} alt="editorial" className="w-full h-full object-cover grayscale" />
              </div>
              <div className="p-6 flex flex-col justify-center">
                <h3 className="text-2xl font-bold">Minimal Looks, Maximum Impact</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">A carefully curated set of essentials — pared back design, elevated materials.</p>
                <div className="mt-4">
                  <Link to="/collections/new" className="text-sm underline">Discover the edit</Link>
                </div>
              </div>
              <div className="p-6 border-l border-slate-100 dark:border-slate-800">
                <div className="text-sm font-semibold">Why basics matter</div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Quality basics create the foundation for personal style. Invest in pieces that last.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials & social proof */}
        <section>
          <div className="bg-white dark:bg-black p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-1">
                <h3 className="text-2xl font-bold">Loved by customers</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Real reviews from our community.</p>
              </div>
              <div className="md:col-span-2">
                <TestimonialCarousel items={testimonials} />
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section>
          <div className="bg-gradient-to-r from-black to-white dark:from-white dark:to-black p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-lg">
            <h3 className="text-2xl font-bold text-center">Join the drop list</h3>
            <p className="text-sm text-center mt-2 text-slate-500 dark:text-slate-300">Be first to know about new drops and exclusive offers.</p>
            <div className="mt-6">
              <NewsletterForm />
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section>
          <div className="py-10 px-6 rounded-2xl bg-black text-white text-center shadow-xl">
            <h4 className="text-2xl font-bold">Ready to elevate your fit?</h4>
            <p className="mt-2 text-sm opacity-90">Shop the latest — designed for comfort, built for confidence.</p>

            <div className="mt-4 flex items-center justify-center gap-4">
              <Link to="/shop" className="inline-flex items-center px-6 py-3 rounded-xl bg-white text-black font-semibold shadow-md">Start Shopping</Link>
              <a href="/help/size-guide" className="text-sm underline opacity-90">Size Guide</a>
            </div>
          </div>
        </section>
      </main>

      {/* Quick view modal */}
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
