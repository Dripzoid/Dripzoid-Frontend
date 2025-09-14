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
  ChevronDown,
  Male,
  Smartphone,
  Female,
} from "lucide-react";
import { motion } from "framer-motion";

/* helpers */
function formatCurrency(n) {
  return typeof n === "number"
    ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
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
  const initials = name?.split(" ").map((n) => n[0]).slice(0, 2).join("") || "?";
  return (
    <div className="w-10 h-10 rounded-full bg-white/6 dark:bg-black/10 flex items-center justify-center text-sm font-medium text-black dark:text-white/90">
      {initials}
    </div>
  );
}

/* HoverSparkline */
function HoverSparkline({ points = [] }) {
  const [hover, setHover] = useState(null);
  const w = 480, h = 90, padding = 10;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const step = (w - padding * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => ({
    x: padding + i * step,
    y: padding + (1 - (p - min) / (max - min || 1)) * (h - padding * 2),
    v: p,
  }));

  return (
    <div className="relative bg-white/6 dark:bg-black/10 p-2 rounded border border-neutral-800 dark:border-neutral-700">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none" aria-hidden>
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
          <circle key={i} cx={c.x} cy={c.y} r={4} fill={hover === i ? "#fff" : "transparent"} stroke="#fff" strokeOpacity={0.9} />
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

/* Heatmap grouped by months: convert 365-day array to months buckets */
function MonthlyHeatmap({ cells = [] }) {
  // Build days array from today going back 364 days
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 364);

  // Build map: { 'YYYY-MM': { label: 'Sep 2025', days: [val,...] } }
  const months = {};
  for (let d = 0; d < 365; d++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + d);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = { label: dt.toLocaleString(undefined, { month: "short", year: "numeric" }), days: [] };
    months[key].days.push(cells[d] || 0);
  }
  const monthArr = Object.entries(months); // [ [key, {label, days}] , ... ]

  return (
    <div className="w-full overflow-auto">
      <div className="flex gap-2 items-end pb-2">
        {monthArr.map(([k, m], idx) => (
          <div key={k} className="flex flex-col items-center gap-1">
            <div className="flex flex-col-reverse gap-[2px]">
              {m.days.map((c, i) => (
                <div
                  key={i}
                  title={`${m.label} - day ${i + 1}: ${c} events`}
                  className={`w-2 rounded-sm ${c === 0 ? "bg-white/6 dark:bg-black/10" : c < 2 ? "bg-white/40 dark:bg-black/40" : c < 4 ? "bg-white/70 dark:bg-black/70" : "bg-white dark:bg-black"}`}
                  style={{ height: 6 }}
                />
              ))}
            </div>
            <div className="text-[10px] text-white/60 mt-1">{m.label.split(" ")[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Demo data */
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
    orders_successful: Math.floor(orders * (0.75 + Math.random() * 0.2)),
    orders_cancelled: Math.floor(orders * Math.random() * 0.15),
    orders_returned: Math.floor(orders * Math.random() * 0.08),
  };
  const makeSlice = (factor) => ({
    total_orders: Math.max(0, Math.floor(overall.total_orders * factor)),
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
  const heat365 = Array.from({ length: 365 }, () => (Math.random() > 0.82 ? Math.ceil(Math.random() * 5) : 0));
  const spendTrend = Array.from({ length: 12 }, (_, idx) => Math.round(overall.total_spend * (0.05 + Math.random() * 0.12) * (idx + 1) / 6));
  return {
    id: i + 1,
    name: ["Asha", "Rahul", "Maya", "Vikram", "Sonia"][i % 5] + " " + (i + 1),
    email: `user${i + 1}@example.com`,
    phone: `+91-9${String(100000000 + i).slice(-9)}`,
    signup: new Date(Date.now() - i * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - lastLoginOffset * 86400000).toISOString(),
    status: i % 7 === 0 ? "blocked" : lastLoginOffset > 90 ? "inactive" : "active",
    role,
    gender,
    age,
    stats,
    spendTrend,
    heat365,
  };
}

/* Main */
export default function UserManagement() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openUser, setOpenUser] = useState(null);
  const [range, setRange] = useState("overall");
  const [timeRange, setTimeRange] = useState("overall"); // used in view card
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [week, setWeek] = useState(isoWeek());
  const [date, setDate] = useState("");
  const [bulkState, setBulkState] = useState({ running: false, action: null, progress: 0 });
  const [sortOrder, setSortOrder] = useState("newest");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // calendar picker in view card (UI-only)
  const [viewFrom, setViewFrom] = useState("");
  const [viewTo, setViewTo] = useState("");

  useEffect(() => {
    setUsers(Array.from({ length: 28 }).map((_, i) => makeUser(i)));
  }, []);

  useEffect(() => {
    if (openUser) setTimeRange("overall");
  }, [openUser]);

  // KPIs: total users, active, inactive, male, female, other
  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter((u) => u.status === "inactive").length;
    const male = users.filter((u) => u.gender === "Male").length;
    const female = users.filter((u) => u.gender === "Female").length;
    const other = users.filter((u) => u.gender !== "Male" && u.gender !== "Female").length;
    return { total, active, inactive, male, female, other };
  }, [users]);

  // aggregated across selected range for KPI container values (for visual parity)
  const aggregated = useMemo(() => {
    const k = range === "daywise" ? "day" : range;
    const totals = { total_orders: 0, orders_successful: 0, orders_cancelled: 0, orders_returned: 0, total_spend: 0 };
    users.forEach((u) => {
      const s = u.stats[k] || u.stats.overall;
      totals.total_orders += s.total_orders;
      totals.orders_successful += s.orders_successful;
      totals.orders_cancelled += s.orders_cancelled;
      totals.orders_returned += s.orders_returned;
      totals.total_spend += s.total_spend;
    });
    return totals;
  }, [users, range]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (`${u.name} ${u.email} ${u.id}`.toLowerCase().includes(q));
    });
  }, [users, query]);

  const toggleSelect = (id) => setSelectedIds((s) => { const c = new Set(s); c.has(id) ? c.delete(id) : c.add(id); return c; });
  const selectAll = () => setSelectedIds(new Set(filtered.map((u) => u.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const updateRole = (userId, role) => setUsers((p) => p.map((u) => (u.id === userId ? { ...u, role } : u)));
  const startBulkAction = (action) => {
    if (selectedIds.size === 0) return alert("Select at least one user");
    setBulkState({ running: true, action, progress: 8 });
    const total = selectedIds.size; let done = 0;
    const iv = setInterval(() => {
      done += Math.max(1, Math.ceil(total * 0.22));
      const pct = Math.min(100, Math.round((done / total) * 100));
      setBulkState((s) => ({ ...s, progress: pct }));
      if (done >= total) {
        clearInterval(iv);
        if (action === "block") setUsers((p) => p.map((u) => (selectedIds.has(u.id) ? { ...u, status: "blocked" } : u)));
        setTimeout(() => { setBulkState({ running: false, action: null, progress: 0 }); clearSelection(); alert(`${action} completed (demo)`); }, 400);
      }
    }, 260);
  };
  const impersonate = (u) => alert(`Impersonate ${u.email} (demo)`);
  const purgeUserNow = (userId) => { setUsers((p) => p.filter((u) => u.id !== userId)); setOpenUser(null); alert("Purged (demo)"); };

  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  useEffect(() => { setPage(1); }, [query, pageSize]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // KPI tiles (we show count tiles per request)
  const kpiTiles = [
    { label: "Total users", value: kpis.total, icon: Users },
    { label: "Active users", value: kpis.active, icon: CheckCircle },
    { label: "Inactive users", value: kpis.inactive, icon: BarChart3 },
    { label: "Male", value: kpis.male, icon: Male },
    { label: "Female", value: kpis.female, icon: Female },
    { label: "Other", value: kpis.other, icon: Smartphone }, // smartphone as "other" icon placeholder
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* top area: range tabs + controls */}
        <div className="rounded-2xl p-4 border bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-800 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {[
              { key: "overall", label: "Overall" },
              { key: "monthly", label: "Monthly" },
              { key: "weekly", label: "Weekly" },
              { key: "daywise", label: "Day Wise" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setRange(t.key); if (t.key === "daywise") setDate(new Date().toISOString().split("T")[0]); }}
                className={`px-4 py-2 rounded-full text-sm ${range === t.key ? "bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white" : "bg-transparent border border-neutral-300 dark:border-neutral-800 text-black/70 dark:text-white/80"}`}
              >
                {t.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3">
              {range === "monthly" && <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border bg-white text-black dark:bg-black dark:text-white border-neutral-300 dark:border-neutral-700" />}
              {range === "weekly" && <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border bg-white text-black dark:bg-black dark:text-white border-neutral-300 dark:border-neutral-700" />}
              {range === "daywise" && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border bg-white text-black dark:bg-black dark:text-white border-neutral-300 dark:border-neutral-700" />}

              <button onClick={() => { alert("Refresh (demo)"); }} className="px-4 py-2 rounded-xl border bg-black text-white dark:bg-white dark:text-black">Refresh</button>
              <button onClick={() => { alert("Export (demo)"); }} className="px-4 py-2 rounded-xl border bg-black text-white dark:bg-white dark:text-black flex items-center gap-2">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>

          {/* KPI container */}
          <div className="rounded-xl p-4 border bg-white dark:bg-neutral-950 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpiTiles.map((s) => (
              <div key={s.label} className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-neutral-600 dark:text-white/70">{s.label}</div>
                  <div className="text-2xl font-bold mt-2">{s.value}</div>
                </div>
                <div className="rounded-full bg-black text-white dark:bg-white dark:text-black p-3">
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* action + search row (kept minimal: Browse & Search & Export + page size) */}
        <div className="flex items-center gap-3 mb-4">
          <button className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center gap-2">
            <Users className="w-4 h-4" /> Browse Users
          </button>

          <div className="ml-auto flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-1 gap-2 w-full md:w-96">
              <Search className="text-neutral-600 dark:text-white/60 w-4 h-4" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users (id / name / email)" className="bg-transparent outline-none text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-white/50 w-full" />
            </div>

            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-3 py-2 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded text-sm">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button onClick={() => { alert("Export (demo)"); }} className="px-3 py-2 rounded border bg-white dark:bg-black">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* table list */}
        <div className="rounded-2xl overflow-hidden border bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800 shadow">
          <div className="overflow-auto">
            <table className="w-full text-sm table-auto">
              <thead className="bg-neutral-100 dark:bg-neutral-950 text-neutral-700 dark:text-white/70 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left w-12"><input type="checkbox" onChange={(e) => (e.target.checked ? selectAll() : clearSelection())} /></th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u, idx) => (
                  <tr key={u.id} className={`transition ${idx % 2 === 0 ? "bg-white/50 dark:bg-white/2" : ""} hover:bg-black/5 dark:hover:bg-white/5`}>
                    <td className="px-4 py-3"><input checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} type="checkbox" /></td>
                    <td className="px-4 py-3 font-mono text-sm">#{u.id}</td>
                    <td className="px-4 py-3 flex items-center gap-3"><Avatar name={u.name} /> <div><div className="font-medium">{u.name}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">{u.email}</div></div></td>
                    <td className="px-4 py-3 text-sm">{u.gender}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setOpenUser(u)} className="inline-flex items-center gap-2 px-3 py-1 rounded border bg-white dark:bg-black text-black dark:text-white border-neutral-200 dark:border-neutral-800">
                        <User className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="text-sm text-neutral-600 dark:text-white/70">{selectedIds.size} selected</div>
            <div className="flex items-center gap-3">
              <button onClick={() => startBulkAction("block")} className="px-3 py-1 rounded border bg-white dark:bg-black"> <Trash2 className="w-4 h-4" /> Block selected</button>
              <div className="text-sm text-neutral-600 dark:text-white/70">Page {page} / {pageCount}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded border bg-white dark:bg-black">Prev</button>
                <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-3 py-1 rounded border bg-white dark:bg-black">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* centered modal / floating user card */}
        {openUser && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpenUser(null)} />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 w-full max-w-3xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-black dark:text-white">{openUser.name}</h3>
                  <div className="text-sm text-neutral-600 dark:text-white/70">{openUser.email} • {openUser.phone}</div>
                  <div className="text-xs text-neutral-500 dark:text-white/60 mt-1">Last login: {new Date(openUser.lastLogin).toLocaleString()}</div>
                </div>

                {/* calendar selector area (replaces role) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 rounded">
                    <Calendar className="w-4 h-4 text-neutral-700 dark:text-white/60" />
                    <input type="date" value={viewFrom} onChange={(e) => setViewFrom(e.target.value)} className="text-sm bg-transparent outline-none text-black dark:text-white" />
                  </div>
                  <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 rounded">
                    <Calendar className="w-4 h-4 text-neutral-700 dark:text-white/60" />
                    <input type="date" value={viewTo} onChange={(e) => setViewTo(e.target.value)} className="text-sm bg-transparent outline-none text-black dark:text-white" />
                  </div>
                </div>
              </div>

              {/* Top: Spend chart (big) */}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 text-black dark:text-white">Spend (12 months)</h4>
                <HoverSparkline points={openUser.spendTrend} />
              </div>

              {/* Mid: Stats grid */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-600 dark:text-white/70">Total orders</div>
                  <div className="text-lg font-semibold mt-1 text-black dark:text-white">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.total_orders ?? openUser.stats.overall.total_orders}</div>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-600 dark:text-white/70">Total spend</div>
                  <div className="text-lg font-semibold mt-1 text-black dark:text-white">{formatCurrency(openUser.stats[timeRange === "day" ? "day" : timeRange]?.total_spend ?? openUser.stats.overall.total_spend)}</div>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-600 dark:text-white/70">Coupon savings</div>
                  <div className="text-lg font-semibold mt-1 text-black dark:text-white">{formatCurrency(openUser.stats[timeRange === "day" ? "day" : timeRange]?.coupon_savings ?? openUser.stats.overall.coupon_savings)}</div>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-600 dark:text-white/70">Successful</div>
                  <div className="text-lg font-semibold mt-1 text-black dark:text-white">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.orders_successful ?? openUser.stats.overall.orders_successful}</div>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-600 dark:text-white/70">Cancelled</div>
                  <div className="text-lg font-semibold mt-1 text-black dark:text-white">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.orders_cancelled ?? openUser.stats.overall.orders_cancelled}</div>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-600 dark:text-white/70">Returned</div>
                  <div className="text-lg font-semibold mt-1 text-black dark:text-white">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.orders_returned ?? openUser.stats.overall.orders_returned}</div>
                </div>
              </div>

              {/* Bottom: big heatmap grouped by months */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3 text-black dark:text-white">Login heatmap (last 365 days)</h4>
                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <MonthlyHeatmap cells={openUser.heat365} />
                </div>
              </div>

              <div className="mt-6 text-right">
                <button onClick={() => setOpenUser(null)} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
