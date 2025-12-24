// src/components/Hero.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const variants = {
  enter: (dir) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
    scale: 1.02,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir) => ({
    x: dir < 0 ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  }),
};

export default function Hero({ slides = [], autoPlayMs = 4500 }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);

  const throttled = useRef(false);
  const intervalRef = useRef(null);

  const total = slides.length;

  // ---- Autoplay (stable) ----
  useEffect(() => {
    if (paused || total <= 1) return;

    intervalRef.current = setInterval(() => {
      changeIndex(1);
    }, autoPlayMs);

    return () => clearInterval(intervalRef.current);
  }, [paused, autoPlayMs, total]);

  // ---- Pause when tab inactive ----
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ---- Keyboard navigation ----
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

    setTimeout(() => {
      throttled.current = false;
    }, 350);
  }

  function handleDragEnd(_, info) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -50 || velocity < -500) changeIndex(1);
    else if (offset > 50 || velocity > 500) changeIndex(-1);
  }

  if (!slides || total === 0) return null;

  return (
    <section
      className="relative max-w-6xl mx-auto rounded-2xl overflow-hidden border border-black/5 dark:border-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div className="aspect-[16/7] relative bg-black/5 dark:bg-white/5">
        <AnimatePresence custom={dir} initial={false} mode="wait">
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
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
            style={{ touchAction: "pan-y" }}
            aria-live="polite"
          >
            <img
              src={slides[index].src}
              alt={slides[index].title}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable="false"
            />

            {/* Gradient overlay for text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Caption */}
            <div className="absolute left-6 bottom-6 text-white">
              <span className="text-xs uppercase tracking-wider bg-black/50 px-3 py-1 rounded-full">
                Seasonal
              </span>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-tight">
                {slides[index].title}
              </h2>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prev */}
      <button
        onClick={() => changeIndex(-1)}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 dark:bg-black/90 shadow flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-black"
      >
        ←
      </button>

      {/* Next */}
      <button
        onClick={() => changeIndex(1)}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 dark:bg-black/90 shadow flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-black"
      >
        →
      </button>

      {/* Dots */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (i === index) return;
              setDir(i > index ? 1 : -1);
              setIndex(i);
            }}
            aria-current={i === index}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-3 h-3 rounded-full transition ${
              i === index
                ? "scale-125 bg-white"
                : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
