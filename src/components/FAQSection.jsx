// FAQSection.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, ChevronDown, ChevronUp } from "lucide-react";

const FAQS = [
{
id: "shipping-time",
q: "How long does shipping take?",
a:
"Standard shipping within India typically takes 3–7 business days. Express shipping options (1–3 business days) are available at checkout for an additional fee. International delivery times vary by destination and customs processing — expect 7–21 business days depending on the country.",
},
{
id: "returns-policy",
q: "What is your returns & exchange policy?",
a:
"You can return unworn items within 14 days of delivery for an exchange or store credit. Sale/clearance items may be final sale — check the product page for exceptions. Items must be in original condition with tags. Start a return via 'My Orders' or contact support at support@dripzoid.com.",
},
{
id: "size-guide",
q: "How do I choose the right size?",
a:
"Our product pages include a detailed size chart and model measurements. If you're between sizes, we recommend sizing up for a relaxed fit or down for a slimmer fit depending on the product description. Use the live chat for personalised advice.",
},
{
id: "materials-care",
q: "What materials do you use & how do I care for my clothes?",
a:
"We use premium cotton blends, denim, and technical fabrics depending on the style. Care instructions are on each product page and the garment label. Most items are machine-wash cold and hang-dry — avoid high heat to preserve prints and fabric integrity.",
},
{
id: "payment-options",
q: "Which payment methods do you accept?",
a:
"We accept major debit/credit cards, UPI, netbanking, and popular wallets. For international orders we accept international cards and selected payment gateways. All payments are processed securely via PCI-compliant partners.",
},
{
id: "track-order",
q: "How can I track my order?",
a:
"After your order ships we send an email and SMS with tracking details. You can also view tracking from 'My Orders' in your account. If tracking hasn't updated, contact support and we'll investigate.",
},
{
id: "discounts-promo",
q: "Do you have discount codes or student offers?",
a:
"We run seasonal sales, early-access drops, and occasional promo codes via email and social channels. Subscribe to our newsletter for exclusive offers. Student discounts may be available during select campaigns — check the banner or contact support.",
},
{
id: "out-of-stock",
q: "What happens if an item is out of stock?",
a:
"If an item is out of stock you can request a restock alert on the product page. For limited drops, restocks are not always guaranteed — check product pages for availability and sign up for alerts.",
},
{
id: "gift-cards",
q: "Do you offer gift cards?",
a:
"Yes — digital gift cards are available in a range of amounts. They can be redeemed at checkout and do not expire. Gift cards cannot be exchanged for cash.",
},
{
id: "wholesale",
q: "Do you offer wholesale or bulk orders?",
a:
"We offer wholesale partnerships for retailers and bulk order discounts for brands/events. Email business@dripzoid.com with your enquiry and our team will follow up.",
},
];


// ✅ FIXED SLIDE VARIANTS (REAL SLIDER)
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export default function FAQSection({ className = "" }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) =>
      (f.q + " " + f.a).toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (index >= filtered.length) {
      setIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length]);

  const go = useCallback(
    (dir) => {
      if (filtered.length <= 1) return;
      const next = (index + dir + filtered.length) % filtered.length;
      setDirection(dir);
      setIndex(next);
      setExpandedId(null);
    },
    [index, filtered.length]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const current = filtered[index];
  if (!current) return null;

  return (
    <section className={`py-12 px-4 ${className}`}>
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">FAQ</h2>

          <div className="flex gap-2">
            <button onClick={() => go(-1)} className="p-2 border rounded">
              <ArrowLeft size={16} />
            </button>
            <button onClick={() => go(1)} className="p-2 border rounded">
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6">
          <div className="flex items-center border rounded px-3 py-2">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ml-2 outline-none w-full"
              placeholder="Search..."
            />
          </div>
        </div>

        {/* 🚀 CAROUSEL FIX */}
        <div className="relative overflow-hidden">

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: "easeInOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.x < -100) go(1);
                else if (info.offset.x > 100) go(-1);
              }}
              style={{ willChange: "transform" }}
              className="absolute w-full"
            >
              {/* ❌ NO layout HERE */}
              <div className="bg-white border rounded-xl p-6 shadow max-w-3xl mx-auto min-h-[220px]">

                <h3 className="text-lg font-semibold">
                  {current.q}
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  {current.a}
                </p>

                <button
                  onClick={() =>
                    setExpandedId(prev =>
                      prev === current.id ? null : current.id
                    )
                  }
                  className="mt-4 flex items-center gap-2 text-sm"
                >
                  {expandedId === current.id ? (
                    <>
                      <ChevronUp size={16} /> Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} /> Read more
                    </>
                  )}
                </button>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* DOTS */}
        <div className="mt-4 flex justify-center gap-2">
          {filtered.map((f, i) => (
            <button
              key={f.id}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
                setExpandedId(null);
              }}
              className={`w-2 h-2 rounded-full ${
                i === index ? "bg-black" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
