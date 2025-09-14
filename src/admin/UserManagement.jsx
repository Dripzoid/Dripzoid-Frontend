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
} from "lucide-react";

/**
 * Modern, black & white themed User Management page
 * - Uses Tailwind CSS (dark/BW theme)
 * - lucide-react icons
 * - Inline small UI primitives inside the file (Button, IconButton, Chip, Badge, Avatar)
 * - Demo data baked-in
 *
 * Paste into src/pages/UserManagement.jsx
 */

export default function UserManagement() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openUser, setOpenUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [bulkState, setBulkState] = useState({ running: false, action: null, progress: 0 });

  // DEMO generator
  const makeUser = (i) => {
    const spend = Math.round(Math.random() * 12000);
    const orders = Math.floor(Math.random() * 20);
    const days = Math.floor(Math.random() * 180);
    const roles = ["Admin", "Editor", "Customer"];
    const role = roles[i % roles.length];
    return {
      id: i + 1,
      name: ["Asha", "Rahul", "Maya", "Vikram", "Sonia"][i % 5] + " " + (i + 1),
      email: `user${i + 1}@example.com`,
      phone: `+91-9${String(100000000 + i).slice(-9)}`,
      signup: new Date(Date.now() - i * 86400000).toISOString(),
      status: i % 7 === 0 ? "blocked" : "active",
      tags: i % 10 === 0 ? ["VIP"] : [],
      total_orders: orders,
      total_spend: spend,
      coupon_savings: Math.round(Math.random() * 2000),
      last_active_days: days,
      role,
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
    const demo = [...Array(24).keys()].map((i) => makeUser(i));
    setUsers(demo);
  }, []);

  // simulated realtime updates
  useEffect(() => {
    const iv = setInterval(() => {
      setUsers((prev) => {
        if (!prev.length) return prev;
        const idx = Math.floor(Math.random() * prev.length);
        const copy = prev.slice();
        const u = { ...copy[idx] };
        if (Math.random() > 0.6) u.total_spend += Math.round(Math.random() * 300);
        if (Math.random() > 0.7) u.total_orders += 1;
        u.last_active_days = Math.max(0, u.last_active_days - 1);
        copy[idx] = u;
        return copy;
      });
    }, 7000);
    return () => clearInterval(iv);
  }, []);

  // filters
  const filters = [
    { key: "highSpend", label: "High Spend (₹>5k)" },
    { key: "frequentBuyer", label: "Frequent Buyer (>5 orders)" },
    { key: "inactive", label: "Inactive >90d" },
  ];

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (query && !(`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()))) return false;
        if (activeFilter === "highSpend" && u.total_spend <= 5000) return false;
        if (activeFilter === "frequentBuyer" && u.total_orders <= 5) return false;
        if (activeFilter === "inactive" && u.last_active_days <= 90) return false;
        return true;
      }),
    [users, query, activeFilter]
  );

  // selections
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

  // RBAC inline update
  const updateRole = (userId, role) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  // bulk simulation
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

  // Smart delete flows
  const softDeleteUser = (userId) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, deleteMode: "soft", purgeCountdown: 30 } : u)));
    setOpenUser(null);
    alert("Soft-deleted: will purge in 30 days (demo)");
  };
  const anonymizeUser = (userId) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, email: `anon+${u.id}@example.local`, name: `Deleted user ${u.id}`, deleteMode: "anonymized", purgeCountdown: null } : u)));
    setOpenUser(null);
    alert("Anonymized (demo)");
  };
  const purgeUserNow = (userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setOpenUser(null);
    alert("Purged (demo)");
  };

  // impersonate (mock)
  const impersonate = (user) => {
    alert(`Impersonation started for ${user.email} (demo)`);
  };

  // small UI primitives
  const IconButton = ({ children, title, onClick, className = "" }) => (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 border border-neutral-800 text-sm hover:bg-white hover:text-black transition ${className}`}
    >
      {children}
    </button>
  );

  const PrimaryButton = ({ children, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white/5 border border-neutral-800 hover:bg-white hover:text-black transition ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );

  const Chip = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition ${active ? "bg-white text-black border border-white" : "bg-transparent border border-neutral-800 text-white/80 hover:bg-neutral-900"}`}
    >
      {children}
    </button>
  );

  const Badge = ({ children, color = "white" }) => {
    const base = "text-xs px-2 py-0.5 rounded-full font-medium";
    if (color === "danger") return <span className={`${base} bg-red-700/20 text-red-300`}>{children}</span>;
    if (color === "vip") return <span className={`${base} bg-white text-black`}>{children}</span>;
    return <span className={`${base} bg-white/10 text-white/90`}>{children}</span>;
  };

  const Avatar = ({ name }) => {
    const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
    return <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-sm font-medium text-white/90">{initials}</div>;
  };

  // small chart helpers
  const Sparkline = ({ points = [] }) => {
    const w = 120;
    const h = 40;
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const step = points.length > 1 ? w / (points.length - 1) : w;
    let path = "";
    points.forEach((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / (max - min || 1)) * h;
      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none" aria-hidden>
        <path d={path} fill="none" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const Heatmap = ({ cells = [] }) => (
    <div className="grid grid-cols-10 gap-1">
      {cells.map((c, i) => (
        <div key={i} className={`w-4 h-4 rounded ${c ? "bg-white/90" : "bg-white/6"}`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-900 p-3 flex items-center gap-3 border border-neutral-800">
              <Users className="text-white/90" />
              <div>
                <div className="text-sm font-semibold">User Management</div>
                <div className="text-xs text-white/60">Manage accounts, roles & activity</div>
              </div>
            </div>
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
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, id..."
                className="bg-transparent outline-none text-white/90 placeholder:text-white/50 w-full"
              />
            </div>

            <PrimaryButton onClick={() => startBulkAction("block")} disabled={bulkState.running}>
              <Trash2 className="w-4 h-4" />
              Block
            </PrimaryButton>
            <PrimaryButton onClick={() => startBulkAction("export")} disabled={bulkState.running}>
              <Zap className="w-4 h-4" />
              Export
            </PrimaryButton>
          </div>
        </div>

        {/* bulk progress */}
        {bulkState.running && (
          <div className="mb-4 bg-neutral-900 p-3 rounded-md border border-neutral-800 flex items-center gap-3">
            <Loader2 className="animate-spin w-5 h-5 text-white/80" />
            <div className="text-sm text-white/80">Running {bulkState.action}...</div>
            <div className="flex-1 h-2 bg-white/6 rounded overflow-hidden">
              <div style={{ width: `${bulkState.progress}%` }} className="h-2 bg-white" />
            </div>
            <div className="text-xs text-white/60">{bulkState.progress}%</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List (main) */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow">
              <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-800">
                <div className="text-sm text-white/80">
                  Showing <span className="font-medium">{filtered.length}</span> users
                </div>
                <div className="text-xs text-white/50">Live / demo</div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm table-auto">
                  <thead className="bg-neutral-950/60 text-white/70 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <input type="checkbox" onChange={(e) => (e.target.checked ? selectAll() : clearSelection())} />
                      </th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Orders</th>
                      <th className="px-4 py-3 text-left">Spend</th>
                      <th className="px-4 py-3 text-left">Trend</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-white/60">
                          No users found
                        </td>
                      </tr>
                    )}

                    {filtered.map((u, idx) => (
                      <tr key={u.id} className={`transition ${idx % 2 === 0 ? "bg-white/2" : ""} hover:bg-white/5`}>
                        <td className="px-4 py-3">
                          <input checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} type="checkbox" />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} />
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-white/60">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">{u.total_orders}</td>
                        <td className="px-4 py-3">₹{u.total_spend.toLocaleString("en-IN")}</td>

                        <td className="px-4 py-3 w-28">
                          <div className="w-full">
                            <Sparkline points={u.spendTrend} />
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-2">
                            <ChevronsUpDown className="w-4 h-4 text-white/70" />
                            <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} className="bg-transparent border border-neutral-800 text-white/90 px-2 py-1 rounded text-xs">
                              <option>Admin</option>
                              <option>Editor</option>
                              <option>Customer</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {u.tags?.includes("VIP") ? <Badge color="vip">VIP</Badge> : u.status === "active" ? <Badge>Active</Badge> : <Badge color="danger">Blocked</Badge>}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <IconButton title="View details" onClick={() => setOpenUser(u)}><User className="w-4 h-4" /> View</IconButton>
                            <IconButton title="Toggle block" onClick={() => setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: x.status === "active" ? "blocked" : "active" } : x)))}>
                              <CheckCircle className="w-4 h-4" /> Toggle
                            </IconButton>
                            <IconButton title="Delete / Smart delete" onClick={() => setOpenUser(u)} className="border-red-700 text-red-400 hover:bg-red-600 hover:text-white">
                              <Trash2 className="w-4 h-4" /> Delete
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
                <div className="text-sm text-white/70">{selectedIds.size} selected</div>
                <div className="flex items-center gap-2">
                  <PrimaryButton onClick={() => startBulkAction("block")} disabled={bulkState.running || selectedIds.size === 0}>
                    <Trash2 className="w-4 h-4" /> Block selected
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </section>

          {/* right: quick panel */}
          <aside>
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 mb-4">
              <div className="text-sm text-white/80 mb-3">Quick metrics</div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Total users" value={users.length} />
                <MetricCard label="Active" value={users.filter((u) => u.status === "active").length} />
                <MetricCard label="Blocked" value={users.filter((u) => u.status === "blocked").length} />
                <MetricCard label="Selected" value={selectedIds.size} />
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

        {/* flyout (dark glass) */}
        {openUser && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setOpenUser(null)} />
            <aside className="w-full max-w-2xl bg-neutral-950/95 border-l border-neutral-800 p-6 overflow-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{openUser.name}</h2>
                  <div className="text-sm text-white/70">{openUser.email} • {openUser.phone}</div>
                  <div className="text-xs text-white/60 mt-1">Joined {new Date(openUser.signup).toLocaleDateString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  <IconButton title="Impersonate (demo)" onClick={() => impersonate(openUser)}>
                    <LogIn className="w-4 h-4" /> Login
                  </IconButton>
                  <IconButton title="Close" onClick={() => setOpenUser(null)}>Close</IconButton>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Kpi label="Total orders" value={openUser.total_orders} />
                <Kpi label="Total spend" value={`₹${openUser.total_spend.toLocaleString("en-IN")}`} />
                <Kpi label="Coupon savings" value={`₹${openUser.coupon_savings.toLocaleString("en-IN")}`} />
              </div>

              <section className="mt-6">
                <h3 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Spend (12 months)</h3>
                <div className="mt-2 w-full h-12"><Sparkline points={openUser.spendTrend} /></div>
              </section>

              <section className="mt-6">
                <h3 className="font-medium">Login heatmap (30 days)</h3>
                <div className="mt-2"><Heatmap cells={openUser.loginHeatmap} /></div>
              </section>

              <section className="mt-6">
                <h3 className="font-medium">Activity history</h3>
                <ul className="mt-2 text-sm text-white/70 list-inside space-y-1">
                  {openUser.activityLog.map((a, i) => <li key={i}>• {a}</li>)}
                </ul>
              </section>

              <section className="mt-6">
                <h3 className="font-medium">Role & actions</h3>
                <div className="mt-2 flex items-center gap-3">
                  <select value={openUser.role} onChange={(e) => updateRole(openUser.id, e.target.value)} className="bg-transparent border border-neutral-800 text-white px-3 py-2 rounded">
                    <option>Admin</option>
                    <option>Editor</option>
                    <option>Customer</option>
                  </select>

                  <IconButton title="Toggle block" onClick={() => setUsers((us) => us.map((x) => x.id === openUser.id ? { ...x, status: x.status === "active" ? "blocked" : "active" } : x))}>
                    <CheckCircle className="w-4 h-4" /> Toggle
                  </IconButton>

                  <IconButton title="Anonymize" onClick={() => anonymizeUser(openUser.id)} className="border-red-700 text-red-400 hover:bg-red-600 hover:text-white">
                    <Trash2 className="w-4 h-4" /> Anonymize
                  </IconButton>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="font-medium">Smart delete</h3>
                <div className="mt-2 flex items-center gap-3">
                  <IconButton title="Soft delete" onClick={() => softDeleteUser(openUser.id)} className="border-yellow-600 text-yellow-300">Soft delete</IconButton>
                  <IconButton title="Anonymize now" onClick={() => anonymizeUser(openUser.id)} className="border-red-700 text-red-400">Anonymize</IconButton>
                  <IconButton title="Purge now" onClick={() => purgeUserNow(openUser.id)} className="border-red-800 bg-red-700/10">Purge</IconButton>
                </div>
                {openUser.deleteMode === "soft" && <div className="mt-3 text-sm text-white/70">Purge in: {openUser.purgeCountdown ?? 30} days</div>}
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

/* small UI helpers (metrics, etc.) */
function MetricCard({ label, value }) {
  return (
    <div className="p-3 bg-black/20 rounded">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function Kpi({ label, value }) {
  return (
    <div className="p-3 bg-black/20 rounded text-center">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
function Avatar({ name }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  return <div className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center text-sm font-medium text-white/90">{initials}</div>;
}
