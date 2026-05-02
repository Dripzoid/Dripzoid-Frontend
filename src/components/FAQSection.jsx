// FAQSection.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, ChevronDown, ChevronUp } from "lucide-react";

const FAQS = [
  {
    id: "shipping-time",
    q: "How long does shipping take?",
    a: "Standard shipping within India typically takes 3–7 business days...",
  },
  {
    id: "returns-policy",
    q: "What is your returns & exchange policy?",
    a: "You can return unworn items within 14 days...",
  },
  {
    id: "size-guide",
    q: "How do I choose the right size?",
    a: "Our product pages include a detailed size chart...",
  },
  // keep rest same
];

// smoother animation
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -120 : 120,
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

        {/* CAROUSEL */}
        <div className="overflow-hidden relative">

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
              transition={{ duration: 0.35 }}
              className="w-full"
            >
              <motion.div
                layout
                className="bg-white border rounded-xl p-6 shadow max-w-3xl mx-auto min-h-[220px]"
              >
                <h3 className="text-lg font-semibold">
                  {current.q}
                </h3>

                {/* FIX: remove clamp when expanded */}
                <p
                  className={`mt-2 text-sm text-gray-600 ${
                    expandedId === current.id ? "" : "line-clamp-3"
                  }`}
                >
                  {current.a}
                </p>

                <button
                  onClick={() =>
                    setExpandedId((prev) =>
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

                {/* EXPAND FIX: use layout instead of height animation */}
                <AnimatePresence>
                  {expandedId === current.id && (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 text-sm text-gray-700"
                    >
                      <p>{current.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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
