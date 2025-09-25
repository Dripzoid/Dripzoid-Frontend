/**
 * UserManagement.jsx
 *
 * Backend-integrated version (uses REACT_APP_API_BASE)
 * - All API calls routed through API_BASE (from .env REACT_APP_API_BASE)
 * - Uses cache: "no-store" for GETs to avoid 304/no-body issues
 * - Fetch /api/users, /api/admin/stats, /api/admin/orders/user/:id, /api/cart/:id, /api/wishlist/:id
 * - PUT /api/users/:id for updates, DELETE /api/users/:id for deletion
 *
 * Notes:
 * - If REACT_APP_API_BASE is not set, falls back to relative paths (e.g. "/api/users")
 * - No change to UI/styling — just wiring of API base
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Edit,
  Users as UsersIcon,
  Heart,
  Box,
  Trash2,
} from "lucide-react";

/* ===== API BASE helper (reads from .env) ===== */
const RAW_API_BASE = process.env.REACT_APP_API_BASE || "";
// normalize: remove trailing slash if present
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/$/, "") : "";

/** helper to build full url; if API_BASE is empty, returns the relative path */
function buildUrl(path) {
  // path should start with '/'
  return API_BASE ? `${API_BASE}${path}` : path;
}

/* ===== STYLE CONSTANTS ===== */
const inputCls =
  "w-full p-3 rounded-full border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0b1220] text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition";

// Base button style (fully rounded)
const btnBase =
  "inline-flex items-center gap-2 rounded-full font-medium transition-transform transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";

// Variants (theme-aware)
const btnWhite =
  `${btnBase} px-4 py-2 bg-white text-slate-900 border border-gray-200 shadow-sm hover:shadow-md dark:bg-gray-800 dark:text-white dark:border-gray-700`;
const btnDark =
  `${btnBase} px-4 py-2 bg-black text-white border border-gray-800 shadow-sm hover:shadow-md dark:bg-white dark:text-black dark:border-gray-200`;
const btnSmallDark =
  `${btnBase} px-3 py-1 text-sm bg-black text-white border border-gray-800 shadow-sm hover:brightness-110 dark:bg-white dark:text-black dark:border-gray-200`;
const btnSmallWhite =
  `${btnBase} px-3 py-1 text-sm bg-white text-slate-900 border border-gray-200 shadow-sm hover:brightness-95 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-700`;
const btnDanger =
  `${btnBase} px-3 py-1 text-sm bg-red-600 text-white border border-red-700 shadow-sm hover:bg-red-700`;
const btnToggle =
  `${btnBase} px-3 py-2 text-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-sm`;
const btnToggleActive =
  `${btnBase} px-3 py-2 text-sm bg-black dark:bg-white text-white dark:text-black border border-gray-800 dark:border-gray-200 shadow-md`;

/* ===== Helper ===== */
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n);

// check if a date string is within the last N days
function isDateWithinDays(dateStr, days = 7) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  const now = new Date();
  const diffMs = now - d;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

// determine if user had activity (order/cart/wishlist) within last N days
function userHasRecentActivity(user, days = 7) {
  if (!user) return false;
  const { orders = [], cart = [], wishlist = [] } = user;
  if (orders.some((o) => isDateWithinDays(o.date, days))) return true;
  if (cart.some((c) => isDateWithinDays(c.date, days))) return true;
  if (wishlist.some((w) => isDateWithinDays(w.date, days))) return true;
  return false;
}

