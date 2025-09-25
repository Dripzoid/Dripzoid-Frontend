/*
UserManagementPanel.jsx
Rewritten to match the look-and-feel, conventions and utility constants used in `ProductsAdmin.jsx`.

Features implemented:
- Top-level stats grid (total, active, inactive, admins etc.) with motion animations
- Users list with search, pagination, sort, filters and an actions column
- Admins section showing admin accounts and placeholder admin actions
- Update Users section with search-by-name/ID, role filter, sort and inline role update
- User view modal (complete details + six requested stats)
- User edit modal for updating role/status

Notes:
- Uses the same Tailwind utility constants as ProductsAdmin.jsx for consistent theming
- Uses `api` helper (assumes ../utils/api exists and works like ProductsAdmin)
- Expects endpoints: /api/admin/users (list), /api/admin/users/:id (single), /api/admin/users/:id (PUT), /api/admin/stats (users-related stats). Adjust endpoints if your backend differs.
- Dark mode and B/W theme styling follow the pattern used in ProductsAdmin.jsx
*/

import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users as UsersIcon,
  Shield,
  Key,
} from "lucide-react";

/* ======= STYLE CONSTANTS (copied from ProductsAdmin.jsx for consistency) ======= */
const inputCls =
  "w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black dark:focus:ring-white transition";
const textareaCls = inputCls + " resize-none";
const btnPrimaryCls =
  "px-4 py-2 rounded-lg shadow-sm bg-black text-white dark:bg-white dark:text-black hover:scale-[1.02] transition-transform disabled:opacity-60";
const btnSecondaryCls =
  "px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition";
const cardCls =
  "p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition";

/* ======= Helpers ======= */
const normalizeResponse = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === "object") {
    if (res.data.data || typeof res.data.total !== "undefined") return res.data;
    return res.data;
  }
  return res;
};

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n);

