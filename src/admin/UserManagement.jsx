/**
 * UserManagementPanel.jsx
 *
 * - Shows only these 6 stats: Total Users, Active Users, Inactive Users,
 *   Male Users, Female Users, Other Users
 * - Theme friendly (Tailwind light/dark using `dark:` utilities)
 * - Orders / Cart / Wishlist are rendered inside the User View Modal **only**
 *   when their respective tab is clicked
 * - Browse / Update / Bulk buttons toggle the appropriate sections
 *
 * Dependencies:
 *   react, lucide-react, tailwindcss (dark mode via `class` strategy recommended)
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Edit,
  Users as UsersIcon,
  Shield,
  Key,
  RefreshCw,
  Heart,
  Box,
  Trash2,
} from "lucide-react";

/* ===== STYLE CONSTANTS ===== */
const inputCls =
  "w-full p-3 rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0b1220] text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0 transition";
const btnPillWhite =
  "px-4 py-2 rounded-full bg-white text-black shadow-sm border border-gray-200 hover:brightness-95 transition";
const btnPillBlack =
  "px-4 py-2 rounded-full bg-[#0b1220] text-white border border-gray-800 hover:brightness-95 transition";

/* ===== DEMO DATA ===== */
const DEMO_USERS = [
  {
    id: "U1001",
    name: "Asha Rao",
    email: "asha.rao@example.com",
    gender: "Female",
    role: "customer",
    status: "active",
    totalSpend: 1299.5,
    totalOrders: 14,
    successfulOrders: 12,
    cancelledOrders: 1,
    inProgressOrders: 1,
    couponSavings: 45.0,
    createdAt: "2024-09-12",
    lastActive: "2025-09-20",
    orders: [
      { id: "O2001", item: "White T-shirt", amount: 499, status: "Delivered", date: "2025-04-01" },
      { id: "O2002", item: "Running Shoes", amount: 800, status: "In progress", date: "2025-09-18" },
    ],
    cart: [
      { id: "C1", item: "Blue Jeans", amount: 1200 },
      { id: "C2", item: "Analog Watch", amount: 2500 },
    ],
    wishlist: [
      { id: "W1", item: "Leather Bag", amount: 999 },
      { id: "W2", item: "Wireless Headphones", amount: 1999 },
    ],
  },
  {
    id: "U1002",
    name: "Ravi Kumar",
    email: "ravi.kumar@example.com",
    gender: "Male",
    role: "admin",
    status: "active",
    totalSpend: 2350,
    totalOrders: 8,
    successfulOrders: 7,
    cancelledOrders: 0,
    inProgressOrders: 1,
    couponSavings: 120,
    createdAt: "2023-11-03",
    lastActive: "2025-09-22",
    orders: [{ id: "O2101", item: "Office Chair", amount: 2350, status: "Delivered", date: "2025-01-12" }],
    cart: [],
    wishlist: [],
  },
  {
    id: "U1003",
    name: "Priya Sen",
    email: "priya.sen@example.com",
    gender: "Female",
    role: "seller",
    status: "inactive",
    totalSpend: 0,
    totalOrders: 3,
    successfulOrders: 3,
    cancelledOrders: 0,
    inProgressOrders: 0,
    couponSavings: 0,
    createdAt: "2022-05-30",
    lastActive: "2024-12-11",
    orders: [{ id: "O2201", item: "Handmade Vase", amount: 450, status: "Delivered", date: "2024-03-05" }],
    cart: [{ id: "C3", item: "Artist Brushes", amount: 350 }],
    wishlist: [{ id: "W3", item: "Studio Lamp", amount: 1500 }],
  },
];

/* ===== Helper ===== */
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n);

