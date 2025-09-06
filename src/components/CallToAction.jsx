import React from "react";
import { motion } from "framer-motion";

export default function CallToAction() {
  return (
    <section className="bg-black dark:bg-white text-white dark:text-black py-20 px-4 sm:px-8 text-center">
      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-bold mb-6"
      >
        Join Our Exclusive Community
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-lg max-w-xl mx-auto mb-8"
      >
        Sign up today to receive early access to seasonal sales, exclusive offers, and new arrivals.
      </motion.p>
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto"
        onSubmit={(e) => {
          e.preventDefault();
          alert("Subscribed successfully!");
        }}
      >
        <input
          type="email"
          required
          placeholder="Enter your email"
          className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 w-full sm:w-auto"
        />
        <button
          type="submit"
          className="px-6 py-2 rounded-full bg-white text-black dark:bg-black dark:text-white font-semibold hover:scale-105 transition"
        >
          Subscribe
        </button>
      </motion.form>
    </section>
  );
}
