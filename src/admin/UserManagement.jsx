import React, { useEffect, useMemo, useState } from 'react';

// UserManagement.jsx
// Modern black & white themed admin users page with:
// - RBAC (Admin / Editor / Customer) with inline role updates
// - Segmentation chips (High Spend, Frequent Buyer, Inactive >90 days)
// - Inline analytics: 12-month spend sparkline + 30-day login heatmap
// - Impersonation (mock) and activity audit log
// - Bulk operations with simulated progress (block/export)
// - Smart Delete flow: soft-delete, anonymize, full purge countdown
// - Simulated real-time updates (polling)
// - Hard-coded demo data for testing

export default function UserManagement() {
  // UI state
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [page] = useState(1);
  const [perPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openUser, setOpenUser] = useState(null);
  const [bulkState, setBulkState] = useState({ running: false, action: null, progress: 0 });
  const [activeFilter, setActiveFilter] = useState(null);

  // --- DEMO data generator ---
  const makeUser = (i) => {
    const spend = Math.round(Math.random() * 12000);
    const orders = Math.floor(Math.random() * 20);
    const days = Math.floor(Math.random() * 180); // last active days
    const roles = ['Admin', 'Editor', 'Customer'];
    const role = roles[i % roles.length];
    return {
      id: i + 1,
      name: ['Asha', 'Rahul', 'Maya', 'Vikram', 'Sonia'][i % 5] + ' ' + (i + 1),
      email: `user${i + 1}@example.com`,
      phone: `+91-9${String(100000000 + i).slice(-9)}`,
      signup: new Date(Date.now() - (i * 86400000)).toISOString(),
      status: i % 7 === 0 ? 'blocked' : 'active',
      tags: i % 10 === 0 ? ['VIP'] : [],
      total_orders: orders,
      total_spend: spend,
      coupon_savings: Math.round(Math.random() * 2000),
      last_order: i % 3 === 0 ? null : new Date(Date.now() - (i * 3 * 86400000)).toISOString(),
      last_active_days: days,
      role,
      spendTrend: Array.from({ length: 12 }, () => Math.floor(Math.random() * Math.max(100, spend / 6))),
      loginHeatmap: Array.from({ length: 30 }, () => (Math.random() > 0.7 ? 1 : 0)),
      activityLog: [
        `2025-09-${String(10 + (i % 10)).padStart(2, '0')}: Logged in`,
        `2025-09-${String(8 + (i % 6)).padStart(2, '0')}: Placed order #${1000 + i}`,
        `2025-09-${String(6 + (i % 4)).padStart(2, '0')}: Used coupon SAVE${i % 100}`,
      ],
      deleteMode: null, // null | 'soft' | 'anonymize' | 'purged'
      purgeCountdown: null, // days remaining when soft-deleted
    };
  };

  // load demo users on mount
  useEffect(() => {
    const demo = [...Array(24).keys()].map((i) => makeUser(i));
    setUsers(demo);
  }, []);

  // Simulated real-time: every 7s randomly nudge a user's spend or orders
  useEffect(() => {
    const iv = setInterval(() => {
      setUsers((prev) => {
        const copy = [...prev];
        if (copy.length === 0) return copy;
        const idx = Math.floor(Math.random() * copy.length);
        const u = { ...copy[idx] };
        // small random update
        if (Math.random() > 0.5) u.total_spend += Math.round(Math.random() * 300);
        else u.total_orders += Math.random() > 0.5 ? 1 : 0;
        u.last_active_days = Math.max(0, u.last_active_days - 1);
        copy[idx] = u;
        return copy;
      });
    }, 7000);
    return () => clearInterval(iv);
  }, []);

  // Filtering & segmentation
  const filters = [
    { key: 'highSpend', label: 'High Spend (₹>5000)' },
    { key: 'frequentBuyer', label: 'Frequent Buyer (>5 orders)' },
    { key: 'inactive', label: 'Inactive >90 days' },
  ];

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (query && !(`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()))) return false;
      if (activeFilter === 'highSpend' && u.total_spend <= 5000) return false;
      if (activeFilter === 'frequentBuyer' && u.total_orders <= 5) return false;
      if (activeFilter === 'inactive' && u.last_active_days <= 90) return false;
      return true;
    });
  }, [users, query, activeFilter]);

  // Selection helpers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };
  const selectAllOnPage = () => {
    setSelectedIds(new Set(filtered.map((u) => u.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // RBAC: change role inline
  const updateRole = (userId, role) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  // Bulk action simulation with progress
  const startBulkAction = (action) => {
    if (selectedIds.size === 0) return alert('Select at least one user');
    setBulkState({ running: true, action, progress: 0 });
    const total = selectedIds.size;
    let done = 0;
    const iv = setInterval(() => {
      done += Math.max(1, Math.ceil(total * 0.15));
      const progress = Math.min(100, Math.round((done / total) * 100));
      setBulkState((s) => ({ ...s, progress }));
      if (done >= total) {
        clearInterval(iv);
        // apply effects
        if (action === 'block') {
          setUsers((prev) => prev.map((u) => (selectedIds.has(u.id) ? { ...u, status: 'blocked' } : u)));
        }
        // export does nothing in demo
        setTimeout(() => {
          setBulkState({ running: false, action: null, progress: 0 });
          clearSelection();
          alert(`${action} completed for ${total} user(s)`);
        }, 500);
      }
    }, 350);
  };

  // Smart delete flows
  const softDeleteUser = (userId) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, deleteMode: 'soft', purgeCountdown: 30 } : u)));
    setOpenUser(null);
    alert('User soft-deleted (demo). Will be purged in 30 days.');
  };

  const anonymizeUser = (userId) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, email: `anon+${u.id}@example.local`, name: `Deleted user ${u.id}`, deleteMode: 'anonymized', purgeCountdown: null } : u)));
    setOpenUser(null);
    alert('User anonymized (demo).');
  };

  const purgeUserNow = (userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setOpenUser(null);
    alert('User fully purged (demo).');
  };

  // Impersonation (mock)
  const impersonate = (user) => {
    alert(`Impersonation started for ${user.email} (demo).`);
  };

  // Helper small UI components (inline)
  const RoleSelect = ({ user }) => (
    <select
      value={user.role}
      onChange={(e) => updateRole(user.id, e.target.value)}
      className="bg-black border border-neutral-800 text-white px-2 py-1 rounded text-sm"
    >
      <option>Admin</option>
      <option>Editor</option>
      <option>Customer</option>
    </select>
  );

  const Sparkline = ({ points = [] }) => {
    const w = 120;
    const h = 40;
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const step = points.length > 1 ? w / (points.length - 1) : w;
    let path = '';
    points.forEach((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / (max - min || 1)) * h;
      path += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="block" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth={1.5} />
      </svg>
    );
  };

  const Heatmap = ({ cells = [] }) => (
    <div className="grid grid-cols-10 gap-1">
      {cells.map((c, i) => (
        <div key={i} className={`w-4 h-4 rounded ${c ? 'bg-white/80' : 'bg-white/10'}`} />
      ))}
    </div>
  );

  // pagination slice for demo (no server paging in this mock)
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Users</h1>
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-white w-64"
              placeholder="Search by name, email or id"
            />
            <div className="flex gap-2">
              <button
                onClick={() => startBulkAction('block')}
                className="px-3 py-2 border border-neutral-800 rounded hover:bg-white hover:text-black transition"
                disabled={bulkState.running}
              >Block</button>
              <button
                onClick={() => startBulkAction('export')}
                className="px-3 py-2 border border-neutral-800 rounded hover:bg-white hover:text-black transition"
                disabled={bulkState.running}
              >Export</button>
            </div>
          </div>
        </header>

        {/* segmentation chips */}
        <div className="mb-4 flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(activeFilter === f.key ? null : f.key)}
              className={`px-3 py-1 rounded-full text-xs border ${activeFilter === f.key ? 'bg-white text-black border-white' : 'border-neutral-800 text-white/80 hover:bg-neutral-900'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* bulk progress */}
        {bulkState.running && (
          <div className="mb-3 bg-neutral-900 p-3 rounded border border-neutral-800 flex items-center gap-3">
            <div className="text-sm">{bulkState.action}ing...</div>
            <div className="flex-1 bg-white/10 h-2 rounded overflow-hidden">
              <div style={{ width: `${bulkState.progress}%` }} className="h-2 bg-white" />
            </div>
            <div className="text-xs text-white/80">{bulkState.progress}%</div>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* left: list */}
          <section className="lg:col-span-2">
            <div className="bg-neutral-900 rounded shadow overflow-hidden border border-neutral-800">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="text-sm text-white/80">Showing {paged.length} of {filtered.length} users</div>
                <div className="text-sm text-white/60">Page {page}</div>
              </div>

              <table className="min-w-full text-sm leading-6">
                <thead className="bg-neutral-950 text-white/70">
                  <tr>
                    <th className="px-4 py-3 text-left"> <input type="checkbox" onChange={(e) => e.target.checked ? selectAllOnPage() : clearSelection()} /> </th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Orders</th>
                    <th className="px-4 py-3 text-left">Total spend</th>
                    <th className="px-4 py-3 text-left">Trend</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 && (
                    <tr><td colSpan={8} className="p-6 text-center text-white/60">No users found</td></tr>
                  )}

                  {paged.map((u, idx) => (
                    <tr key={u.id} className={`border-t ${idx % 2 === 0 ? 'bg-white/2' : ''} hover:bg-white/5 transition`}>
                      <td className="px-4 py-3">
                        <input checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} type="checkbox" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-white/60">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">{u.total_orders}</td>
                      <td className="px-4 py-3">₹{u.total_spend.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 w-32"><Sparkline points={u.spendTrend} /></td>
                      <td className="px-4 py-3"><RoleSelect user={u} /></td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${u.status === 'active' ? 'bg-white/10 text-white' : 'bg-red-600/20 text-red-300'}`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setOpenUser(u); }} className="px-2 py-1 rounded border border-neutral-800 hover:bg-white hover:text-black transition text-sm">View</button>
                          <button onClick={() => setUsers((us) => us.map((x) => x.id === u.id ? { ...x, status: x.status === 'active' ? 'blocked' : 'active' } : x))} className="px-2 py-1 rounded border border-neutral-800 hover:bg-white hover:text-black transition text-sm">Toggle</button>
                          <button onClick={() => { setOpenUser(u); }} className="px-2 py-1 rounded border border-red-700 text-red-400 hover:bg-red-600 hover:text-white transition text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* footer / pagination placeholder */}
              <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
                <div className="text-sm text-white/70">{selectedIds.size} selected</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setUsers((us) => us.map((u) => selectedIds.has(u.id) ? { ...u, status: 'blocked' } : u))} className="px-3 py-1 rounded border border-neutral-800 hover:bg-white hover:text-black">Block selected</button>
                </div>
              </div>
            </div>
          </section>

          {/* right: quick insights / selected user preview */}
          <aside className="space-y-4">
            <div className="bg-neutral-900 rounded shadow p-4 border border-neutral-800">
              <div className="text-sm text-white/80 mb-2">Quick metrics</div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Total users" value={users.length} />
                <MetricCard label="Active" value={users.filter(u => u.status === 'active').length} />
                <MetricCard label="Blocked" value={users.filter(u => u.status === 'blocked').length} />
                <MetricCard label="Selected" value={selectedIds.size} />
              </div>
            </div>

            <div className="bg-neutral-900 rounded shadow p-4 border border-neutral-800">
              <div className="text-sm text-white/80 mb-2">Top tags</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-white text-black rounded text-xs">VIP</span>
                <span className="px-2 py-1 bg-white/10 text-white rounded text-xs">Wholesale</span>
                <span className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs">Fraud suspect</span>
              </div>
            </div>
          </aside>
        </main>

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
                  <button onClick={() => impersonate(openUser)} className="px-3 py-2 border border-neutral-800 rounded hover:bg-white hover:text-black">Login as user</button>
                  <button onClick={() => setOpenUser(null)} className="px-3 py-2 border border-neutral-800 rounded">Close</button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Kpi label="Total orders" value={openUser.total_orders} />
                <Kpi label="Total spend" value={`₹${openUser.total_spend.toLocaleString('en-IN')}`} />
                <Kpi label="Coupon savings" value={`₹${openUser.coupon_savings.toLocaleString('en-IN')}`} />
              </div>

              <section className="mt-6">
                <h3 className="font-medium">Spend (12 months)</h3>
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
                  <RoleSelect user={openUser} />
                  <button onClick={() => setUsers((us) => us.map((x) => x.id === openUser.id ? { ...x, status: x.status === 'active' ? 'blocked' : 'active' } : x))} className="px-3 py-2 border border-neutral-800 rounded">Toggle block</button>
                  <button onClick={() => anonymizeUser(openUser.id)} className="px-3 py-2 border border-red-700 text-red-400 rounded">Anonymize</button>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="font-medium">Smart delete</h3>
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={() => softDeleteUser(openUser.id)} className="px-3 py-2 border border-yellow-600 text-yellow-300 rounded">Soft delete (30d)</button>
                  <button onClick={() => anonymizeUser(openUser.id)} className="px-3 py-2 border border-red-700 text-red-400 rounded">Anonymize now</button>
                  <button onClick={() => purgeUserNow(openUser.id)} className="px-3 py-2 border border-red-800 text-white rounded bg-red-700/10">Purge now</button>
                </div>
                {openUser.deleteMode === 'soft' && (
                  <div className="mt-3 text-sm text-white/70">Purge in: {openUser.purgeCountdown ?? 30} days</div>
                )}
              </section>

            </aside>
          </div>
        )}

      </div>
    </div>
  );
}


/* ---------- Small UI helper components ---------- */
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

function Sparkline({ points = [] }) {
  const w = 120;
  const h = 40;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  let path = '';
  points.forEach((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / (max - min || 1)) * h;
    path += (i === 0 ? `M${x},${y}` : ` L${x},${y}`);
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth={1.5} />
    </svg>
  );
}

function Heatmap({ cells = [] }) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {cells.map((c, i) => (
        <div key={i} className={`w-4 h-4 rounded ${c ? 'bg-white/90' : 'bg-white/10'}`} />
      ))}
    </div>
  );
}
