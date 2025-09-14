// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  Trash2,
  LogIn,
  BarChart3,
  Loader2,
  Zap,
  CheckCircle,
  User,
  ChevronsUpDown,
  Calendar,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";

/*
  Upgraded UserManagement.jsx
  - Uses Dashboard-style tabs (Overall / Monthly / Weekly / Daywise)
  - Top stat cards inspired by /src/admin/Dashboard.jsx
  - Removed Quick metrics & Top tags panels
  - Replaced sidebar with centered floating user card (modal-like)
  - 365-day heatmap for each user
  - Spend sparkline shows exact value on hover (tooltip)
  - Tailwind (black & white minimalist) and lucide icons
  - Demo hard-coded data
*/

const formatCurrency = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    : "₹0.00";

export default function UserManagement() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openUser, setOpenUser] = useState(null);
  const [range, setRange] = useState("overall"); // overall | monthly | weekly | daywise
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [week, setWeek] = useState(isoWeek());
  const [date, setDate] = useState("");
  const [bulkState, setBulkState] = useState({ running: false, action: null, progress: 0 });

  // DEMO data generator with 365-day heatmap
  const makeUser = (i) => {
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
      month: makeSlice(0.4),
      week: makeSlice(0.08),
      day: makeSlice(0.01),
    };

    // 365 day heatmap
    const heat365 = Array.from({ length: 365 }, () => (Math.random() > 0.82 ? Math.ceil(Math.random() * 5) : 0));

    // 12-month spend trend
    const spendTrend = Array.from({ length: 12 }, (_, idx) => Math.round(overall.total_spend * (0.05 + Math.random() * 0.15) * (idx + 1) / 6));

    return {
      id: i + 1,
      name: ["Asha", "Rahul", "Maya", "Vikram", "Sonia"][i % 5] + " " + (i + 1),
      email: `user${i + 1}@example.com`,
      phone: `+91-9${String(100000000 + i).slice(-9)}`,
      signup: new Date(Date.now() - i * 86400000).toISOString(),
      lastLogin: new Date(Date.now() - lastLoginOffset * 86400000).toISOString(),
      status: i % 7 === 0 ? "blocked" : (lastLoginOffset > 90 ? "inactive" : "active"),
      role,
      gender,
      age,
      stats,
      spendTrend,
      heat365,
      activityLog: [
        `2025-09-${String(10 + (i % 10)).padStart(2, "0")}: Logged in`,
        `2025-09-${String(8 + (i % 6)).padStart(2, "0")}: Placed order #${1000 + i}`,
      ],
    };
  };

  useEffect(() => {
    const demo = [...Array(28).keys()].map((i) => makeUser(i));
    setUsers(demo);
  }, []);

  // Derived summary
  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const blocked = users.filter((u) => u.status === "blocked").length;
    const inactive = users.filter((u) => u.status === "inactive").length;
    const now = Date.now();
    const newUsers = users.filter((u) => now - new Date(u.signup).getTime() < 7 * 86400000).length;
    return { total, active, blocked, inactive, newUsers };
  }, [users]);

  // filter
  const filtered = useMemo(() => users.filter((u) => {
    if (query && !(`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [users, query]);

  // selection helpers
  const toggleSelect = (id) => setSelectedIds((s) => { const c = new Set(s); c.has(id) ? c.delete(id) : c.add(id); return c; });
  const selectAll = () => setSelectedIds(new Set(filtered.map((u) => u.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // role update
  const updateRole = (userId, role) => setUsers((p) => p.map((u) => u.id === userId ? { ...u, role } : u));

  // bulk sim
  const startBulkAction = (action) => {
    if (selectedIds.size === 0) return alert("Select at least one user");
    setBulkState({ running: true, action, progress: 8 });
    const total = selectedIds.size; let done = 0;
    const iv = setInterval(() => {
      done += Math.max(1, Math.ceil(total * 0.2));
      const pct = Math.min(100, Math.round((done / total) * 100));
      setBulkState((s) => ({ ...s, progress: pct }));
      if (done >= total) {
        clearInterval(iv);
        if (action === 'block') setUsers((p) => p.map((u) => selectedIds.has(u.id) ? { ...u, status: 'blocked' } : u));
        setTimeout(() => { setBulkState({ running: false, action: null, progress: 0 }); clearSelection(); alert(`${action} done (demo)`); }, 400);
      }
    }, 280);
  };

  // smart delete
  const softDeleteUser = (userId) => { setUsers((p) => p.map((u) => u.id === userId ? { ...u, deleteMode: 'soft', purgeCountdown: 30 } : u)); setOpenUser(null); alert('Soft-deleted (demo)'); };
  const anonymizeUser = (userId) => { setUsers((p) => p.map((u) => u.id === userId ? { ...u, email: `anon+${u.id}@example.local`, name: `Deleted user ${u.id}`, deleteMode: 'anonymized' } : u)); setOpenUser(null); alert('Anonymized (demo)'); };
  const purgeUserNow = (userId) => { setUsers((p) => p.filter((u) => u.id !== userId)); setOpenUser(null); alert('Purged (demo)'); };
  const impersonate = (u) => alert(`Impersonating ${u.email} (demo)`);

  const statCards = [
    { label: 'Total Users', value: summary.total, icon: Users, color: 'bg-white text-black' },
    { label: 'Active Users', value: summary.active, icon: CheckCircle, color: 'bg-white/90 text-black' },
    { label: 'Inactive Users', value: summary.inactive, icon: Calendar, color: 'bg-white/90 text-black' },
  ];

  const tabs = [
    { key: 'overall', label: 'Overall', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'monthly', label: 'Monthly', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'weekly', label: 'Weekly', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'daywise', label: 'Daywise', icon: <Calendar className="w-4 h-4" /> },
  ];

  // export stub
  const handleExport = () => alert('Export (demo)');

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Tabs + controls */}
        <div className="rounded-2xl p-4 border border-neutral-800 bg-neutral-900 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => { setRange(t.key); if (t.key === 'daywise') setDate(new Date().toISOString().split('T')[0]); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${range === t.key ? 'bg-white text-black border border-white' : 'border border-neutral-800 text-white/80'}`}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3">
              {range === 'monthly' && <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border border-neutral-700 bg-white text-black" />}
              {range === 'weekly' && <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border border-neutral-700 bg-white text-black" />}
              {range === 'daywise' && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-3 pr-3 py-2 rounded-lg border border-neutral-700 bg-white text-black" />}

              <button onClick={() => { /* refresh stub */ alert('Refresh (demo)'); }} className="px-4 py-2 rounded-xl border border-neutral-700 bg-white text-black">Refresh</button>

              <button onClick={handleExport} className="px-4 py-2 rounded-xl border border-neutral-700 bg-white text-black flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Data
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-4 rounded-2xl bg-white text-black flex items-center justify-between border border-neutral-200">
                <div>
                  <div className="text-xs text-gray-700">{s.label}</div>
                  <div className="mt-2 text-2xl font-extrabold text-black">{s.value}</div>
                </div>
                <div className={`${s.color} rounded-full p-3`}><s.icon className="w-6 h-6" /></div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* List and right empty column (we removed quick panels) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow">
              <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-neutral-900 rounded-md border border-neutral-800 px-3 py-1 gap-2 w-96">
                    <Search className="text-white/70" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search id, name, email..." className="bg-transparent outline-none text-white/90 placeholder:text-white/50 w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startBulkAction('block')} className="px-3 py-2 rounded border border-neutral-800">Block</button>
                  <button onClick={() => startBulkAction('export')} className="px-3 py-2 rounded border border-neutral-800">Export</button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm table-auto">
                  <thead className="bg-neutral-950/60 text-white/70 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left w-12"><input type="checkbox" onChange={(e) => (e.target.checked ? selectAll() : clearSelection())} /></th>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Gender</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, idx) => (
                      <tr key={u.id} className={`transition ${idx % 2 === 0 ? 'bg-white/2' : ''} hover:bg-white/5`}>
                        <td className="px-4 py-3"><input checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} type="checkbox" /></td>
                        <td className="px-4 py-3 font-mono text-sm">#{u.id}</td>
                        <td className="px-4 py-3 flex items-center gap-3"><Avatar name={u.name} /> <div><div className="font-medium">{u.name}</div><div className="text-xs text-white/60">{u.email}</div></div></td>
                        <td className="px-4 py-3 text-sm">{u.gender}</td>
                        <td className="px-4 py-3 text-right">
                          {/* floating card toggle: clicking View opens a floating centered card */}
                          <button onClick={() => setOpenUser(u)} className="inline-flex items-center gap-2 px-3 py-1 rounded border border-neutral-800"> <User className="w-4 h-4" /> View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
                <div className="text-sm text-white/70">{selectedIds.size} selected</div>
                <div className="flex items-center gap-2"><button onClick={() => startBulkAction('block')} className="px-3 py-1 rounded border border-neutral-800">Block selected</button></div>
              </div>
            </div>
          </section>

          <aside />
        </div>

        {/* Floating user card centered */}
        {openUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpenUser(null)} />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-2xl bg-neutral-950/95 border border-neutral-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{openUser.name}</h3>
                  <div className="text-sm text-white/70">{openUser.email} • {openUser.phone}</div>
                  <div className="text-xs text-white/60 mt-1">Last login: {new Date(openUser.lastLogin).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => impersonate(openUser)} className="px-3 py-2 rounded border border-neutral-800"> <LogIn className="w-4 h-4" /> Login</button>
                  <button onClick={() => setOpenUser(null)} className="px-3 py-2 rounded border border-neutral-800">Close</button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-6">
                <div>
                  <div className="text-xs text-white/70">Gender</div>
                  <div className="font-medium">{openUser.gender}</div>
                </div>
                <div>
                  <div className="text-xs text-white/70">Age</div>
                  <div className="font-medium">{openUser.age}</div>
                </div>
                <div>
                  <div className="text-xs text-white/70">Role</div>
                  <select value={openUser.role} onChange={(e) => updateRole(openUser.id, e.target.value)} className="bg-transparent border border-neutral-800 text-white px-2 py-1 rounded">
                    <option>Admin</option>
                    <option>Editor</option>
                    <option>Customer</option>
                  </select>
                </div>

                <div className="ml-auto flex gap-2">
                  <button onClick={() => setUsers((us) => us.map((x) => x.id === openUser.id ? {...x, status: x.status === 'active' ? 'blocked' : 'active'} : x))} className={`px-3 py-2 rounded border ${openUser.status === 'active' ? 'border-red-600 text-red-300' : 'border-green-600 text-green-300'}`}>{openUser.status === 'active' ? 'Block' : 'Unblock'}</button>
                  <button onClick={() => purgeUserNow(openUser.id)} className="px-3 py-2 rounded border border-red-700 text-red-400">Delete</button>
                </div>
              </div>

              <hr className="my-4 border-neutral-800" />

              {/* stats row with radio/tick like buttons */}
              <div className="flex items-center gap-3">
                {['overall','monthly','weekly','day'].map(k => (
                  <label key={k} className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border ${timeRange === k ? 'bg-white text-black border-white' : 'border-neutral-800 text-white/80'}`}>
                    <input type="radio" name="range" value={k} checked={timeRange === k} onChange={() => setTimeRange(k)} className="hidden" />
                    <span className={`w-3 h-3 rounded-full ${timeRange === k ? 'bg-black' : 'bg-white/10'}`} />
                    <span className="text-sm capitalize">{k === 'day' ? 'daywise' : k}</span>
                  </label>
                ))}

                <div className="ml-auto text-sm text-white/60">Showing: <strong className="ml-1">{timeRange === 'day' ? 'daywise' : timeRange}</strong></div>
              </div>

              {/* stats grid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-xs text-white/70">Total orders</div>
                  <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === 'day' ? 'day' : timeRange].total_orders}</div>
                </div>
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-xs text-white/70">Total spend</div>
                  <div className="text-lg font-semibold mt-1">{formatCurrency(openUser.stats[timeRange === 'day' ? 'day' : timeRange].total_spend)}</div>
                </div>
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-xs text-white/70">Coupon savings</div>
                  <div className="text-lg font-semibold mt-1">{formatCurrency(openUser.stats[timeRange === 'day' ? 'day' : timeRange].coupon_savings)}</div>
                </div>
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-xs text-white/70">Successful</div>
                  <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === 'day' ? 'day' : timeRange].orders_successful}</div>
                </div>
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-xs text-white/70">Cancelled</div>
                  <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === 'day' ? 'day' : timeRange].orders_cancelled}</div>
                </div>
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-xs text-white/70">Returned</div>
                  <div className="text-lg font-semibold mt-1">{openUser.stats[timeRange === 'day' ? 'day' : timeRange].orders_returned}</div>
                </div>
              </div>

              {/* spend chart with hover tooltip */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Spend (12 months)</h4>
                <HoverSparkline points={openUser.spendTrend} />
              </div>

              {/* 365 day heatmap */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Login heatmap (365 days)</h4>
                <Heatmap365 cells={openUser.heat365} />
              </div>

            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}

/* helpers */
function Avatar({ name }) { const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join(""); return <div className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center text-sm font-medium text-white/90">{initials}</div>; }

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
  } catch { return ""; }
}

function Heatmap365({ cells = [] }) {
  // render 52 columns x 7 rows (approx) with last 365 days left-to-right
  const cols = 52; const rows = 7;
  const grid = Array.from({ length: rows * cols }).map((_, i) => cells[i] || 0);
  return (
    <div className="w-full overflow-auto">
      <div className="grid grid-cols-52 gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 6px)` }}>
        {grid.map((c, i) => (
          <div key={i} title={`${c} events`} className={`w-1.5 h-3 rounded-sm ${c === 0 ? 'bg-white/6' : c < 2 ? 'bg-white/40' : c < 4 ? 'bg-white/70' : 'bg-white'}`} />
        ))}
      </div>
    </div>
  );
}

function Heatmap({ cells = [] }) {
  return <div className="grid grid-cols-10 gap-1">{cells.map((c, i) => <div key={i} className={`w-4 h-4 rounded ${c ? 'bg-white/90' : 'bg-white/6'}`} />)}</div>;
}

function HoverSparkline({ points = [] }) {
  const [hover, setHover] = useState(null);
  const w = 480; const h = 90; const padding = 10;
  const max = Math.max(...points, 1); const min = Math.min(...points, 0);
  const step = (w - padding * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => ({ x: padding + i * step, y: padding + (1 - (p - min) / (max - min || 1)) * (h - padding * 2), v: p }));

  return (
    <div className="relative bg-neutral-900 p-3 rounded border border-neutral-800">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
        <polyline points={coords.map(c => `${c.x},${c.y}`).join(' ')} fill="none" stroke="#fff" strokeOpacity="0.95" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4} fill={hover === i ? '#fff' : 'transparent'} stroke="#fff" strokeOpacity={0.9} />
        ))}
        {/* hover overlay rectangles */}
        {coords.map((c, i) => (
          <rect key={i} x={c.x - step / 2} y={0} width={step} height={h} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute left-4 top-2 px-2 py-1 bg-white text-black rounded text-xs shadow">{formatCurrency(coords[hover].v)}</div>
      )}
    </div>
  );
}

function formatCurrency(n) { return typeof n === 'number' ? n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '₹0'; }
