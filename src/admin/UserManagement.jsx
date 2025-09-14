// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  Trash2,
  LogIn,
  BarChart3,
  CheckCircle,
  User,
  Calendar,
  Download,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";

/* small helpers */
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

/* Avatar */
function Avatar({ name }) {
  const initials = name?.split(" ").map((n) => n[0]).slice(0, 2).join("") || "?";
  return (
    <div className="w-10 h-10 rounded-full bg-white/6 dark:bg-black/10 flex items-center justify-center text-sm font-medium text-black dark:text-white/90">
      {initials}
    </div>
  );
}

/* Hover sparkline (12 months) */
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

/* 365-day heatmap (render compact grid) */
function Heatmap365({ cells = [] }) {
  const cols = 52;
  const rows = 7;
  const grid = Array.from({ length: rows * cols }).map((_, i) => cells[i] || 0);
  return (
    <div className="w-full overflow-auto">
      <div className="flex items-center gap-2">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 6px)` }}>
          {grid.map((c, i) => (
            <div
              key={i}
              title={`${c} events`}
              className={`m-[1px] w-[6px] h-[6px] rounded-sm ${c === 0 ? "bg-white/6 dark:bg-black/10" : c < 2 ? "bg-white/40 dark:bg-black/40" : c < 4 ? "bg-white/70 dark:bg-black/70" : "bg-white dark:bg-black"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* Demo data generator (users) */
function makeUser(i) {
  const spend = Math.round(Math.random() * 150000);
  const orders = Math.floor(Math.random() * 120);
  const roles = ["Admin", "Editor", "Customer"];
  const genderSet = ["Female", "Male", "Non-binary"];
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

/* Main component */
export default function UserManagement() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openUser, setOpenUser] = useState(null);
  const [range, setRange] = useState("overall"); // overall | monthly | weekly | day
  const [timeRange, setTimeRange] = useState("overall"); // <--- added
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [week, setWeek] = useState(isoWeek());
  const [date, setDate] = useState("");
  const [bulkState, setBulkState] = useState({ running: false, action: null, progress: 0 });
  const [sortOrder, setSortOrder] = useState("newest");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const demo = Array.from({ length: 28 }).map((_, i) => makeUser(i));
    setUsers(demo);
  }, []);

  // Reset modal timeRange when opening a user
  useEffect(() => {
    if (openUser) setTimeRange("overall");
  }, [openUser]);

  // derive summary KPIs based on selected range slice
  const aggregated = useMemo(() => {
    const k = range === "daywise" ? "day" : range;
    const totals = {
      total_orders: 0,
      orders_successful: 0,
      orders_cancelled: 0,
      orders_returned: 0,
      total_spend: 0,
    };
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

  // filtered list
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (`${u.name} ${u.email} ${u.id}`.toLowerCase().includes(q));
    });
  }, [users, query]);

  // selection helpers
  const toggleSelect = (id) => setSelectedIds((s) => { const c = new Set(s); c.has(id) ? c.delete(id) : c.add(id); return c; });
  const selectAll = () => setSelectedIds(new Set(filtered.map((u) => u.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // actions
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
        if (action === "block") {
          setUsers((p) => p.map((u) => (selectedIds.has(u.id) ? { ...u, status: "blocked" } : u)));
        }
        setTimeout(() => { setBulkState({ running: false, action: null, progress: 0 }); clearSelection(); alert(`${action} completed (demo)`); }, 400);
      }
    }, 260);
  };

  const impersonate = (u) => alert(`Impersonate ${u.email} (demo)`);
  const softDeleteUser = (userId) => { setUsers((p) => p.map((u) => (u.id === userId ? { ...u, deleteMode: "soft", purgeCountdown: 30 } : u))); setOpenUser(null); alert("Soft deleted (demo)"); };
  const anonymizeUser = (userId) => { setUsers((p) => p.map((u) => (u.id === userId ? { ...u, email: `anon+${u.id}@example.local`, name: `Deleted user ${u.id}`, deleteMode: "anonymized" } : u))); setOpenUser(null); alert("Anonymized (demo)"); };
  const purgeUserNow = (userId) => { setUsers((p) => p.filter((u) => u.id !== userId)); setOpenUser(null); alert("Purged (demo)"); };

  // pagination (simple)
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  useEffect(() => { setPage(1); }, [query, pageSize]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // stat card definitions
  const k = range === "daywise" ? "day" : range;
  const statTiles = [
    { label: "Total Orders", value: aggregated.total_orders },
    { label: "Confirmed", value: aggregated.orders_successful },
    { label: "Pending", value: Math.max(0, aggregated.total_orders - aggregated.orders_successful - aggregated.orders_cancelled - aggregated.orders_returned) },
    { label: "Shipped", value: aggregated.orders_successful },
    { label: "Delivered", value: aggregated.orders_successful },
    { label: "Cancelled", value: aggregated.orders_cancelled },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
       {/* top area: tabs + controls */} <div className="rounded-2xl p-4 border border-neutral-800 bg-neutral-900 mb-6"> <div className="flex items-center gap-3 mb-4"> {[ { key: "overall", label: "Overall" }, { key: "monthly", label: "Monthly" }, { key: "weekly", label: "Weekly" }, { key: "daywise", label: "Day Wise" }, ].map((t) => ( <button key={t.key} onClick={() => { setRange(t.key); if (t.key === "daywise") setDate(new Date().toISOString().split("T")[0]); }} className={px-4 py-2 rounded-full text-sm ${range === t.key ? "bg-white text-black border border-white" : "bg-transparent border border-neutral-800 text-white/80"}} > {t.label} </button> ))} <div className="ml-auto flex items-center gap-3"> {range === "monthly" && <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border border-neutral-700 bg-white text-black" />} {range === "weekly" && <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border border-neutral-700 bg-white text-black" />} {range === "daywise" && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border border-neutral-700 bg-white text-black" />} <button onClick={() => { alert("Refresh (demo)"); }} className="px-4 py-2 rounded-xl border border-neutral-700 bg-white text-black">Refresh</button> <button onClick={() => { alert("Export (demo)"); }} className="px-4 py-2 rounded-xl border border-neutral-700 bg-white text-black flex items-center gap-2"> <Download className="w-4 h-4" /> Export </button> </div> </div> {/* KPI container */} <div className="rounded-xl p-4 border border-neutral-800 bg-neutral-950 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {statTiles.map((s, i) => ( <div key={s.label} className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between"> <div> <div className="text-xs text-white/60">{s.label}</div> <div className="text-2xl font-bold mt-2">{s.value}</div> </div> <div className="rounded-full bg-white text-black p-3"> <Users className="w-5 h-5" /> </div> </div> ))} </div> </div> {/* actions row (Browse / Update / Bulk Update) */} <div className="flex items-center gap-3 mb-4"> <button className="px-4 py-2 rounded-full bg-white text-black border border-white">Browse Users</button> <button className="px-4 py-2 rounded-full border border-neutral-800">Update Users</button> <button className="px-4 py-2 rounded-full border border-neutral-800" onClick={() => startBulkAction("block")}>Bulk Update</button> <div className="ml-auto flex items-center gap-2"> <div className="flex items-center bg-neutral-900 rounded-md border border-neutral-800 px-3 py-1 gap-2 w-96"> <Search className="text-white/60 w-4 h-4" /> <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users (id / name / email)" className="bg-transparent outline-none text-white/90 placeholder:text-white/50 w-full" /> </div> <div className="flex items-center gap-2"> <div className="relative"> <button className="px-3 py-2 rounded border border-neutral-800 flex items-center gap-2 text-sm"> {sortOrder === "newest" ? "Newest" : "Oldest"} <ChevronDown className="w-4 h-4" /> </button> {/* quick sort dropdown could be inserted here */} </div> <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"> <option value={10}>10 / page</option> <option value={20}>20 / page</option> <option value={50}>50 / page</option> </select> </div> </div> </div> {/* table list */} <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow"> <div className="overflow-auto"> <table className="w-full text-sm table-auto"> <thead className="bg-neutral-950/60 text-white/70 sticky top-0"> <tr> <th className="px-4 py-3 text-left w-12"><input type="checkbox" onChange={(e) => (e.target.checked ? selectAll() : clearSelection())} /></th> <th className="px-4 py-3 text-left">ID</th> <th className="px-4 py-3 text-left">Name</th> <th className="px-4 py-3 text-left">Gender</th> <th className="px-4 py-3 text-right">Actions</th> </tr> </thead> <tbody> {paged.map((u, idx) => ( <tr key={u.id} className={transition ${idx % 2 === 0 ? "bg-white/2" : ""} hover:bg-white/5}> <td className="px-4 py-3"><input checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} type="checkbox" /></td> <td className="px-4 py-3 font-mono text-sm">#{u.id}</td> <td className="px-4 py-3 flex items-center gap-3"><Avatar name={u.name} /> <div><div className="font-medium">{u.name}</div><div className="text-xs text-white/60">{u.email}</div></div></td> <td className="px-4 py-3 text-sm">{u.gender}</td> <td className="px-4 py-3 text-right"> <button onClick={() => setOpenUser(u)} className="inline-flex items-center gap-2 px-3 py-1 rounded border border-neutral-800"> <User className="w-4 h-4" /> View</button> </td> </tr> ))} </tbody> </table> </div> <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between"> <div className="text-sm text-white/70">{selectedIds.size} selected</div> <div className="flex items-center gap-3"> <button onClick={() => startBulkAction("block")} className="px-3 py-1 rounded border border-neutral-800">Block selected</button> <div className="text-sm text-white/60">Page {page} / {pageCount}</div> <div className="flex items-center gap-2"> <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded border border-neutral-800">Prev</button> <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-3 py-1 rounded border border-neutral-800">Next</button> </div> </div> </div> </div> {/* centered modal / floating user card */} {openUser && ( <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"> <div className="absolute inset-0 bg-black/60" onClick={() => setOpenUser(null)} /> <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-3xl bg-neutral-950/95 border border-neutral-800 rounded-2xl p-6 shadow-xl" > <div className="flex items-start justify-between"> <div> <h3 className="text-2xl font-semibold">{openUser.name}</h3> <div className="text-sm text-white/70">{openUser.email} • {openUser.phone}</div> <div className="text-xs text-white/60 mt-1">Last login: {new Date(openUser.lastLogin).toLocaleString()}</div> </div> <div className="flex items-center gap-2"> <button onClick={() => impersonate(openUser)} className="px-3 py-2 rounded border border-neutral-800"> <LogIn className="w-4 h-4" /> Login</button> <button onClick={() => setOpenUser(null)} className="px-3 py-2 rounded border border-neutral-800">Close</button> </div> </div> <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center"> <div> <div className="text-xs text-white/70">Gender</div> <div className="font-medium">{openUser.gender}</div> </div> <div> <div className="text-xs text-white/70">Age</div> <div className="font-medium">{openUser.age}</div> </div> <div> <div className="text-xs text-white/70">Role</div> <select value={openUser.role} onChange={(e) => updateRole(openUser.id, e.target.value)} className="bg-transparent border border-neutral-800 text-white px-2 py-1 rounded"> <option>Admin</option> <option>Editor</option> <option>Customer</option> </select> </div> <div className="ml-auto flex gap-2"> <button onClick={() => setUsers((us) => us.map((x) => x.id === openUser.id ? {...x, status: x.status === 'active' ? 'blocked' : 'active'} : x))} className={px-3 py-2 rounded border ${openUser.status === 'active' ? 'border-red-600 text-red-300' : 'border-green-600 text-green-300'}}>{openUser.status === 'active' ? 'Block' : 'Unblock'}</button> <button onClick={() => purgeUserNow(openUser.id)} className="px-3 py-2 rounded border border-red-700 text-red-400">Delete</button> </div> </div> <hr className="my-4 border-neutral-800" /> {/* stats header (radio-like) */} <div className="flex items-center gap-3 mb-3"> {["overall", "monthly", "weekly", "day"].map((r) => ( <label key={r} className={inline-flex items-center gap-2 px-3 py-1 rounded-md border ${timeRange === r ? "bg-white text-black border-white" : "border-neutral-800 text-white/80"}}> <input type="radio" name="range" value={r} checked={timeRange === r} onChange={() => setTimeRange(r)} className="hidden" /> <span className={w-3 h-3 rounded-full ${timeRange === r ? "bg-black" : "bg-white/10"}} /> <span className="text-sm capitalize">{r === "day" ? "Day Wise" : r}</span> </label> ))} <div className="ml-auto text-sm text-white/60">Showing: <strong className="ml-1">{timeRange === "day" ? "Day Wise" : timeRange}</strong></div> </div> {/* stats grid */} <div className="grid grid-cols-2 md:grid-cols-3 gap-3"> <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800"> <div className="text-xs text-white/70">Total orders</div> <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.total_orders ?? openUser.stats.overall.total_orders}</div> </div> <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800"> <div className="text-xs text-white/70">Total spend</div> <div className="text-lg font-semibold mt-1">{formatCurrency(openUser.stats[timeRange === "day" ? "day" : timeRange]?.total_spend ?? openUser.stats.overall.total_spend)}</div> </div> <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800"> <div className="text-xs text-white/70">Coupon savings</div> <div className="text-lg font-semibold mt-1">{formatCurrency(openUser.stats[timeRange === "day" ? "day" : timeRange]?.coupon_savings ?? openUser.stats.overall.coupon_savings)}</div> </div> <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800"> <div className="text-xs text-white/70">Successful</div> <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.orders_successful ?? openUser.stats.overall.orders_successful}</div> </div> <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800"> <div className="text-xs text-white/70">Cancelled</div> <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.orders_cancelled ?? openUser.stats.overall.orders_cancelled}</div> </div> <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800"> <div className="text-xs text-white/70">Returned</div> <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === "day" ? "day" : timeRange]?.orders_returned ?? openUser.stats.overall.orders_returned}</div> </div> </div> {/* spend sparkline + 365 heatmap */} <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4"> <div> <h4 className="text-sm font-medium mb-2">Spend (12 months)</h4> <HoverSparkline points={openUser.spendTrend} /> </div> <div> <h4 className="text-sm font-medium mb-2">Login heatmap (365 days)</h4> <Heatmap365 cells={openUser.heat365} /> </div> </div> <div className="mt-6 text-right"> <button onClick={() => setOpenUser(null)} className="px-4 py-2 rounded bg-white text-black">Close</button> </div> </motion.div> </div> )}
      </div>
    </div>
  );
}
