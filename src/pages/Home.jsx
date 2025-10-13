// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Hero from "../components/Hero";

// -----------------------------
// Helper data
// -----------------------------
const slides = [
  { id: 1, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031336/my_project/zvipefqerhrrwazser7f.jpg", title: "Festive Sale — Up to 15% off" },
  { id: 2, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755031334/my_project/nfozagnujns4vatuaht5.jpg", title: "New Arrivals At Dripzoid" },
  { id: 3, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1755030052/my_project/f7iaebagidtamdcquino.jpg", title: "Dripzoid's First Drop" },
  { id: 4, src: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1756676776/my_project/jyvt5sydat3fpislo31y.jpg", title: "Shinchan" },
];

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
// UI Components
// -----------------------------
function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" {...props}>
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
      {to && <Link to={to} className="text-sm underline-offset-4 hover:underline">View all</Link>}
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
          <button onClick={() => onQuickView(product)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">Quick</button>
        </div>
      </div>
    </motion.article>
  );
}

// -----------------------------
// Newsletter Form
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

// -----------------------------
// Testimonials
// -----------------------------
function TestimonialCarousel({ items = [] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((s) => (s + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <div className="relative max-w-3xl mx-auto mt-12">
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

// -----------------------------
// Quick view modal
// -----------------------------
function QuickViewModal({ product, onClose }) {
  return (
    <AnimatePresence>
      {product && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

  const testimonials = useMemo(
    () => [
      { name: "Asha R.", role: "Designer", quote: "The material and fit are perfect. I feel confident every time.", initial: "A" },
      { name: "Vikram S.", role: "Photographer", quote: "Fast shipping and the hoodie is insanely comfortable.", initial: "V" },
      { name: "Maya P.", role: "Stylist", quote: "Great basics that hold up wash after wash.", initial: "M" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased space-y-20">
      {/* Hero */}
      <Hero slides={slides} />

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4">
        <SectionHeader title="Featured" to="/shop" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-6">
          {featured.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQuickView} />)}
        </div>
      </section>

      {/* Trending Products */}
      <section className="max-w-6xl mx-auto px-4">
        <SectionHeader title="Trending" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-6">
          {trending.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQuickView} />)}
        </div>
      </section>

      {/* Sale Products */}
      <section className="max-w-6xl mx-auto px-4">
        <SectionHeader title="On Sale" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-6">
          {sale.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQuickView} />)}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-slate-50 dark:bg-slate-900 py-16">
        <h3 className="text-center text-2xl font-bold mb-6">Subscribe to our Newsletter</h3>
        <NewsletterForm />
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <SectionHeader title="Testimonials" />
        <TestimonialCarousel items={testimonials} />
      </section>

      {/* Quick view modal */}
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
