import React from "react";

export default function Jobs() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-extrabold mb-6">Careers at Dripzoid</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-12">
          Join a fast-growing fashion brand redefining streetwear in India.
        </p>

        <div className="p-10 rounded-2xl border bg-neutral-50 dark:bg-neutral-900">
          <p className="mb-6">We’re hiring for:</p>
          <ul className="space-y-2">
            <li>• Fashion Designers</li>
            <li>• Social Media Managers</li>
            <li>• Operations & Logistics</li>
          </ul>

          <a
            href="mailto:careers@dripzoid.com"
            className="inline-block mt-8 px-8 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold"
          >
            Apply Now
          </a>
        </div>
      </section>
    </main>
  );
}
