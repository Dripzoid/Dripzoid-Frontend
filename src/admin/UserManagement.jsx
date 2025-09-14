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
  CalendarDays,
} from "lucide-react";

/**
 * UserManagement.jsx
 * - Black & white minimalist admin UI using Tailwind
 * - RBAC, segments, inline analytics, impersonation, bulk ops, smart delete
 * - Updated to show overall stats (total, active, inactive, blocked, new)
 * - User list rows show id, name, gender + View button
 * - View card shows personal details + block/delete and detailed stats
 * - Stats can be filtered: Day / Week / Month / Overall
 * - All demo / hardcoded data for testing
 */

export default function UserManagement() {
  // --- UI state ---
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openUser, setOpenUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [timeRange, setTimeRange] = useState("overall"); // 'day'|'week'|'month'|'overall'
  const [bulkState, setBulkState] = useState({ running: false, action: null, progress: 0 });

  // --- Demo data generator with genders, age, lastLogin, and per-range stats ---
  const genders = ["Female", "Male", "Non-binary"];

  const makeUser = (i) => {
    const spend = Math.round(Math.random() * 12000);
    const orders = Math.floor(Math.random() * 25);
    const roleSet = ["Admin", "Editor", "Customer"];
    const role = roleSet[i % roleSet.length];
    const gender = genders[i % genders.length];
    const age = 20 + (i % 35);
    const lastLoginOffset = Math.floor(Math.random() * 60); // days ago

    const stats = {
      overall: {
        total_orders: orders,
        total_spend: spend,
        coupon_savings: Math.round(Math.random() * 2000),
        orders_successful: Math.floor(orders * (0.75 + Math.random() * 0.2)),
        orders_cancelled: Math.floor(orders * Math.random() * 0.2),
        orders_returned: Math.floor(orders * Math.random() * 0.1),
      },
      month: {},
      week: {},
      day: {},
    };

    // generate smaller slices for month/week/day (demo random)
    ['month','week','day'].forEach(k => {
      const factor = k === 'month'? 0.5 : k === 'week'? 0.15 : 0.02;
      const total_orders = Math.max(0, Math.floor(orders * factor));
      const total_spend = Math.round(spend * factor);
      stats[k] = {
        total_orders,
        total_spend,
        coupon_savings: Math.round((Math.random() * 2000) * factor),
        orders_successful: Math.floor(total_orders * 0.8),
        orders_cancelled: Math.floor(total_orders * 0.15),
        orders_returned: Math.floor(total_orders * 0.05),
      };
    });

    return {
      id: i + 1,
      name: ["Asha", "Rahul", "Maya", "Vikram", "Sonia"][i % 5] + " " + (i + 1),
      email: `user${i + 1}@example.com`,
      phone: `+91-9${String(100000000 + i).slice(-9)}`,
      signup: new Date(Date.now() - i * 86400000).toISOString(),
      lastLogin: new Date(Date.now() - lastLoginOffset * 86400000).toISOString(),
      status: i % 7 === 0 ? "blocked" : (lastLoginOffset > 90 ? "inactive" : "active"),
      tags: i % 10 === 0 ? ["VIP"] : [],
      role,
      gender,
      age,
      stats,
      spendTrend: Array.from({ length: 12 }, () => Math.floor(Math.random() * Math.max(100, spend / 6))),
      loginHeatmap: Array.from({ length: 30 }, () => (Math.random() > 0.7 ? 1 : 0)),
      activityLog: [
        `2025-09-${String(10 + (i % 10)).padStart(2, "0")}: Logged in`,
        `2025-09-${String(8 + (i % 6)).padStart(2, "0")}: Placed order #${1000 + i}`,
        `2025-09-${String(6 + (i % 4)).padStart(2, "0")}: Used coupon SAVE${i % 100}`,
      ],
      deleteMode: null,
      purgeCountdown: null,
    };
  };

  useEffect(() => {
    const demo = [...Array(28).keys()].map((i) => makeUser(i));
    setUsers(demo);
  }, []);

  // --- Derived overall stats ---
  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const blocked = users.filter((u) => u.status === "blocked").length;
    const inactive = users.filter((u) => u.status === "inactive").length;
    // new users: signed up in last 7 days
    const now = Date.now();
    const newUsers = users.filter((u) => now - new Date(u.signup).getTime() < 7 * 86400000).length;
    return { total, active, blocked, inactive, newUsers };
  }, [users]);

  // --- Filtering by search + segment ---
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (query && !(`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()))) return false;
      if (activeFilter === "highSpend" && u.stats.overall.total_spend <= 5000) return false;
      if (activeFilter === "frequentBuyer" && u.stats.overall.total_orders <= 5) return false;
      if (activeFilter === "inactive" && u.status !== "inactive") return false;
      return true;
    });
  }, [users, query, activeFilter]);

  // --- Selection helpers ---
  const toggleSelect = (id) => {
    setSelectedIds((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };
  const selectAll = () => setSelectedIds(new Set(filtered.map((u) => u.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // --- RBAC role update ---
  const updateRole = (userId, role) => setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));

  // --- Bulk action simulation ---
  const startBulkAction = (action) => {
    if (selectedIds.size === 0) return alert("Select at least one user");
    setBulkState({ running: true, action, progress: 6 });
    const total = selectedIds.size;
    let done = 0;
    const iv = setInterval(() => {
      done += Math.max(1, Math.ceil(total * 0.18));
      const pct = Math.min(100, Math.round((done / total) * 100));
      setBulkState((s) => ({ ...s, progress: pct }));
      if (done >= total) {
        clearInterval(iv);
        if (action === "block") {
          setUsers((prev) => prev.map((u) => (selectedIds.has(u.id) ? { ...u, status: "blocked" } : u)));
        }
        setTimeout(() => {
          setBulkState({ running: false, action: null, progress: 0 });
          clearSelection();
          alert(`${action} completed for ${total} user(s) (demo)`);
        }, 500);
      }
    }, 320);
  };

  // --- Smart delete flows ---
  const softDeleteUser = (userId) => {
    setUsers((p) => p.map((u) => (u.id === userId ? { ...u, deleteMode: "soft", purgeCountdown: 30 } : u)));
    setOpenUser(null);
    alert("Soft-deleted: will purge in 30 days (demo)");
  };
  const anonymizeUser = (userId) => {
    setUsers((p) => p.map((u) => (u.id === userId ? { ...u, email: `anon+${u.id}@example.local`, name: `Deleted user ${u.id}`, deleteMode: "anonymized", purgeCountdown: null } : u)));
    setOpenUser(null);
    alert("Anonymized (demo)");
  };
  const purgeUserNow = (userId) => {
    setUsers((p) => p.filter((u) => u.id !== userId));
    setOpenUser(null);
    alert("Purged (demo)");
  };

  // --- Impersonation ---
  const impersonate = (user) => alert(`Impersonation started for ${user.email} (demo)`);

  // --- Small UI primitives ---
  const Chip = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-medium transition ${active ? "bg-white text-black border border-white" : "bg-transparent border border-neutral-800 text-white/80 hover:bg-neutral-900"}`}>
      {children}
    </button>
  );

  const IconButton = ({ children, title, onClick, className = "" }) => (
    <button title={title} onClick={onClick} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-800 text-sm hover:bg-white hover:text-black transition ${className}`}>
      {children}
    </button>
  );

  const Metric = ({ label, value }) => (
    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );

  const Avatar = ({ name }) => {
    const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
    return <div className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center text-sm font-medium text-white/90">{initials}</div>;
  };

  const Sparkline = ({ points = [] }) => {
    const w = 120; const h = 40; const max = Math.max(...points, 1); const min = Math.min(...points, 0);
    const step = points.length > 1 ? w / (points.length - 1) : w; let path = "";
    points.forEach((p, i) => { const x = i * step; const y = h - ((p - min) / (max - min || 1)) * h; path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`; });
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none" aria-hidden>
        <path d={path} fill="none" stroke="#fff" strokeOpacity="0.95" strokeWidth={1.6} strokeLinecap="round" />
      </svg>
    );
  };

  const Heatmap = ({ cells = [] }) => (
    <div className="grid grid-cols-10 gap-1">{cells.map((c, i) => <div key={i} className={`w-4 h-4 rounded ${c ? "bg-white/90" : "bg-white/6"}`} />)}</div>
  );

  // --- Helper to get stats by selected time range ---
  const statsFor = (user) => user.stats[timeRange] || user.stats.overall;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* header area */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-900 p-3 flex items-center gap-3 border border-neutral-800">
              <Users className="text-white/90" />
              <div>
                <div className="text-sm font-semibold">User Management</div>
                <div className="text-xs text-white/60">Black & white admin console</div>
              </div>
            </div>

            {/* segmentation chips visible on large */}
            <div className="hidden md:flex items-center gap-2">
              <Chip active={activeFilter === "highSpend"} onClick={() => setActiveFilter(activeFilter === "highSpend" ? null : "highSpend")}>
                💰 High Spend
              </Chip>
              <Chip active={activeFilter === "frequentBuyer"} onClick={() => setActiveFilter(activeFilter === "frequentBuyer" ? null : "frequentBuyer")}>
                🛒 Frequent
              </Chip>
              <Chip active={activeFilter === "inactive"} onClick={() => setActiveFilter(activeFilter === "inactive" ? null : "inactive")}>
                😴 Inactive
              </Chip>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-neutral-900 rounded-md border border-neutral-800 px-3 py-1 gap-2 w-80">
              <Search className="text-white/70" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search id, name, email..." className="bg-transparent outline-none text-white/90 placeholder:text-white/50 w-full" />
            </div>

            <IconButton onClick={() => startBulkAction("block")} title="Block selected">
              <Trash2 className="w-4 h-4" /> Block
            </IconButton>
            <IconButton onClick={() => startBulkAction("export")} title="Export selected">
              <Zap className="w-4 h-4" /> Export
            </IconButton>
          </div>
        </div>

        {/* top summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Metric label="Total users" value={summary.total} />
          <Metric label="Active users" value={summary.active} />
          <Metric label="Inactive users" value={summary.inactive} />
          <Metric label="Blocked users" value={summary.blocked} />
          <Metric label="New (7d)" value={summary.newUsers} />
        </div>

        {/* main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* users list (left/middle) */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow">
              <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-800">
                <div className="text-sm text-white/80">Users</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-white/60">Stats range:</div>
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-transparent border border-neutral-800 text-white px-2 py-1 rounded text-sm">
                    <option value="overall">Overall</option>
                    <option value="month">Monthly</option>
                    <option value="week">Weekly</option>
                    <option value="day">Daily</option>
                  </select>
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
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-white/60">No users found</td></tr>
                    )}

                    {filtered.map((u, idx) => (
                      <tr key={u.id} className={`transition ${idx % 2 === 0 ? "bg-white/2" : ""} hover:bg-white/5`}>
                        <td className="px-4 py-3"><input checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} type="checkbox" /></td>
                        <td className="px-4 py-3 font-mono text-sm">#{u.id}</td>
                        <td className="px-4 py-3 flex items-center gap-3"><Avatar name={u.name} /> <div><div className="font-medium">{u.name}</div><div className="text-xs text-white/60">{u.email}</div></div></td>
                        <td className="px-4 py-3 text-sm">{u.gender}</td>
                        <td className="px-4 py-3 text-right">
                          <IconButton title="View user" onClick={() => setOpenUser(u)}><User className="w-4 h-4" /> View</IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
                <div className="text-sm text-white/70">{selectedIds.size} selected</div>
                <div className="flex items-center gap-2">
                  <IconButton onClick={() => startBulkAction("block")} title="Block selected"> <Trash2 className="w-4 h-4" /> Block selected</IconButton>
                </div>
              </div>
            </div>
          </section>

          {/* right: quick panel */}
          <aside>
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 mb-4">
              <div className="text-sm text-white/80 mb-3">Quick metrics</div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Total users" value={summary.total} />
                <Metric label="Active" value={summary.active} />
                <Metric label="Inactive" value={summary.inactive} />
                <Metric label="Blocked" value={summary.blocked} />
                <Metric label="New (7d)" value={summary.newUsers} />
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
              <div className="text-sm text-white/80 mb-3">Top tags</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-white text-black rounded text-xs">VIP</span>
                <span className="px-2 py-1 bg-white/6 text-white rounded text-xs">Wholesale</span>
                <span className="px-2 py-1 bg-red-700/10 text-red-300 rounded text-xs">Fraud suspect</span>
              </div>
            </div>
          </aside>
        </div>

        {/* flyout (dark glass) - user card */}
        {openUser && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setOpenUser(null)} />
            <aside className="w-full max-w-md bg-neutral-950/95 border-l border-neutral-800 p-6 overflow-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{openUser.name}</h2>
                  <div className="text-sm text-white/70">{openUser.email} • {openUser.phone}</div>
                  <div className="text-xs text-white/60 mt-1">Last login: {new Date(openUser.lastLogin).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <IconButton title="Impersonate" onClick={() => impersonate(openUser)}><LogIn className="w-4 h-4" /> Login</IconButton>
                  <IconButton title="Close" onClick={() => setOpenUser(null)}>Close</IconButton>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-white/70">Gender</div>
                  <div className="font-medium">{openUser.gender}</div>
                  <div className="text-sm text-white/70 ml-4">Age</div>
                  <div className="font-medium">{openUser.age}</div>
                </div>

                <div className="flex items-center gap-3">
                  <button className={`px-4 py-2 rounded border ${openUser.status === 'active' ? 'border-red-600 text-red-300' : 'border-green-600 text-green-300'}`} onClick={() => setUsers((us) => us.map((x) => x.id === openUser.id ? {...x, status: x.status === 'active' ? 'blocked' : 'active'} : x))}>
                    {openUser.status === 'active' ? 'Block' : 'Unblock'}
                  </button>

                  <button className="px-4 py-2 rounded border border-red-700 text-red-400" onClick={() => purgeUserNow(openUser.id)}>Delete user</button>
                </div>
              </div>

              <hr className="my-4 border-neutral-800" />

              {/* user stats area filtered by timeRange */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">User stats</div>
                  <div className="text-xs text-white/60">Showing: <strong className="ml-1">{timeRange}</strong></div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Metric label="Total orders" value={statsFor(openUser).total_orders} />
                  <Metric label="Total spend" value={`₹${statsFor(openUser).total_spend}`} />
                  <Metric label="Coupon savings" value={`₹${statsFor(openUser).coupon_savings}`} />
                  <Metric label="Successful" value={statsFor(openUser).orders_successful} />
                  <Metric label="Cancelled" value={statsFor(openUser).orders_cancelled} />
                  <Metric label="Returned" value={statsFor(openUser).orders_returned} />
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Activity (last 30 days)</h4>
                  <div className="w-full h-12"><Sparkline points={openUser.spendTrend} /></div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Login heatmap</h4>
                  <Heatmap cells={openUser.loginHeatmap} />
                </div>

              </div>
            </aside>
          </div>
        )}

      </div>
    </div>
  );
}

/* small helpers */
function Metric({ label, value }) {
  return (
    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-center">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Avatar({ name }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  return <div className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center text-sm font-medium text-white/90">{initials}</div>;
}
