import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Download,
  Copy,
  Settings,
  Check,
  X,
  Activity,
  BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * CouponManager
 * - Updated UI & Tailwind utility classes for better contrast and accessibility
 * - Removed local theme toggle (assumes global theme toggle in nav using `dark` class)
 * - Centralized button/input classes, improved focus states, hover states, and
 *   action affordances (active toggle is rendered as a visible button)
 */

const STORAGE_KEY = "coupons_v1";
const AUDIT_KEY = "coupon_audit_v1";

/* ---------- Helpers ---------- */
function uid(prefix = "c_") {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load from storage", e);
    return fallback;
  }
}

function generateCode({ prefix = "", length = 6, pattern = "alnum" } = {}) {
  const alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const pool = pattern === "alpha" ? alph : pattern === "num" ? nums : alph + nums;
  let s = "";
  for (let i = 0; i < length; i++) s += pool[Math.floor(Math.random() * pool.length)];
  return (prefix ? `${prefix}-` : "") + s;
}

function csvEscape(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* ---------- Mock sample data on first load ---------- */
function seedCoupons() {
  const base = [
    {
      id: uid(),
      code: "WELCOME-10",
      type: "percentage",
      amount: 10,
      min_purchase: 0,
      usage_limit: 1000,
      used: 12,
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: null,
      active: true,
      applies_to: "all",
      created_at: nowISO(),
      updated_at: nowISO(),
      metadata: { description: "New user discount" },
    },
    {
      id: uid(),
      code: "SHIPFREE",
      type: "fixed",
      amount: 50,
      min_purchase: 500,
      usage_limit: 500,
      used: 120,
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: null,
      active: true,
      applies_to: "shipping",
      created_at: nowISO(),
      updated_at: nowISO(),
      metadata: { description: "Free shipping over ₹500" },
    },
  ];
  return base;
}

/* ---------- Component ---------- */
export default function CouponManager() {
  const [coupons, setCoupons] = useState(() => loadFromStorage(STORAGE_KEY, null) || seedCoupons());
  const [audit, setAudit] = useState(() => loadFromStorage(AUDIT_KEY, []));
  const [query, setQuery] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // all, active, inactive
  const [filterType, setFilterType] = useState("all"); // all, percentage, fixed
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Centralized, modern Tailwind classes for consistent UX
  const inputCls =
    "w-full px-3 py-2 rounded-lg border text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-shadow shadow-sm dark:placeholder-gray-500" +
    " border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 focus:ring-gray-300 dark:focus:ring-gray-700";

  const selectCls =
    "px-3 py-2 rounded-lg border text-sm transition shadow-sm border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700";

  const btnPrimary =
    "inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700";

  const btnGhost =
    "inline-flex items-center gap-2 bg-transparent px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-gray-700";

  const actionBtn =
    "p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-gray-700";

  useEffect(() => {
    saveToStorage(STORAGE_KEY, coupons);
  }, [coupons]);

  useEffect(() => {
    saveToStorage(AUDIT_KEY, audit);
  }, [audit]);

  /* Derived */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coupons.filter((c) => {
      if (filterActive === "active" && !c.active) return false;
      if (filterActive === "inactive" && c.active) return false;
      if (filterType !== "all" && c.type !== filterType) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        (c.metadata && c.metadata.description && c.metadata.description.toLowerCase().includes(q))
      );
    });
  }, [coupons, query, filterActive, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  /* --------- CRUD actions (local) --------- */
  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(coupon) {
    setEditing(coupon);
    setShowModal(true);
  }

  function saveCoupon(payload) {
    if (payload.id) {
      setCoupons((prev) => prev.map((p) => (p.id === payload.id ? { ...p, ...payload, updated_at: nowISO() } : p)));
      pushAudit(payload.id, `Edited coupon ${payload.code}`);
    } else {
      const newC = { ...payload, id: uid(), created_at: nowISO(), updated_at: nowISO(), used: 0 };
      setCoupons((prev) => [newC, ...prev]);
      pushAudit(newC.id, `Created coupon ${newC.code}`);
    }
    setShowModal(false);
  }

  function toggleActive(id) {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active, updated_at: nowISO() } : c)));
    pushAudit(id, `Toggled active`);
  }

  function softDelete(id) {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    pushAudit(id, `Deleted coupon`);
    setSelected(new Set());
  }

  function bulkAction(action) {
    if (action === "delete") {
      setCoupons((prev) => prev.filter((c) => !selected.has(c.id)));
      pushAudit(null, `Bulk deleted ${selected.size} coupons`);
      setSelected(new Set());
    } else if (action === "enable") {
      setCoupons((prev) => prev.map((c) => (selected.has(c.id) ? { ...c, active: true, updated_at: nowISO() } : c)));
      pushAudit(null, `Bulk enabled ${selected.size} coupons`);
    } else if (action === "disable") {
      setCoupons((prev) => prev.map((c) => (selected.has(c.id) ? { ...c, active: false, updated_at: nowISO() } : c)));
      pushAudit(null, `Bulk disabled ${selected.size} coupons`);
    }
  }

  /* ---------- Audit ---------- */
  function pushAudit(id, message) {
    const item = { id: uid("a_"), coupon_id: id, message, at: nowISO() };
    setAudit((prev) => [item, ...prev.slice(0, 199)]);
  }

  /* ---------- CSV import/export ---------- */
  function exportCSV(list = coupons) {
    const headers = [
      "id",
      "code",
      "type",
      "amount",
      "min_purchase",
      "usage_limit",
      "used",
      "starts_at",
      "ends_at",
      "active",
      "applies_to",
      "metadata_description",
      "created_at",
      "updated_at",
    ];
    const rows = [headers.join(",")];
    for (const c of list) {
      rows.push(
        headers
          .map((h) => {
            if (h === "metadata_description") return csvEscape(c.metadata?.description);
            return csvEscape(c[h]);
          })
          .join(",")
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupons_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushAudit(null, "Exported coupons CSV");
  }

  function importCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim());
      const parsed = lines.slice(1).map((line) => {
        const parts = line.split(",");
        const obj = {};
        for (let i = 0; i < headers.length; i++) {
          obj[headers[i]] = parts[i] || "";
        }
        return obj;
      });
      // Basic mapping
      const mapped = parsed.map((p) => ({
        id: p.id || uid(),
        code: p.code || generateCode({ length: 6 }),
        type: p.type || "percentage",
        amount: Number(p.amount) || 0,
        min_purchase: Number(p.min_purchase) || 0,
        usage_limit: Number(p.usage_limit) || 0,
        used: Number(p.used) || 0,
        starts_at: p.starts_at || null,
        ends_at: p.ends_at || null,
        active: p.active === "true" || p.active === true,
        applies_to: p.applies_to || "all",
        metadata: { description: p.metadata_description || "" },
        created_at: p.created_at || nowISO(),
        updated_at: p.updated_at || nowISO(),
      }));
      setCoupons((prev) => [...mapped, ...prev]);
      pushAudit(null, `Imported ${mapped.length} coupons from CSV`);
    };
    reader.readAsText(file);
  }

  /* ---------- UI helpers ---------- */
  function toggleSelect(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function clearFilters() {
    setQuery("");
    setFilterActive("all");
    setFilterType("all");
  }

  /* ---------- Mock analytics ---------- */
  const analyticsData = useMemo(() => {
    const days = 14;
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push({ date: d.toISOString().slice(0, 10), redemptions: Math.floor(Math.random() * 40) });
    }
    return arr;
  }, [coupons.length]);

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen p-6 bg-white text-black dark:bg-black dark:text-white transition-colors">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Coupon Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create, edit and analyze discount coupons</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button onClick={openCreate} className={btnPrimary} aria-label="Create coupon">
              <Plus size={16} /> Create coupon
            </button>
            <div className="relative inline-flex">
              <button
                onClick={() => exportCSV(filtered)}
                className={btnGhost}
                title="Export filtered coupons"
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: controls & analytics */}
        <div className="col-span-1 space-y-4">
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <Search size={16} className="text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by code or description"
                className="bg-transparent outline-none flex-1 text-sm placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button onClick={clearFilters} className="text-sm text-gray-500 dark:text-gray-400">
                Clear
              </button>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className={selectCls}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectCls}>
                <option value="all">All types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
              <button
                onClick={() => {
                  const file = document.createElement("input");
                  file.type = "file";
                  file.accept = ".csv";
                  file.onchange = (e) => importCSV(e.target.files[0]);
                  file.click();
                }}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900"
              >
                Import CSV
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Last 14 days</div>
                  <div className="font-medium">Redemptions</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total: {coupons.reduce((s, c) => s + (c.used || 0), 0)}</div>
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={analyticsData}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="redemptions" stroke="#111827" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Summary</div>
                  <div className="font-medium">{coupons.length} coupons</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active: {coupons.filter((c) => c.active).length}</div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <div>Top coupon: {coupons[0]?.code || "—"}</div>
              <div>Avg usage: {Math.round((coupons.reduce((s, c) => s + (c.used || 0), 0) / Math.max(1, coupons.length)) * 10) / 10}</div>
            </div>
          </div>
        </div>

        {/* Right: main table */}
        <div className="col-span-2">
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">Showing</div>
                <div className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-sm">{filtered.length} results</div>
              </div>

              <div className="flex items-center gap-2">
                <select onChange={(e) => bulkAction(e.target.value)} className={selectCls}>
                  <option>Bulk actions</option>
                  <option value="enable">Enable</option>
                  <option value="disable">Disable</option>
                  <option value="delete">Delete</option>
                </select>
                <button onClick={() => exportCSV(Array.from(selected).length ? coupons.filter((c) => selected.has(c.id)) : coupons)} className={btnGhost}>
                  <Download size={16} /> Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-3 pl-1 w-6"><input type="checkbox" aria-label="Select page" checked={pageData.every((c) => selected.has(c.id)) && pageData.length > 0} onChange={(e) => {
                      if (e.target.checked) {
                        const next = new Set(selected);
                        pageData.forEach((c) => next.add(c.id));
                        setSelected(next);
                      } else {
                        const next = new Set(selected);
                        pageData.forEach((c) => next.delete(c.id));
                        setSelected(next);
                      }
                    }} /></th>
                    <th className="py-3">Code</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3">Used</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-3 pl-1"><input type="checkbox" aria-label={`Select ${c.code}`} checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                      <td className="py-3">
                        <div className="font-medium">{c.code}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{c.metadata?.description || "—"}</div>
                      </td>
                      <td className="py-3 text-sm capitalize">{c.type}</td>
                      <td className="py-3 text-sm">{c.type === "percentage" ? `${c.amount}%` : `₹${c.amount}`}</td>
                      <td className="py-3 text-sm">{c.used}/{c.usage_limit || "—"}</td>
                      <td className="py-3 text-sm">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${c.active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-800/30" : "bg-gray-100 text-gray-600 dark:bg-gray-800"}`}>
                          {c.active ? <Check size={12} /> : <X size={12} />}
                          <span>{c.active ? "Active" : "Inactive"}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { navigator.clipboard.writeText(c.code); pushAudit(c.id, `Copied code ${c.code}`); }} className={actionBtn} title="Copy code">
                            <Copy size={14} />
                          </button>

                          <button onClick={() => openEdit(c)} className={actionBtn} title="Edit coupon">
                            <Edit3 size={14} />
                          </button>

                          {/* Active toggle presented as a clear button for UX */}
                          <button onClick={() => toggleActive(c.id)} className={`px-3 py-1 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${c.active ? "bg-emerald-700 text-white dark:bg-emerald-600" : "bg-gray-100 text-gray-700 dark:bg-gray-800"}`} title={c.active ? "Disable" : "Enable"}>
                            {c.active ? "Enabled" : "Enable"}
                          </button>

                          <button onClick={() => softDelete(c.id)} className={`${actionBtn} text-red-600`} title="Delete coupon">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div>
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded-md border" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </button>
                <button className="px-3 py-1 rounded-md border" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Audit log */}
          <div className="mt-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Audit</div>
                  <div className="text-sm font-medium">Recent changes</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{audit.length} items</div>
            </div>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 max-h-48 overflow-y-auto">
              {audit.map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="text-xs w-28 text-gray-400">{a.at.slice(0, 19).replace("T", " ")}</div>
                  <div>{a.message}</div>
                </div>
              ))}
              {audit.length === 0 && <div className="text-xs">No audit entries yet.</div>}
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <Modal onClose={() => setShowModal(false)}>
            <CouponForm editing={editing} onCancel={() => setShowModal(false)} onSave={saveCoupon} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------- Modal & Form Components ----------------- */