/* ======= User View Modal ======= */
function UserViewModal({ user, onClose }) {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[92vh] overflow-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-semibold">{user.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Joined: {user.createdAt ?? user.created_at ?? "—"}</div>
          </div>
          <div>
            <button onClick={onClose} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700">Close</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-gray-100 dark:border-gray-800 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">User ID</div>
                <div className="font-medium mt-1">{user.id}</div>
              </div>
              <div className="p-3 border border-gray-100 dark:border-gray-800 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Gender</div>
                <div className="font-medium mt-1">{user.gender ?? "—"}</div>
              </div>

              <div className="p-3 border border-gray-100 dark:border-gray-800 rounded col-span-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                <div className="font-medium mt-1">{user.email}</div>
              </div>

              <div className="p-3 border border-gray-100 dark:border-gray-800 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Role</div>
                <div className="font-medium mt-1 capitalize">{user.role}</div>
              </div>

              <div className="p-3 border border-gray-100 dark:border-gray-800 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                <div className="font-medium mt-1">{user.status}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">Key Stats</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Spend</div>
                <div className="text-lg font-bold">₹ {fmt(user.totalSpend ?? user.total_spend ?? 0)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Orders</div>
                <div className="text-lg font-bold">{fmt(user.totalOrders ?? user.total_orders ?? 0)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Successful Orders</div>
                <div className="text-lg font-bold">{fmt(user.successfulOrders ?? user.successful_orders ?? 0)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Cancelled / Returns</div>
                <div className="text-lg font-bold">{fmt(user.cancelledOrders ?? user.cancelled_orders ?? 0)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">In-progress Orders</div>
                <div className="text-lg font-bold">{fmt(user.inProgressOrders ?? user.in_progress_orders ?? 0)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Coupon Savings</div>
                <div className="text-lg font-bold">₹ {fmt(user.couponSavings ?? user.coupon_savings ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional details (if any) */}
        <div className="mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">Last active: {user.lastActive ?? user.last_active ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}

/* ======= User Edit Modal (role/status) ======= */
function UserEditModal({ user, onClose, onSave }) {
  const [local, setLocal] = useState(user || {});
  useEffect(() => setLocal(user || {}), [user]);

  if (!user) return null;

  const handleSave = async () => {
    if (typeof onSave === "function") await onSave(local);
    onClose && onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">Edit user: {user.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Change role or status</div>
          </div>
          <div>
            <button onClick={onClose} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700">Close</button>
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
          <button onClick={onClose} className={btnSecondaryCls}>Cancel</button>
          <button onClick={handleSave} className={btnPrimaryCls}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ======= Main Component ======= */
export default function UserManagementPanel() {
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, admins: 0 });

  // controls
  const [showUsers, setShowUsers] = useState(true);
  const [showAdmins, setShowAdmins] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);

  const [sortBy, setSortBy] = useState("newest");

  /* ======= Fetchers ======= */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/users", { search: q, page, limit, sort: sortBy }, true);
      const body = normalizeResponse(res);

      let list = [];
      let total = 0;
      if (Array.isArray(body)) list = body;
      else if (Array.isArray(body.data)) {
        list = body.data;
        total = Number(body.total ?? body.totalCount ?? 0);
      } else if (Array.isArray(body.users)) {
        list = body.users;
        total = Number(body.total ?? 0);
      } else {
        const arr = Object.values(body).find((v) => Array.isArray(v));
        if (arr) list = arr;
      }

      setUsers(list || []);
      setTotalPages(limit === 999999 ? 1 : Math.max(1, Math.ceil((total || list.length || 0) / (limit || 20))));
    } catch (err) {
      console.error("fetchUsers error:", err);
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [q, page, limit, sortBy]);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/users?role=admin", {}, true);
      const body = normalizeResponse(res);
      const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : body.users ?? [];
      setAdmins(list || []);
    } catch (err) {
      console.error("fetchAdmins error:", err);
      setAdmins([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/stats/users", {}, true);
      const body = normalizeResponse(res);
      const total = Number(body.total ?? body.totalUsers ?? 0);
      const active = Number(body.active ?? body.activeUsers ?? 0);
      const inactive = Number(body.inactive ?? body.inactiveUsers ?? 0);
      const adminsCount = Number(body.admins ?? body.totalAdmins ?? 0);
      setStats({ total, active, inactive, admins: adminsCount });
    } catch (err) {
      console.error("fetchStats error:", err);
      setStats({ total: 0, active: 0, inactive: 0, admins: 0 });
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAdmins();
  }, [fetchStats, fetchAdmins]);

  useEffect(() => {
    if (showUsers) fetchUsers();
  }, [fetchUsers, showUsers]);

  /* ======= Actions ======= */
  const openView = async (u) => {
    // if we have only id, fetch full user
    if (u && u.id && (!u.email || !u.totalOrders)) {
      try {
        const res = await api.get(`/api/admin/users/${u.id}`, {}, true);
        const body = normalizeResponse(res);
        const fetched = body.data && typeof body.data === "object" ? body.data : body;
        setViewUser(fetched);
      } catch (err) {
        console.error("fetch user details failed:", err);
        setViewUser(u);
      }
    } else {
      setViewUser(u);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete user? This will remove the user permanently.")) return;
    try {
      await api.delete(`/api/admin/users/${id}`, true);
      await Promise.all([fetchUsers(), fetchStats(), fetchAdmins()]);
    } catch (err) {
      console.error("delete user failed:", err);
      alert("Failed to delete. See console.");
    }
  };

  const handleUpdateUser = async (u) => {
    try {
      const payload = { role: u.role, status: u.status };
      await api.put(`/api/admin/users/${u.id}`, payload, true);
      await Promise.all([fetchUsers(), fetchStats(), fetchAdmins()]);
    } catch (err) {
      console.error("update user failed:", err);
      alert("Failed to update user. See console.");
    }
  };

  /* ======= Derived values ======= */
  const filtered = useMemo(() => {
    let list = [...users];
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter((u) => (u.name || "").toLowerCase().includes(qq) || (u.id || "").toLowerCase().includes(qq) || (u.email || "").toLowerCase().includes(qq));
    }
    return list;
  }, [users, q]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Users", value: stats.total, icon: UsersIcon },
          { label: "Active", value: stats.active, icon: Shield },
          { label: "Inactive", value: stats.inactive, icon: Key },
          { label: "Admins", value: stats.admins, icon: UsersIcon },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: i * 0.05 }} className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-black text-white">
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{fmt(s.value)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button onClick={() => { setShowUsers(true); setShowAdmins(false); setShowUpdate(false); }} className={`px-3 py-2 rounded ${showUsers ? "border border-black dark:border-white" : ""}`}>Users</button>
          <button onClick={() => { setShowUsers(false); setShowAdmins(true); setShowUpdate(false); }} className={`px-3 py-2 rounded ${showAdmins ? "border border-black dark:border-white" : ""}`}>Admins</button>
          <button onClick={() => { setShowUsers(false); setShowAdmins(false); setShowUpdate(true); }} className={`px-3 py-2 rounded ${showUpdate ? "border border-black dark:border-white" : ""}`}>Update Users</button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total: {stats.total}</div>
        </div>
      </div>

      {/* Users List */}
      {showUsers && (
        <div className={cardCls}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, id or email..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>

            <div className="flex items-center gap-3">
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {[10, 20, 50, 100].map((s) => <option key={s} value={s}>{s} per page</option>)}
                <option value={999999}>Show All</option>
              </select>

              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="newest">Newest</option>
                <option value="name_asc">Name A → Z</option>
                <option value="name_desc">Name Z → A</option>
                <option value="most_spend">Top spenders</option>
              </select>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">User ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Gender</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No users found</td></tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 text-sm">{u.id}</td>
                      <td className="px-4 py-3 text-sm">{u.name}</td>
                      <td className="px-4 py-3 text-sm">{u.gender ?? "—"}</td>
                      <td className="px-4 py-3 text-sm capitalize">{u.role}</td>
                      <td className="px-4 py-3 text-sm">{u.status}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openView(u)} className="p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setEditUser(u)} className="p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(u.id)} className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900 text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && limit !== 999999 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Prev</button>
              <span className="text-gray-700 dark:text-gray-300">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Admins */}
      {showAdmins && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Admin Management</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">List of admin users and actions</div>
            </div>
            <div>
              <button className={`${btnSecondaryCls}`} onClick={() => setShowAdmins(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {admins.length === 0 && <div className="md:col-span-3 text-sm text-gray-500">No admin users found.</div>}
            {admins.map((a) => (
              <div key={a.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{a.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{a.id}</div>
                  </div>
                  <div className="space-y-2 text-right">
                    <button onClick={() => setEditUser(a)} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs">Edit</button>
                    <button className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs">Disable</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update Users */}
      {showUpdate && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Update Users</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Search, sort and update user roles</div>
            </div>
            <div className="flex items-center gap-2">
              <input placeholder="Search by name or ID" className={inputCls} onChange={(e) => setQ(e.target.value)} />
              <select onChange={(e) => setSortBy(e.target.value)} className={inputCls}>
                <option value="name">Sort: Name</option>
                <option value="role">Sort: Role</option>
                <option value="status">Sort: Status</option>
              </select>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-xs text-gray-500">User ID</th>
                  <th className="px-4 py-3 text-xs text-gray-500">Name</th>
                  <th className="px-4 py-3 text-xs text-gray-500">Role</th>
                  <th className="px-4 py-3 text-xs text-gray-500">Update Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 text-sm">{u.id}</td>
                    <td className="px-4 py-3 text-sm">{u.name}</td>
                    <td className="px-4 py-3 text-sm capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-sm">
                      <select defaultValue={u.role} onChange={async (e) => { const role = e.target.value; await handleUpdateUser({ ...u, role }); }} className="px-2 py-1 border border-gray-200 dark:border-gray-800 rounded bg-transparent">
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
        </div>
      )}

      {/* Modals */}
      <UserViewModal user={viewUser} onClose={() => setViewUser(null)} />
      <UserEditModal user={editUser} onClose={() => setEditUser(null)} onSave={handleUpdateUser} />
    </div>
  );
}
