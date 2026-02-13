// src/pages/Jobs.jsx
import React, { useMemo, useState } from "react";

/**
 * Jobs page (public)
 * Features included:
 * - Search by title/skills
 * - Filters: Type, Location, Department, Status
 * - Responsive Job Cards with "View Details" and "Apply" links
 * - Pagination
 *
 * Integration notes:
 * - Replace the static JOBS array with an API call (fetch / axios) to /api/jobs
 * - Routes expected:
 *    /jobs/:slug         -> job details page
 *    /apply/:jobId       -> application page / form
 *
 * Tailwind CSS is used for styling (your component already used Tailwind).
 */

/* =========================
   MOCK DATA (replace with API)
   ========================= */
const JOBS = [
  {
    id: "job_001",
    title: "QA Tester Intern",
    type: "Internship",
    location: "Remote",
    department: "QA",
    duration: "2 weeks",
    stipend: "Unpaid",
    status: "Open",
    slug: "qa-tester-intern",
    skills: ["testing", "bug reporting", "manual testing"],
    description:
      "Work with the engineering team to test features, report bugs, and improve product quality.",
  },
  {
    id: "job_002",
    title: "Frontend Developer",
    type: "Full-time",
    location: "Hyderabad, IN",
    department: "Engineering",
    duration: "N/A",
    stipend: "—",
    status: "Open",
    slug: "frontend-developer",
    skills: ["react", "tailwind", "javascript"],
    description: "Build beautiful and performant user interfaces.",
  },
  {
    id: "job_003",
    title: "Social Media Manager (Intern)",
    type: "Internship",
    location: "Onsite - Bangalore, IN",
    department: "Marketing",
    duration: "3 months",
    stipend: "8,000 INR / month",
    status: "Closed",
    slug: "social-media-intern",
    skills: ["content", "instagram", "community"],
    description: "Manage content calendar and grow brand presence.",
  },
  {
    id: "job_004",
    title: "Operations & Logistics Executive",
    type: "Full-time",
    location: "Remote",
    department: "Operations",
    duration: "N/A",
    stipend: "—",
    status: "Open",
    slug: "ops-logistics-exec",
    skills: ["supply chain", "excel"],
    description: "Coordinate shipments, vendors, and returns.",
  },
  // add more sample jobs as needed...
];

/* =========================
   Utility: unique values for filters
   ========================= */
function getUnique(list, key) {
  return [...new Set(list.map((i) => i[key]))].filter(Boolean);
}

/* =========================
   Subcomponents
   ========================= */

function SearchBar({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
      <label htmlFor="jobs-search" className="sr-only">
        Search jobs
      </label>
      <input
        id="jobs-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, role, skill (eg. QA, React, content)..."
        className="flex-1 rounded-lg border px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Search jobs"
      />
      <button
        type="button"
        onClick={() => onChange("")}
        className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm"
        aria-label="Clear search"
      >
        Clear
      </button>
    </div>
  );
}

function Filters({ filters, onChange, options }) {
  return (
    <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className="rounded-md border px-3 py-2"
        aria-label="Filter by type"
      >
        <option value="">All Types</option>
        {options.types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={filters.location}
        onChange={(e) => onChange({ ...filters, location: e.target.value })}
        className="rounded-md border px-3 py-2"
        aria-label="Filter by location"
      >
        <option value="">All Locations</option>
        {options.locations.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      <select
        value={filters.department}
        onChange={(e) => onChange({ ...filters, department: e.target.value })}
        className="rounded-md border px-3 py-2"
        aria-label="Filter by department"
      >
        <option value="">All Departments</option>
        {options.departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="rounded-md border px-3 py-2"
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {options.statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function JobCard({ job }) {
  const badgeColor =
    job.type === "Internship"
      ? "bg-amber-100 text-amber-800"
      : job.type === "Full-time"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <article className="border rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${badgeColor}`}>
              {job.type}
            </span>
            <h3 className="text-xl font-semibold">{job.title}</h3>
          </div>

          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{job.description}</p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-700">
            <span>📍 {job.location}</span>
            <span>⏱ {job.duration}</span>
            {job.stipend && <span>💰 {job.stipend}</span>}
            <span className="ml-2">🔖 {job.department}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <a
            href={`/jobs/${job.slug}`}
            className="inline-flex items-center px-4 py-2 rounded-full border text-sm hover:bg-neutral-50"
            aria-label={`View details for ${job.title}`}
          >
            View Details
          </a>

          {job.status === "Open" ? (
            <a
              href={`/apply/${job.id}`}
              className="inline-flex items-center px-4 py-2 rounded-full bg-black text-white text-sm"
              aria-label={`Apply for ${job.title}`}
            >
              Apply Now
            </a>
          ) : (
            <button className="inline-flex items-center px-4 py-2 rounded-full bg-neutral-100 text-sm" disabled>
              Closed
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================
   Main Jobs Page
   ========================= */
export default function Jobs() {
  // state
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    location: "",
    department: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  // Options for filters derived from JOBS
  const options = useMemo(
    () => ({
      types: getUnique(JOBS, "type"),
      locations: getUnique(JOBS, "location"),
      departments: getUnique(JOBS, "department"),
      statuses: getUnique(JOBS, "status"),
    }),
    []
  );

  // Filtered + searched results
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return JOBS.filter((job) => {
      // search by title / description / skills
      if (q) {
        const inTitle = job.title.toLowerCase().includes(q);
        const inDesc = (job.description || "").toLowerCase().includes(q);
        const inSkills = (job.skills || []).some((s) => s.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inSkills) return false;
      }

      // filters
      if (filters.type && job.type !== filters.type) return false;
      if (filters.location && job.location !== filters.location) return false;
      if (filters.department && job.department !== filters.department) return false;
      if (filters.status && job.status !== filters.status) return false;

      return true;
    });
  }, [query, filters]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters or query change
  React.useEffect(() => {
    setPage(1);
  }, [query, filters]);

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-7xl mx-auto px-6 py-20">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-4">Careers at Dripzoid</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Join a fast-growing fashion brand redefining streetwear in India.
          </p>
        </header>

        {/* search + filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <SearchBar value={query} onChange={setQuery} />
            <div className="hidden md:block" />
          </div>

          <div className="mt-3 flex items-center justify-center">
            <Filters filters={filters} onChange={setFilters} options={options} />
          </div>

          {/* active filters pill */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {Object.entries(filters).map(([k, v]) =>
              v ? (
                <button
                  key={k}
                  onClick={() => setFilters({ ...filters, [k]: "" })}
                  className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm"
                >
                  {k}: {v} ✕
                </button>
              ) : null
            )}
            {query && (
              <button onClick={() => setQuery("")} className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm">
                clear search ✕
              </button>
            )}
          </div>
        </div>

        {/* job grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pageItems.length ? (
            pageItems.map((job) => <JobCard key={job.id} job={job} />)
          ) : (
            <div className="col-span-full text-center py-12 text-neutral-600 dark:text-neutral-400">
              No jobs found. Try clearing filters or modifying your search.
            </div>
          )}
        </div>

        {/* pagination */}
        {pageCount > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-md border disabled:opacity-50"
            >
              Prev
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: pageCount }).map((_, i) => {
                const p = i + 1;
                const active = p === page;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded-md ${active ? "bg-black text-white" : "border"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="px-3 py-2 rounded-md border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
