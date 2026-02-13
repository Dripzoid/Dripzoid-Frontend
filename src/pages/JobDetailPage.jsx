// src/pages/JobDetailPage.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";

// Temporary static data (later replace with API call)
const JOBS = [
  {
    id: "job_001",
    slug: "qa-tester-intern",
    title: "QA Tester Intern",
    type: "Internship",
    location: "Remote",
    department: "Quality Assurance",
    duration: "2 Weeks",
    stipend: "Unpaid",
    status: "Open",
    description:
      "Join Dripzoid as a QA Tester Intern and help ensure the quality and stability of our web and mobile platforms.",
    responsibilities: [
      "Test new features and report bugs",
      "Write clear and detailed bug reports",
      "Perform regression and UI testing",
      "Collaborate with developers to resolve issues",
    ],
    requirements: [
      "Basic understanding of software testing",
      "Attention to detail",
      "Good communication skills",
      "Interest in product quality and UX",
    ],
  },
];

export default function JobDetailPage() {
  const { slug } = useParams();
  const job = JOBS.find((j) => j.slug === slug);

  if (!job) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-3xl font-bold mb-4">Job Not Found</h1>
          <Link to="/jobs" className="text-blue-500 underline">
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <header className="mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium mb-4">
            {job.type}
          </span>
          <h1 className="text-4xl font-extrabold mb-3">{job.title}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {job.location} • {job.department}
          </p>
        </header>

        {/* Overview */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-3">Overview</h2>
          <p className="text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
            {job.description}
          </p>
        </div>

        {/* Responsibilities */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-3">Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2">
            {job.responsibilities.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-3">Requirements</h2>
          <ul className="list-disc pl-6 space-y-2">
            {job.requirements.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Duration</p>
            <p className="font-semibold">{job.duration}</p>
          </div>
          <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Stipend</p>
            <p className="font-semibold">{job.stipend}</p>
          </div>
          <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Location</p>
            <p className="font-semibold">{job.location}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col md:flex-row gap-4">
          {job.status === "Open" && (
            <Link
              to={`/apply/${job.id}`}
              className="px-8 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold text-center"
            >
              Apply Now
            </Link>
          )}

          <Link
            to="/jobs"
            className="px-8 py-3 rounded-full border text-center"
          >
            Back to Jobs
          </Link>
        </div>
      </section>
    </main>
  );
}