function Modal({ children, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
        {children}
      </motion.div>
    </motion.div>
  );
}

function CouponForm({ editing, onCancel, onSave }) {
  const [code, setCode] = useState(editing?.code || "");
  const [type, setType] = useState(editing?.type || "percentage");
  const [amount, setAmount] = useState(editing?.amount || 0);
  const [min, setMin] = useState(editing?.min_purchase || 0);
  const [limit, setLimit] = useState(editing?.usage_limit || 0);
  const [startsAt, setStartsAt] = useState(editing?.starts_at || new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(editing?.ends_at || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [appliesTo, setAppliesTo] = useState(editing?.applies_to || "all");
  const [desc, setDesc] = useState(editing?.metadata?.description || "");
  const [prefix, setPrefix] = useState("");
  const [length, setLength] = useState(6);
  const [pattern, setPattern] = useState("alnum");

  function handleGenerate() {
    const g = generateCode({ prefix: prefix.trim(), length: Number(length) || 6, pattern });
    setCode(g);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!code) return alert("Please enter a code");
    const payload = {
      id: editing?.id,
      code: code.trim().toUpperCase(),
      type,
      amount: Number(amount),
      min_purchase: Number(min),
      usage_limit: Number(limit),
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      active,
      applies_to: appliesTo,
      metadata: { description: desc },
    };
    onSave(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{editing ? "Edit coupon" : "Create coupon"}</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">Define coupon details</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { navigator.clipboard.writeText(code); }} className="px-3 py-1 border rounded-md">Copy</button>
          <button type="button" onClick={() => { setCode(""); setPrefix(""); setLength(6); setPattern("alnum"); }} className="px-3 py-1 border rounded-md">Reset</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="text-sm">Minimum purchase</label>
          <input type="number" value={min} onChange={(e) => setMin(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="text-sm">Usage limit</label>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="text-sm">Applies to</label>
          <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} className={selectCls}>
            <option value="all">All products</option>
            <option value="shipping">Shipping</option>
            <option value="category">Category</option>
            <option value="product">Specific products</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Starts</label>
          <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="text-sm">Ends</label>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="text-sm">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} />
        </div>

        <div className="col-span-1 md:col-span-2 p-3 rounded-lg border bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Generator</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Quickly create a randomized code</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input placeholder="prefix (eg: SALE)" value={prefix} onChange={(e) => setPrefix(e.target.value)} className={inputCls} />
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} className={inputCls} />
            <select value={pattern} onChange={(e) => setPattern(e.target.value)} className={selectCls}>
              <option value="alnum">AlphaNumeric</option>
              <option value="alpha">Alphabetic</option>
              <option value="num">Numeric</option>
            </select>
            <button type="button" onClick={handleGenerate} className="px-3 py-2 rounded-lg border">Generate</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border">Cancel</button>
        <button type="submit" className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">Save</button>
      </div>
    </form>
  );
}

/* ----------------- End of file ----------------- */
