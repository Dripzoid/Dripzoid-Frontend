import React, { useEffect, useMemo, useRef, useState } from "react";
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
      className="group bg-white dark:bg-black border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden flex-none w-1/2 md:w-1/4 lg:w-1/4 snap-start"
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
// Horizontal scroll list with arrows
// -----------------------------
function HorizontalScroller({ id, title, subtitle, items, onQuickView, to }) {
  const ref = useRef(null);

  const scroll = (dir = "right") => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9; // almost full viewport of scroller
    el.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section id={id} className="max-w-6xl mx-auto px-4 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {to && <Link to={to} className="text-sm underline-offset-4 hover:underline">View all</Link>}
      </div>

      <div className="relative">
        {/* Arrows */}
        <button
          aria-label={`Scroll ${title} left`}
          onClick={() => scroll("left")}
          className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 shadow-md"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-6 md:px-10"
        >
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onQuickView={onQuickView} />
          ))}
        </div>

        <button
          aria-label={`Scroll ${title} right`}
          onClick={() => scroll("right")}
          className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 shadow-md"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* small hint arrow visible on mobile */}
      <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
        <span className="text-xs text-slate-500">Swipe</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}

// -----------------------------
// Main Page
// -----------------------------
export default function HomePage() {
  const [trending] = useState(() => productSeed(8));
  const [featured] = useState(() => productSeed(8).slice(0, 8));
  const [sale] = useState(() => productSeed(8).map((p, i) => ({ ...p, salePrice: p.price - 200 - i * 50 })));
  const [quickView, setQuickView] = useState(null);

  // spacer above hero to create gap between nav bar and carousel (useful if nav is fixed)
  // adjust h-16 if your navbar height differs
  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased space-y-12">
      <div className="h-16" /> {/* gap between navbar and carousel */}

      {/* Hero */}
      <Hero slides={slides} />

      {/* Big Shop Now CTA between carousel and featured */}
      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-black dark:to-slate-900 rounded-2xl p-8 text-center shadow-lg">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Shop the Drop</h2>
          <p className="text-sm text-white/90 mb-6">Discover new arrivals, limited editions and curated favourites.</p>
          <Link to="/shop" className="inline-block px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg shadow">Shop Now</Link>
        </div>
      </div>

      {/* Featured Products (horizontal scroll) */}
      <HorizontalScroller id="featured" title="Featured" items={featured} onQuickView={setQuickView} to="/shop" />

      {/* Trending Products */}
      <HorizontalScroller id="trending" title="Trending" items={trending} onQuickView={setQuickView} />

      {/* Sale Products */}
      <HorizontalScroller id="sale" title="On Sale" items={sale} onQuickView={setQuickView} />

      {/* Quick view modal */}
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
