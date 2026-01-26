import React from "react";

export default function Shipping() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black text-black dark:text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-extrabold mb-6">Shipping Information</h1>

        <ul className="space-y-6 text-neutral-700 dark:text-neutral-400">
          <li><strong>Processing Time:</strong> 1–2 business days</li>
          <li><strong>Delivery Time:</strong> 3–7 business days across India</li>
          <li><strong>Shipping Partners:</strong> Shiprocket, Delhivery</li>
          <li><strong>Tracking:</strong> Tracking link shared via SMS & Email</li>
        </ul>
      </section>
    </main>
  );
}
