// src/components/Hero.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0, scale: 1.02 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir) => ({ x: dir < 0 ? 60 : -60, opacity: 0, scale: 0.98 }),
};

export default function Hero({ slides = [], autoPlayMs = 4500 }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const throttled = useRef(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      changeIndex(1);
    }, autoPlayMs);
    return () => clearInterval(t);
  }, [index, paused, autoPlayMs]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") changeIndex(1);
      if (e.key === "ArrowLeft") changeIndex(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function changeIndex(delta) {
    if (throttled.current) return;
    throttled.current = true;
    setDir(delta);
    setIndex((i) => (i + delta + slides.length) % slides.length);
    setTimeout(() => (throttled.current = false), 300); // throttle for animation overlap
  }

  function handleDragEnd(e, info) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -40 || velocity < -500) changeIndex(1);
    else if (offset > 40 || velocity > 500) changeIndex(-1);
  }

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden border border-black/5 dark:border-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="aspect-[16/7] bg-black/5 dark:bg-white/5 relative">
        <AnimatePresence custom={dir} initial={false} mode="wait">
          <motion.div
            key={slides[index].id}
            className="absolute inset-0 w-full h-full"
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
            style={{ touchAction: "pan-y" }}
          >
            <img
              src={slides[index].src}
              alt={slides[index].title}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable="false"
            />
            <div className="absolute left-6 bottom-6 text-white drop-shadow">
              <div className="text-xs uppercase tracking-wider bg-black/40 inline-block px-3 py-1 rounded-full">
                Seasonal
              </div>
              <h3 className="mt-3 text-2xl md:text-3xl font-bold">{slides[index].title}</h3>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        onClick={() => changeIndex(-1)}
        aria-label="Previous"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-black/90 shadow focus:outline-none"
      >
        ‹
      </button>

      <button
        onClick={() => changeIndex(1)}
        aria-label="Next"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-black/90 shadow focus:outline-none"
      >
        ›
      </button>

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
            className={`w-3 h-3 rounded-full focus:outline-none ${
              i === index ? "scale-125 bg-white dark:bg-black" : "bg-white/40 dark:bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