/* ===== User View Modal (orders/cart/wishlist only when tab active) ===== */
function UserViewModal({ user, onClose }) {
  const [tab, setTab] = useState("orders");
  useEffect(() => setTab("orders"), [user]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl bg-white dark:bg-[#05111a] rounded-2xl p-6 shadow-2xl border border-gray-300 dark:border-gray-800 max-h-[92vh] overflow-auto text-gray-900 dark:text-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">{user.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Joined: {user.createdAt}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Last active: {user.lastActive}</div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">
              Close
            </button>
          </div>
        </div>

        {/* small stat tiles */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#071226] flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Spend</div>
              <div className="text-lg font-semibold">₹ {fmt(user.totalSpend ?? 0)}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-600 grid place-items-center">
              <Box className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#071226] flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Orders</div>
              <div className="text-lg font-semibold">{fmt(user.totalOrders ?? 0)}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 grid place-items-center">
              <UsersIcon className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#071226] flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Coupon Savings</div>
              <div className="text-lg font-semibold">₹ {fmt(user.couponSavings ?? 0)}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-500 grid place-items-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* tabs to show orders/cart/wishlist only on click */}
        <div className="mt-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-4">
            <button
              className={`py-3 ${tab === "orders" ? "border-b-2 border-black dark:border-white" : "text-gray-500 dark:text-gray-300"}`}
              onClick={() => setTab("orders")}
            >
              View Orders
            </button>
            <button
              className={`py-3 ${tab === "cart" ? "border-b-2 border-black dark:border-white" : "text-gray-500 dark:text-gray-300"}`}
              onClick={() => setTab("cart")}
            >
              View Cart
            </button>
            <button
              className={`py-3 ${tab === "wishlist" ? "border-b-2 border-black dark:border-white" : "text-gray-500 dark:text-gray-300"}`}
              onClick={() => setTab("wishlist")}
            >
              View Wishlist
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {tab === "orders" && (
            <>
              {(!user.orders || user.orders.length === 0) ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No orders for this user.</div>
              ) : (
                user.orders.map((o) => (
                  <div key={o.id} className="p-4 rounded-lg bg-gray-100 dark:bg-[#071226] flex justify-between items-center">
                    <div>
                      <div className="font-medium">{o.item}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Order ID: {o.id} • {o.date}</div>
                    </div>
                    <div className="text-sm">₹{o.amount} • {o.status}</div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === "cart" && (
            <>
              {(!user.cart || user.cart.length === 0) ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Cart is empty.</div>
              ) : (
                user.cart.map((c) => (
                  <div key={c.id} className="p-4 rounded-lg bg-gray-100 dark:bg-[#071226] flex justify-between items-center">
                    <div className="font-medium">{c.item}</div>
                    <div className="text-sm">₹{c.amount}</div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === "wishlist" && (
            <>
              {(!user.wishlist || user.wishlist.length === 0) ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Wishlist is empty.</div>
              ) : (
                user.wishlist.map((w) => (
                  <div key={w.id} className="p-4 rounded-lg bg-gray-100 dark:bg-[#071226] flex justify-between items-center">
                    <div className="font-medium">{w.item}</div>
                    <div className="text-sm">₹{w.amount}</div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== User Edit Modal (client-side demo update) ===== */
function UserEditModal({ user, onClose, onSave }) {
  const [local, setLocal] = useState(user || {});
  useEffect(() => setLocal(user || {}), [user]);

  if (!user) return null;

  const save = () => {
    onSave && onSave(local);
    onClose && onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-[#05111a] rounded-2xl p-6 shadow-2xl border border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">Edit user: {user.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Change role & status (demo only)</div>
          </div>
          <div>
            <button onClick={onClose} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">Close</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Role</div>
            <select value={local.role} onChange={(e) => setLocal({ ...local, role: e.target.value })} className={inputCls}>
              <option value="customer">customer</option>
              <option value="seller">seller</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
            <select value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value })} className={inputCls}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className={btnPillBlack}>Cancel</button>
          <button onClick={save} className={btnPillWhite}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Main Component ===== */
export default function UserManagementPanel() {
  const [users, setUsers] = useState(DEMO_USERS);
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);

  // which main section to show
  const [section, setSection] = useState("users"); // "users" | "admins" | "update"

  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("newest");
  const [range, setRange] = useState("overall");

  useEffect(() => {
    // placeholder for future fetch logic
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter((u) => u.status === "inactive").length;
    const male = users.filter((u) => (u.gender || "").toLowerCase() === "male").length;
    const female = users.filter((u) => (u.gender || "").toLowerCase() === "female").length;
    const other = total - male - female;
    return { total, active, inactive, male, female, other };
  }, [users]);

  const filtered = useMemo(() => {
    let list = [...users];
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(qq) ||
          (u.id || "").toLowerCase().includes(qq) ||
          (u.email || "").toLowerCase().includes(qq)
      );
    }

    if (sortBy === "name_asc") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "name_desc") list.sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === "most_spend") list.sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));

    return list.slice(0, limit === 999999 ? list.length : limit);
  }, [users, q, limit, sortBy]);

  const admins = useMemo(() => users.filter((u) => u.role === "admin"), [users]);

  /* Actions */
  const handleDelete = (id) => {
    if (!window.confirm("Delete user? (demo only)")) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSaveEdit = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  };

  const handleInlineRoleUpdate = (id, role) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  return (
    <div className="p-6">
      <div className="rounded-2xl bg-white dark:bg-[#051023] border border-gray-300 dark:border-gray-800 p-6 space-y-6">
        {/* Top row: Range tabs + Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setRange("overall")} className={range === "overall" ? btnPillWhite : btnPillBlack}>
              <span className="text-sm">📊 Overall</span>
            </button>
            <button onClick={() => setRange("monthly")} className={range === "monthly" ? btnPillWhite : btnPillBlack}>
              <span className="text-sm">📅 Monthly</span>
            </button>
            <button onClick={() => setRange("weekly")} className={range === "weekly" ? btnPillWhite : btnPillBlack}>
              <span className="text-sm">🗓 Weekly</span>
            </button>
            <button onClick={() => setRange("daywise")} className={range === "daywise" ? btnPillWhite : btnPillBlack}>
              <span className="text-sm">📆 Day Wise</span>
            </button>
          </div>

          <div>
            <button className="px-4 py-2 rounded-full bg-[#0b1220] text-white border border-gray-800">Refresh</button>
          </div>
        </div>

        {/* Stats grid: 6 required stats only */}
        <div className="rounded-xl border border-gray-300 dark:border-gray-800 p-6 bg-gray-50 dark:bg-[#071426]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard label="Total Users" value={stats.total} color="bg-green-500" />
            <StatCard label="Active Users" value={stats.active} color="bg-blue-500" />
            <StatCard label="Inactive Users" value={stats.inactive} color="bg-yellow-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Male Users" value={stats.male} color="bg-indigo-500" />
            <StatCard label="Female Users" value={stats.female} color="bg-pink-500" />
            <StatCard label="Other Users" value={stats.other} color="bg-gray-500" />
          </div>
        </div>

        {/* Action pills (now toggle sections) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className={section === "users" ? btnPillWhite : btnPillBlack}
              onClick={() => setSection("users")}
            >
              <Eye className="inline-block w-4 h-4 mr-2" /> Browse Users
            </button>

            <button
              className={section === "update" ? btnPillWhite : btnPillBlack}
              onClick={() => setSection("update")}
            >
              <Edit className="inline-block w-4 h-4 mr-2" /> Update Users
            </button>

            <button
              className={btnPillBlack}
              onClick={() => {
                // Bulk update placeholder — keep section or trigger real action
                alert("Bulk update (demo) - implement backend action");
              }}
            >
              <RefreshCw className="inline-block w-4 h-4 mr-2" /> Bulk Update
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-[420px]">
              <input
                placeholder="Search users (id / name / email)"
                className={inputCls}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-3 rounded-lg bg-white dark:bg-[#0b1220] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200">
              <option value="newest">Newest</option>
              <option value="name_asc">Name A → Z</option>
              <option value="name_desc">Name Z → A</option>
              <option value="most_spend">Top spenders</option>
            </select>

            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="p-3 rounded-lg bg-white dark:bg-[#0b1220] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200">
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
              <option value={999999}>Show All</option>
            </select>
          </div>
        </div>

        {/* Sections: Users / Admins / Update */}
        {section === "users" && (
          <div className="mt-4 overflow-auto rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#061122]">
            <table className="min-w-full text-left">
              <thead className="bg-gray-100 dark:bg-[#071426]">
                <tr>
                  <th className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">User ID</th>
                  <th className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">Name</th>
                  <th className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">Gender</th>
                  <th className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.gender}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.status}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setViewUser(u)}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black border border-gray-700"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>

                          <button
                            onClick={() => setEditUser(u)}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white border border-gray-700"
                          >
                            <Edit className="w-4 h-4" /> Edit
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm("Delete user? (demo)")) handleDelete(u.id);
                            }}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white border border-red-700"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {section === "admins" && (
          <div className="mt-4 rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#061122] p-4">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Admin Management</div>
            {admins.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No admin users found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {admins.map((a) => (
                  <div key={a.id} className="p-4 rounded-lg bg-gray-50 dark:bg-[#071226] border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{a.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{a.email}</div>
                        <div className="text-xs text-gray-400">{a.id}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setEditUser(a)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm">Edit</button>
                        <button onClick={() => alert("Disable admin (demo)")} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm">Disable</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "update" && (
          <div className="mt-4 overflow-auto rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#061122] p-4">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Update Users</div>

            <table className="min-w-full text-left">
              <thead className="bg-gray-100 dark:bg-[#071426]">
                <tr>
                  <th className="px-6 py-3 text-xs text-gray-600 dark:text-gray-400">User ID</th>
                  <th className="px-6 py-3 text-xs text-gray-600 dark:text-gray-400">Name</th>
                  <th className="px-6 py-3 text-xs text-gray-600 dark:text-gray-400">Role</th>
                  <th className="px-6 py-3 text-xs text-gray-600 dark:text-gray-400">Update Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.role}</td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={u.role}
                        onChange={(e) => handleInlineRoleUpdate(u.id, e.target.value)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#071226] text-gray-900 dark:text-gray-100"
                      >
                        <option value="customer">customer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserViewModal user={viewUser} onClose={() => setViewUser(null)} />
      <UserEditModal user={editUser} onClose={() => setEditUser(null)} onSave={handleSaveEdit} />
    </div>
  );
}

/* ===== StatCard Component ===== */
function StatCard({ label, value, color }) {
  return (
    <div className="p-6 rounded-lg bg-gray-50 dark:bg-[#071226] flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
        <div className="text-3xl font-bold mt-2">{value}</div>
      </div>
      <div className={`w-12 h-12 rounded-full ${color} grid place-items-center`}>
        <UsersIcon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}
