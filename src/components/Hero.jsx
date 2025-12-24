// src/components/Hero.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// -----------------------------------
// Animation variants (NO SCALE)
// -----------------------------------
const variants = {
  enter: (dir) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir) => ({
    x: dir < 0 ? 80 : -80,
    opacity: 0,
  }),
};

export default function Hero({ slides = [], autoPlayMs = 4500 }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const throttled = useRef(false);

  const total = slides.length;

  // -----------------------------------
  // Autoplay (stable)
  // -----------------------------------
  useEffect(() => {
    if (paused || total <= 1) return;
    const t = setInterval(() => changeIndex(1), autoPlayMs);
    return () => clearInterval(t);
  }, [paused, autoPlayMs, total]);

  // -----------------------------------
  // Keyboard navigation
  // -----------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") changeIndex(1);
      if (e.key === "ArrowLeft") changeIndex(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function changeIndex(delta) {
    if (throttled.current || total <= 1) return;
    throttled.current = true;
    setDir(delta);
    setIndex((i) => (i + delta + total) % total);
    setTimeout(() => (throttled.current = false), 350);
  }

  function handleDragEnd(_, info) {
    if (info.offset.x < -60 || info.velocity.x < -500) changeIndex(1);
    else if (info.offset.x > 60 || info.velocity.x > 500) changeIndex(-1);
  }

  if (!slides || total === 0) return null;

  return (
    <section
      className="relative max-w-6xl mx-auto overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Banner */}
      <div className="relative aspect-[16/6] bg-black/5 dark:bg-white/5">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={slides[index].id}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
            style={{ touchAction: "pan-y" }}
          >
            {/* Image */}
            <img
              src={slides[index].src}
              alt={slides[index].title}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable="false"
            />

            {/* Subtle gradient for readability (old-style) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Caption (LOCKED TYPOGRAPHY) */}
            <div className="absolute left-6 bottom-6 text-white max-w-lg">
              <span className="inline-block text-xs uppercase tracking-wider bg-black/50 px-3 py-1 rounded-full">
                Seasonal
              </span>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-snug">
                {slides[index].title}
              </h2>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prev */}
      {total > 1 && (
        <>
          <button
            onClick={() => changeIndex(-1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 shadow flex items-center justify-center"
          >
            ←
          </button>

          {/* Next */}
          <button
            onClick={() => changeIndex(1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 shadow flex items-center justify-center"
          >
            →
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i === index) return;
                setDir(i > index ? 1 : -1);
                setIndex(i);
              }}
              aria-current={i === index}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === index ? "bg-white scale-125" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