/* ===== User View Modal (fetches orders/cart/wishlist on open) ===== */
function UserViewModal({ user, onClose }) {
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showOrders, setShowOrders] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  useEffect(() => {
    if (!user) return;
    setShowOrders(false);
    setShowCart(false);
    setShowWishlist(false);

    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [ordersRes, cartRes, wishRes] = await Promise.all([
          fetch(buildUrl(`/api/admin/orders/user/${user.id}`), { cache: "no-store" }),
          fetch(buildUrl(`/api/cart/${user.id}`), { cache: "no-store" }),
          fetch(buildUrl(`/api/wishlist/${user.id}`), { cache: "no-store" }),
        ]);

        const [ordersData, cartData, wishData] = await Promise.all([
          ordersRes.ok ? ordersRes.json() : [],
          cartRes.ok ? cartRes.json() : [],
          wishRes.ok ? wishRes.json() : [],
        ]);

        if (!mounted) return;
        setOrders(ordersData || []);
        setCart(cartData || []);
        setWishlist(wishData || []);
      } catch (err) {
        console.error("Error fetching user details", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-white/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl bg-white dark:bg-[#05111a] rounded-2xl p-6 shadow-2xl border border-gray-300 dark:border-gray-800 max-h-[92vh] overflow-auto text-gray-900 dark:text-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">{user.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Joined: {user.createdAt}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Last active: {user.lastActive}</div>
          </div>
          <button onClick={onClose} className={btnSmallWhite}>Close</button>
        </div>

        {/* SIX stat tiles */}
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
              <div className="text-xs text-gray-500 dark:text-gray-400">Successful Orders</div>
              <div className="text-lg font-semibold">{fmt(user.successfulOrders ?? 0)}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-500 grid place-items-center">
              <UsersIcon className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#071226] flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Cancelled / Returns</div>
              <div className="text-lg font-semibold">{fmt(user.cancelledOrders ?? 0)}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500 grid place-items-center">
              <Trash2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#071226] flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">In-progress Orders</div>
              <div className="text-lg font-semibold">{fmt(user.inProgressOrders ?? 0)}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-600 grid place-items-center">
              <Heart className="w-4 h-4 text-white" />
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

        {/* toggles */}
        <div className="mt-6 flex gap-3">
          <button onClick={() => setShowOrders((s) => !s)} className={`${showOrders ? btnToggleActive : btnToggle}`}>
            {showOrders ? "Hide Orders" : "View Orders"}
          </button>

          <button onClick={() => setShowCart((s) => !s)} className={`${showCart ? btnToggleActive : btnToggle}`}>
            {showCart ? "Hide Cart" : "View Cart"}
          </button>

          <button onClick={() => setShowWishlist((s) => !s)} className={`${showWishlist ? btnToggleActive : btnToggle}`}>
            {showWishlist ? "Hide Wishlist" : "View Wishlist"}
          </button>
        </div>

        {loading && <div className="mt-4 text-sm text-gray-500">Loading data...</div>}

        <div className="mt-4 space-y-3">
          {showOrders && (orders.length === 0 ? (
            <div className="text-sm text-gray-500">No orders for this user.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="p-4 rounded-lg bg-gray-100 dark:bg-[#071226] flex justify-between items-center">
                <div>
                  <div className="font-medium">{o.item}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Order ID: {o.id} • {o.date}</div>
                </div>
                <div className="text-sm">₹{o.amount} • {o.status}</div>
              </div>
            ))
          ))}

          {showCart && (cart.length === 0 ? (
            <div className="text-sm text-gray-500">Cart is empty.</div>
          ) : (
            cart.map((c) => (
              <div key={c.id} className="p-4 rounded-lg bg-gray-100 dark:bg-[#071226] flex justify-between items-center">
                <div className="font-medium">{c.item}</div>
                <div className="text-sm">₹{c.amount}</div>
              </div>
            ))
          ))}

          {showWishlist && (wishlist.length === 0 ? (
            <div className="text-sm text-gray-500">Wishlist is empty.</div>
          ) : (
            wishlist.map((w) => (
              <div key={w.id} className="p-4 rounded-lg bg-gray-100 dark:bg-[#071226] flex justify-between items-center">
                <div className="font-medium">{w.item}</div>
                <div className="text-sm">₹{w.amount}</div>
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== User Edit Modal (calls PUT /api/users/:id) ===== */
function UserEditModal({ user, onClose, onSave }) {
  const [local, setLocal] = useState(user || {});
  const [saving, setSaving] = useState(false);
  useEffect(() => setLocal(user || {}), [user]);

  if (!user) return null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(buildUrl(`/api/users/${user.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: local.role, status: local.status }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      const updated = await res.json();
      onSave && onSave(updated);
      onClose && onClose();
    } catch (err) {
      console.error("Update failed", err);
      alert("Failed to update user. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-white/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-[#05111a] rounded-2xl p-6 shadow-2xl border border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">Edit user: {user.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Change role & status</div>
          </div>
          <div>
            <button onClick={onClose} className={`${btnSmallWhite}`} aria-label="Close edit modal">Close</button>
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
            <div className="text-xs text-gray-500 mt-1">Note: Active/inactive shown in the table is derived from recent activity (last 7 days).</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className={btnSmallDark}>Cancel</button>
          <button onClick={save} className={btnWhite} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Main Component ===== */
export default function UserManagementPanel() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [viewUser, setViewUser] = useState(null); // object
  const [editUser, setEditUser] = useState(null);

  // which main section to show
  const [section, setSection] = useState("users"); // "users" | "admins" | "update"

  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("newest");

  const [loading, setLoading] = useState(false);

  async function refreshAll() {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(buildUrl("/api/users"), { cache: "no-store" }),
        fetch(buildUrl("/api/admin/stats"), { cache: "no-store" }),
      ]);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const statsData = statsRes.ok ? await statsRes.json() : {};
      setUsers(usersData || []);
      setStats(statsData || {});
    } catch (err) {
      console.error("Error loading data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  // compute stats; active/inactive determined by recent activity within 7 days
  const computedStats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => userHasRecentActivity(u, 7)).length;
    const inactive = total - active;

    return {
      total: stats.totalUsers ?? total,
      active: stats.activeUsers ?? active,
      inactive: stats.inactiveUsers ?? inactive,
      male: stats.maleUsers ?? stats.male ?? users.filter((u) => (u.gender || "").toLowerCase() === "male").length,
      female: stats.femaleUsers ?? stats.female ?? users.filter((u) => (u.gender || "").toLowerCase() === "female").length,
      other: stats.otherUsers ?? stats.other ?? total - (users.filter((u) => (u.gender || "").toLowerCase() === "male").length + users.filter((u) => (u.gender || "").toLowerCase() === "female").length),
    };
  }, [users, stats]);

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
  const handleDelete = async (id) => {
    if (!window.confirm("Delete user?")) return;
    try {
      const res = await fetch(buildUrl(`/api/users/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed. See console for details.");
    }
  };

  const handleSaveEdit = (updated) => {
    // updated should be the server response, but allow partial
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  };

  const handleInlineRoleUpdate = async (id, role) => {
    try {
      const res = await fetch(buildUrl(`/api/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    } catch (err) {
      console.error(err);
      alert("Failed to update role. See console for details.");
    }
  };

  return (
    <div className="p-6">
      <div className="rounded-2xl bg-white dark:bg-[#051023] border border-gray-300 dark:border-gray-800 p-6 space-y-6">
        {/* Stats grid: 6 required stats only */}
        <div className="rounded-xl border border-gray-300 dark:border-gray-800 p-6 bg-gray-50 dark:bg-[#071426]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard label="Total Users" value={computedStats.total} color="bg-green-500" />
            <StatCard label="Active Users" value={computedStats.active} color="bg-blue-500" />
            <StatCard label="Inactive Users" value={computedStats.inactive} color="bg-yellow-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Male Users" value={computedStats.male} color="bg-indigo-500" />
            <StatCard label="Female Users" value={computedStats.female} color="bg-pink-500" />
            <StatCard label="Other Users" value={computedStats.other} color="bg-gray-500" />
          </div>
        </div>

        {/* Action pills (Users / Admin Users / Update Users) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className={section === "users" ? btnWhite : btnDark} onClick={() => setSection("users")}>
              <Eye className="inline-block w-4 h-4 mr-2" /> Browse Users
            </button>

            <button className={section === "admins" ? btnWhite : btnDark} onClick={() => setSection("admins")}>
              <UsersIcon className="inline-block w-4 h-4 mr-2" /> Admin Users
            </button>

            <button className={section === "update" ? btnWhite : btnDark} onClick={() => setSection("update")}>
              <Edit className="inline-block w-4 h-4 mr-2" /> Update Users
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-[420px]">
              <input placeholder="Search users (id / name / email)" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-3 rounded-full bg-white dark:bg-[#0b1220] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200">
              <option value="newest">Newest</option>
              <option value="name_asc">Name A → Z</option>
              <option value="name_desc">Name Z → A</option>
              <option value="most_spend">Top spenders</option>
            </select>

            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="p-3 rounded-full bg-white dark:bg-[#0b1220] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200">
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
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No users found</td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const activeDerived = userHasRecentActivity(u, 7);
                    return (
                      <tr key={u.id} className="border-t border-gray-200 dark:border-gray-800">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{u.gender}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${activeDerived ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                            {activeDerived ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => setViewUser(u)} className={`${btnSmallDark}`}>
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View</span>
                            </button>

                            <button onClick={() => setEditUser(u)} className={`${btnSmallWhite}`}>
                              <Edit className="w-4 h-4" />
                              <span className="sr-only">Edit</span>
                            </button>

                            <button onClick={() => handleDelete(u.id)} className={`${btnDanger}`}>
                              <Trash2 className="w-4 h-4" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
                        <button onClick={() => setEditUser(a)} className={`${btnSmallWhite}`}>Edit</button>
                        <button onClick={() => alert("Disable admin (demo)")} className={`${btnSmallDark}`}>Disable</button>
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
                        className="px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#071226] text-gray-900 dark:text-gray-100"
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
      {viewUser && <UserViewModal user={viewUser} onClose={() => setViewUser(null)} />}
      {editUser && <UserEditModal user={editUser} onClose={() => setEditUser(null)} onSave={handleSaveEdit} />}
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
