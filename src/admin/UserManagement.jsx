import React, { useEffect, useMemo, useState } from 'react';

// UserManagement.jsx
// Single-file React component for an admin "Users" page with:
// - searchable & filterable user list
// - KPI strip on user detail
// - right-side flyout for full user profile
// - bulk actions (block, export)
// - soft-delete flow (confirmation)
// Uses Tailwind CSS for styling. Default export is the component.

export default function AdminUsers() {
  // UI State
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Data state
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Flyout state
  const [openUser, setOpenUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mock fallback (so the component works out of the box)
  const mockFetchUsers = async ({ q, status, page, perPage }) => {
    // small mock dataset
    const sample = [...Array(34).keys()].map((i) => ({
      id: i + 1,
      name: ['Asha', 'Rahul', 'Maya', 'Vikram', 'Sonia'][i % 5] + ' ' + (i + 1),
      email: `user${i + 1}@example.com`,
      phone: `+91-9${String(100000000 + i).slice(-9)}`,
      signup: new Date(Date.now() - (i * 86400000)).toISOString(),
      status: i % 7 === 0 ? 'blocked' : 'active',
      tags: i % 10 === 0 ? ['VIP'] : [],
      total_orders: Math.floor(Math.random() * 25),
      total_spend: Math.round(Math.random() * 50000),
      coupon_savings: Math.round(Math.random() * 2000),
      last_order: i % 3 === 0 ? null : new Date(Date.now() - (i * 3 * 86400000)).toISOString(),
    }));

    // simple filter
    let filtered = sample.filter((u) => {
      if (q) {
        const qq = q.toLowerCase();
        if (!(`${u.name} ${u.email}`.toLowerCase().includes(qq))) return false;
      }
      if (status && status !== 'all' && u.status !== status) return false;
      return true;
    });

    const start = (page - 1) * perPage;
    const pageSlice = filtered.slice(start, start + perPage);

    return { items: pageSlice, total: filtered.length };
  };

  // load users (try real endpoint first, fall back to mock)
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // replace with your real endpoint: `/admin/users?query=${query}&status=${statusFilter}&page=${page}&perPage=${perPage}`
      // const res = await fetch(`/admin/users?query=${encodeURIComponent(query)}&status=${statusFilter}&page=${page}&perPage=${perPage}`);
      // const data = await res.json();

      // fallback to mock for standalone usage
      const data = await mockFetchUsers({ q: query, status: statusFilter, page, perPage });
      setUsers(data.items);
      setTotalCount(data.total);
    } catch (err) {
      console.error(err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, page]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const selectAllOnPage = () => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      users.forEach((u) => copy.add(u.id));
      return copy;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkBlock = async () => {
    if (selectedIds.size === 0) return alert('No users selected');
    // call your bulk endpoint here
    alert(`Blocking ${selectedIds.size} users (demo)`);
    // update UI locally
    setUsers((us) => us.map((u) => (selectedIds.has(u.id) ? { ...u, status: 'blocked' } : u)));
    clearSelection();
  };

  const openDetails = (user) => {
    setOpenUser(user);
  };

  const softDeleteUser = async (userId) => {
    // demo: mark locally
    setUsers((us) => us.filter((u) => u.id !== userId));
    setShowDeleteConfirm(false);
    setOpenUser(null);
    alert(`User ${userId} soft-deleted (demo)`);
  };

  const pageCount = Math.ceil(totalCount / perPage) || 1;

  // derived UI
  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Users</h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-md shadow px-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="px-3 py-2 outline-none w-64"
                placeholder="Search by name, email or id"
              />
              <button
                onClick={() => { setPage(1); loadUsers(); }}
                className="px-3 py-2 rounded-r-md bg-indigo-600 text-white"
              >Search</button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded bg-white shadow"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>

            <button
              onClick={() => { selectAllOnPage(); }}
              className="px-3 py-2 rounded bg-white shadow"
            >Select all</button>

            <div className="flex items-center gap-2">
              <button onClick={bulkBlock} className="px-3 py-2 rounded bg-red-600 text-white">Block</button>
              <button onClick={() => alert('Export (demo)')} className="px-3 py-2 rounded bg-green-600 text-white">Export</button>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* left: list */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="text-sm text-gray-600">Showing {users.length} of {totalCount} users</div>
                <div className="text-sm text-gray-500">Page {page} / {pageCount}</div>
              </div>

              <table className="min-w-full text-sm leading-6">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left"> <input type="checkbox" onChange={(e) => e.target.checked ? selectAllOnPage() : clearSelection()} /> </th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Orders</th>
                    <th className="px-4 py-3 text-left">Total spend</th>
                    <th className="px-4 py-3 text-left">Coupon savings</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="p-6 text-center">Loading…</td></tr>
                  )}

                  {!loading && users.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center">No users found</td></tr>
                  )}

                  {users.map((u) => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} type="checkbox" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">{u.total_orders}</td>
                      <td className="px-4 py-3">₹{u.total_spend.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">₹{u.coupon_savings.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openDetails(u)} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs">View</button>
                          <button onClick={() => {
                            // quick toggle block
                            setUsers((us) => us.map((x) => x.id === u.id ? { ...x, status: x.status === 'active' ? 'blocked' : 'active' } : x));
                          }} className="px-2 py-1 rounded bg-gray-200 text-xs">Toggle</button>
                          <button onClick={() => { setShowDeleteConfirm(true); setOpenUser(u); }} className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* pagination */}
              <div className="p-4 border-t flex items-center justify-between">
                <div className="text-sm">{selectedCount} selected</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded bg-white shadow">Prev</button>
                  <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-3 py-1 rounded bg-white shadow">Next</button>
                </div>
              </div>
            </div>
          </section>

          {/* right: quick insights / selected user preview */}
          <aside className="space-y-4">
            <div className="bg-white rounded shadow p-4">
              <div className="text-sm text-gray-600 mb-2">Quick metrics</div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Total users" value={totalCount} />
                <MetricCard label="Active" value={users.filter(u => u.status === 'active').length} />
                <MetricCard label="Blocked" value={users.filter(u => u.status === 'blocked').length} />
                <MetricCard label="Selected" value={selectedCount} />
              </div>
            </div>

            <div className="bg-white rounded shadow p-4">
              <div className="text-sm text-gray-600 mb-2">Top tags</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">VIP</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Wholesale</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Fraud suspect</span>
              </div>
            </div>
          </aside>
        </main>

        {/* Right-side flyout for user details */}
        {openUser && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1" onClick={() => setOpenUser(null)} />
            <div className="w-full max-w-2xl bg-white shadow-xl p-6 overflow-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{openUser.name}</h2>
                  <div className="text-sm text-gray-500">{openUser.email} • {openUser.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { /* impersonate action */ alert('Impersonate (demo)'); }} className="px-3 py-2 rounded bg-indigo-600 text-white">Impersonate</button>
                  <button onClick={() => { setShowDeleteConfirm(true); }} className="px-3 py-2 rounded bg-red-100 text-red-700">Delete</button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Kpi label="Total orders" value={openUser.total_orders} />
                <Kpi label="Total spend" value={`₹${openUser.total_spend.toLocaleString('en-IN')}`} />
                <Kpi label="Coupon savings" value={`₹${openUser.coupon_savings.toLocaleString('en-IN')}`} />
              </div>

              <section className="mt-6">
                <h3 className="font-medium">Recent orders</h3>
                <div className="mt-2 text-sm text-gray-600">(demo data) — click to open order in full app</div>
                <ul className="mt-3 space-y-2">
                  {[...Array(4).keys()].map((i) => (
                    <li key={i} className="p-3 border rounded hover:bg-gray-50 flex items-center justify-between">
                      <div>
                        <div className="font-medium">Order #{1000 + i}</div>
                        <div className="text-xs text-gray-500">{openUser.last_order ?? '— no recent orders'}</div>
                      </div>
                      <div className="text-sm">Delivered</div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-6">
                <h3 className="font-medium">Activity timeline</h3>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <div>Signed up: {new Date(openUser.signup).toLocaleString()}</div>
                  <div>Last login: {openUser.last_order ? new Date(openUser.last_order).toLocaleString() : '—'}</div>
                  <div>Notes: No internal notes (demo)</div>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="font-medium">Quick actions</h3>
                <div className="mt-3 flex gap-3">
                  <button onClick={() => { setUsers((us) => us.map((x) => x.id === openUser.id ? { ...x, status: x.status === 'active' ? 'blocked' : 'active' } : x)); setOpenUser(null); }} className="px-3 py-2 rounded bg-yellow-100 text-yellow-800">Toggle block</button>
                  <button onClick={() => { alert('Sent message (demo)'); }} className="px-3 py-2 rounded bg-indigo-600 text-white">Send message</button>
                </div>
              </section>

              <div className="mt-6">
                <h3 className="font-medium">Spending (12 months)</h3>
                <MiniSparkline points={[0, 1200, 800, 2000, 1600, 400, 600, 1200, 1800, 2200, 1200, 900]} />
              </div>

            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && openUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded shadow p-6 max-w-lg w-full">
              <h3 className="text-lg font-semibold">Confirm delete</h3>
              <p className="text-sm text-gray-600 mt-2">This will soft-delete the user <strong>{openUser.name}</strong>. Records are retained for 30 days before permanent purge (demo).</p>
              <div className="mt-4 flex items-center gap-3 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-2 rounded bg-gray-100">Cancel</button>
                <button onClick={() => softDeleteUser(openUser.id)} className="px-3 py-2 rounded bg-red-600 text-white">Delete</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


/* ---------- Small UI helper components ---------- */
function MetricCard({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function MiniSparkline({ points = [] }) {
  // Simple SVG sparkline — points: array of numbers
  const w = 320;
  const h = 80;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  let path = '';
  points.forEach((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / (max - min || 1)) * h;
    path += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <path d={path} fill="none" strokeWidth="2" strokeOpacity="0.9" stroke="#6366f1" />
    </svg>
  );
}
