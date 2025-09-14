// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  Trash2,
  BarChart3,
  User,
  Calendar,
  Download,
  Male,
  Smartphone,
  Female,
  CheckCircle, // ✅ Added missing import
} from "lucide-react";
import { motion } from "framer-motion";

/* helpers */
function formatCurrency(n) {
  return typeof n === "number"
    ? n.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      })
    : "₹0.00";
}
function isoWeek() {
  try {
    const d = new Date();
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(d.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const diff = (target - firstThursday) / 86400000;
    const wk = 1 + Math.round(diff / 7);
    return `${target.getFullYear()}-W${String(wk).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/* Avatar component */
function Avatar({ name }) {
  const initials =
    name?.split(" ").map((n) => n[0]).slice(0, 2).join("") || "?";
  return (
    <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-medium text-black dark:text-white">
      {initials}
    </div>
  );
}

/* HoverSparkline */
function HoverSparkline({ points = [] }) {
  const [hover, setHover] = useState(null);
  const w = 480,
    h = 90,
    padding = 10;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const step = (w - padding * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => ({
    x: padding + i * step,
    y:
      padding +
      (1 - (p - min) / (max - min || 1)) * (h - padding * 2),
    v: p,
  }));

  return (
    <div className="relative bg-neutral-100 dark:bg-neutral-800 p-2 rounded border border-neutral-300 dark:border-neutral-700">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-24"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.95"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={4}
            fill={hover === i ? "#fff" : "transparent"}
            stroke="#fff"
            strokeOpacity={0.9}
          />
        ))}
        {coords.map((c, i) => (
          <rect
            key={i}
            x={c.x - step / 2}
            y={0}
            width={step}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute left-3 top-2 px-2 py-1 bg-white text-black rounded text-xs shadow">
          {formatCurrency(coords[hover].v)}
        </div>
      )}
    </div>
  );
}

/* Heatmap grouped by months */
const MonthlyHeatmap = React.memo(({ cells = [] }) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 364);

  const months = {};
  for (let d = 0; d < 365; d++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + d);
    const key = `${dt.getFullYear()}-${String(
      dt.getMonth() + 1
    ).padStart(2, "0")}`;
    if (!months[key])
      months[key] = {
        label: dt.toLocaleString(undefined, {
          month: "short",
          year: "numeric",
        }),
        days: [],
      };
    months[key].days.push(cells[d] || 0);
  }
  const monthArr = Object.entries(months);

  return (
    <div className="w-full overflow-auto">
      <div className="flex gap-2 items-end pb-2">
        {monthArr.map(([k, m]) => (
          <div key={k} className="flex flex-col items-center gap-1">
            <div className="flex flex-col-reverse gap-[2px]">
              {m.days.map((c, i) => (
                <div
                  key={i}
                  title={`${m.label} - day ${i + 1}: ${c} events`}
                  className={`w-2 rounded-sm ${
                    c === 0
                      ? "bg-neutral-200 dark:bg-neutral-800"
                      : c < 2
                      ? "bg-green-200 dark:bg-green-800"
                      : c < 4
                      ? "bg-green-400 dark:bg-green-600"
                      : "bg-green-600 dark:bg-green-400"
                  }`}
                  style={{ height: 6 }}
                />
              ))}
            </div>
            <div className="text-[10px] text-neutral-600 dark:text-white/60 mt-1">
              {m.label.split(" ")[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/* Demo data generator */
function makeUser(i) {
  const spend = Math.round(Math.random() * 150000);
  const orders = Math.floor(Math.random() * 120);
  const roles = ["Admin", "Editor", "Customer"];
  const genderSet = ["Female", "Male", "Other"];
  const role = roles[i % roles.length];
  const gender = genderSet[i % genderSet.length];
  const age = 20 + (i % 35);
  const lastLoginOffset = Math.floor(Math.random() * 365);
  const overall = {
    total_orders: orders,
    total_spend: spend,
    coupon_savings: Math.round(Math.random() * 5000),
    orders_successful: Math.floor(
      orders * (0.75 + Math.random() * 0.2)
    ),
    orders_cancelled: Math.floor(
      orders * Math.random() * 0.15
    ),
    orders_returned: Math.floor(
      orders * Math.random() * 0.08
    ),
  };
  const makeSlice = (factor) => ({
    total_orders: Math.max(
      0,
      Math.floor(overall.total_orders * factor)
    ),
    total_spend: Math.round(overall.total_spend * factor),
    coupon_savings: Math.round(overall.coupon_savings * factor),
    orders_successful: Math.floor(overall.orders_successful * factor),
    orders_cancelled: Math.floor(overall.orders_cancelled * factor),
    orders_returned: Math.floor(overall.orders_returned * factor),
  });
  const stats = {
    overall,
    monthly: makeSlice(0.4),
    weekly: makeSlice(0.08),
    day: makeSlice(0.01),
  };
  const heat365 = Array.from({ length: 365 }, () =>
    Math.random() > 0.82 ? Math.ceil(Math.random() * 5) : 0
  );
  const spendTrend = Array.from({ length: 12 }, (_, idx) =>
    Math.round(
      overall.total_spend *
        (0.05 + Math.random() * 0.12) *
        (idx + 1) /
        6
    )
  );
  return {
    id: i + 1,
    name:
      ["Asha", "Rahul", "Maya", "Vikram", "Sonia"][i % 5] +
      " " +
      (i + 1),
    email: `user${i + 1}@example.com`,
    phone: `+91-9${String(100000000 + i).slice(-9)}`,
    signup: new Date(Date.now() - i * 86400000).toISOString(),
    lastLogin: new Date(
      Date.now() - lastLoginOffset * 86400000
    ).toISOString(),
    status:
      i % 7 === 0
        ? "blocked"
        : lastLoginOffset > 90
        ? "inactive"
        : "active",
    role,
    gender,
    age,
    stats,
    spendTrend,
    heat365,
  };
}

/* Main Component */
export default function UserManagement() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openUser, setOpenUser] = useState(null);
  const [range, setRange] = useState("overall");
  const [timeRange, setTimeRange] = useState("overall");
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [week, setWeek] = useState(isoWeek());
  const [date, setDate] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const [viewFrom, setViewFrom] = useState("");
  const [viewTo, setViewTo] = useState("");

  useEffect(() => {
    setUsers(Array.from({ length: 28 }).map((_, i) => makeUser(i)));
  }, []);

  useEffect(() => {
    if (openUser) setTimeRange("overall");
  }, [openUser]);

  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter(
      (u) => u.status === "inactive"
    ).length;
    const male = users.filter((u) => u.gender === "Male").length;
    const female = users.filter((u) => u.gender === "Female").length;
    const other = users.filter(
      (u) => u.gender !== "Male" && u.gender !== "Female"
    ).length;
    return { total, active, inactive, male, female, other };
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(q);
    });
  }, [users, query]);

  const toggleSelect = (id) =>
    setSelectedIds((s) => {
      const c = new Set(s);
      c.has(id) ? c.delete(id) : c.add(id);
      return c;
    });
  const selectAll = () =>
    setSelectedIds(new Set(filtered.map((u) => u.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);
  const paged = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const kpiTiles = [
    { label: "Total users", value: kpis.total, icon: Users },
    { label: "Active users", value: kpis.active, icon: CheckCircle },
    { label: "Inactive users", value: kpis.inactive, icon: BarChart3 },
    { label: "Male", value: kpis.male, icon: Male },
    { label: "Female", value: kpis.female, icon: Female },
    { label: "Other", value: kpis.other, icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {kpiTiles.map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-neutral-600 dark:text-white/70">
                  {s.label}
                </div>
                <div className="text-2xl font-bold mt-2">{s.value}</div>
              </div>
              <div className="rounded-full bg-black text-white dark:bg-white dark:text-black p-3">
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Search + Table */}
        <div className="flex items-center gap-3 mb-4">
          <div className="ml-auto flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-1 gap-2 w-full md:w-96">
              <Search className="text-neutral-600 dark:text-white/60 w-4 h-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users..."
                className="bg-transparent outline-none text-black dark:text-white w-full"
              />
            </div>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded text-sm"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden border bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800 shadow">
          <div className="overflow-auto">
            <table className="w-full text-sm table-auto">
              <thead className="bg-neutral-100 dark:bg-neutral-950 text-neutral-700 dark:text-white/70 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        e.target.checked ? selectAll() : clearSelection()
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`transition ${
                      idx % 2 === 0
                        ? "bg-white dark:bg-neutral-800/30"
                        : ""
                    } hover:bg-black/5 dark:hover:bg-white/5`}
                  >
                    <td className="px-4 py-3">
                      <input
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">#{u.id}</td>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {u.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{u.gender}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setOpenUser(u)}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded border bg-white dark:bg-black text-black dark:text-white border-neutral-200 dark:border-neutral-800"
                      >
                        <User className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                           </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-sm">
          <div>
            Page {page} of {pageCount}
          </div>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border bg-white dark:bg-black text-black dark:text-white border-neutral-200 dark:border-neutral-800 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-3 py-1 rounded border bg-white dark:bg-black text-black dark:text-white border-neutral-200 dark:border-neutral-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

