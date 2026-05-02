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

// SLIDER
const slideVariants = {
  enter: (dir) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    scale: 0.96,
  }),
};

export default function FAQSection() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) =>
      (f.q + f.a).toLowerCase().includes(q)
    );
  }, [query]);

  const go = useCallback((dir) => {
    if (filtered.length <= 1) return;
    setDirection(dir);
    setIndex((prev) => (prev + dir + filtered.length) % filtered.length);
    setExpandedId(null);
  }, [filtered.length]);

  useEffect(() => {
    const key = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go]);

  const current = filtered[index];
  if (!current) return null;

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white via-neutral-50 to-white dark:from-black dark:via-neutral-900 dark:to-black text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              FAQ — Need help?
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2 max-w-md">
              Find quick answers about shipping, returns, and more.
            </p>
          </div>

          {/* SEARCH */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-neutral-100 dark:bg-white/10 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-full px-4 py-2 w-72 transition">
              <Search className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent outline-none text-sm ml-2 w-full placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              />
            </div>

            {/* NAV */}
            <div className="flex gap-2">
              <button
                onClick={() => go(-1)}
                className="p-2 rounded-full bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 transition"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => go(1)}
                className="p-2 rounded-full bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 transition"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* CAROUSEL */}
        <div className="relative overflow-hidden">

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x < -80) go(1);
                if (info.offset.x > 80) go(-1);
              }}
              className="w-full"
            >
              {/* CARD */}
              <div className="relative bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl p-8 shadow-xl dark:shadow-2xl max-w-3xl mx-auto min-h-[220px] transition">

                <h3 className="text-xl font-semibold">
                  {current.q}
                </h3>

                <p className="text-neutral-600 dark:text-neutral-400 mt-3 text-sm leading-relaxed">
                  {current.a}
                </p>

                <button
                  onClick={() =>
                    setExpandedId((prev) =>
                      prev === current.id ? null : current.id
                    )
                  }
                  className="mt-5 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:opacity-80 transition"
                >
                  {expandedId === current.id ? (
                    <>
                      <ChevronUp size={16} /> Hide answer
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
        <div className="flex justify-center gap-2 mt-6">
          {filtered.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-neutral-900 dark:bg-white"
                  : "w-2 bg-neutral-300 dark:bg-neutral-600"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
