// src/components/OrdersSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
  X,
  Truck,
  Trash2,
  Repeat,
  RefreshCw,
} from "lucide-react";

/**
 * OrdersSection (updated)
 *
 * Changes made per request:
 * - Removed all filters/search/date/limit controls. Only kept sorting based on statuses.
 * - Pagination retained.
 * - Orders displayed as full-width horizontal cards (image left, details right).
 * - Clicking a card (outside of internal action buttons) redirects to:
 *     https://dripzoid.com/order-details/:id
 * - Invoice download now uses POST /api/shipping/download-invoice and downloads the returned PDF blob.
 * - UI uses pure Tailwind CSS only.
 * - Kept tracking/SSE/polling logic intact.
 */

const API_BASE = process.env.REACT_APP_API_BASE || "";

/* ---------- small helpers ---------- */
function safeParseJSON(s) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};
const fmtCurrency = (n) => `₹${Number(Number(n || 0)).toLocaleString()}`;

/* escape HTML to avoid accidental injection from data */
const escapeHtml = (str) => {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const statusColor = (s) => {
  switch ((s || "").toLowerCase()) {
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900/30";
    case "shipped":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30";
    case "processing":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30";
    case "cancelled":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800/30";
  }
};

function SkeletonCard() {
  return (
    <div className="animate-pulse border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-3" />
      <div className="flex gap-3">
        <div className="h-28 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-full" />
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers (unchanged) ---------- */
const getImageFromItem = (item) => {
  if (!item) return "/placeholder.jpg";

  if (typeof item === "string" && item.startsWith("http")) return item;

  const directFields = ["image", "image_url", "img", "picture", "photo", "thumbnail", "thumbnail_url"];
  for (const f of directFields) {
    const v = item[f];
    if (typeof v === "string" && v.trim()) {
      const first = v.split(",").map((s) => s.trim()).find(Boolean);
      if (first) return first;
    }
    if (v && typeof v === "object" && v.url) return v.url;
  }

  if (item.images) {
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      if (typeof first === "string") return first.split(",").map((s) => s.trim()).find(Boolean) || first;
      if (first && first.url) return first.url;
    } else if (typeof item.images === "string") {
      return item.images.split(",").map((s) => s.trim()).find(Boolean) || item.images;
    } else if (item.images.url) {
      return item.images.url;
    }
  }

  if (item.media && Array.isArray(item.media) && item.media[0]) {
    const m = item.media[0];
    if (typeof m === "string") return m.split(",").map((s) => s.trim()).find(Boolean) || m;
    if (m.url) return m.url;
  }

  if (item.variant) {
    if (typeof item.variant === "string" && item.variant.startsWith("http")) return item.variant;
    if (item.variant.image) {
      return Array.isArray(item.variant.image) ? item.variant.image[0] : item.variant.image;
    }
    if (Array.isArray(item.variant.images) && item.variant.images[0]) {
      const v = item.variant.images[0];
      if (typeof v === "string") return v;
      if (v.url) return v.url;
    }
  }

  if (item.product) {
    if (item.product.image) {
      return Array.isArray(item.product.image) ? item.product.image[0] : item.product.image;
    }
    if (Array.isArray(item.product.images) && item.product.images[0]) {
      const v = item.product.images[0];
      if (typeof v === "string") return v;
      if (v.url) return v.url;
    }
    if (item.product.thumbnail) return item.product.thumbnail;
  }

  return "/placeholder.jpg";
};

const getOptionFromItem = (item, optionName) => {
  if (!item || !optionName) return null;
  const name = optionName.toLowerCase();

  if (Array.isArray(item.selected_options)) {
    const found = item.selected_options.find((o) => ((o?.name || "")).toLowerCase() === name);
    if (found) return found.value ?? found.val ?? found.option ?? null;
  }

  if (item.options && typeof item.options === "object" && !Array.isArray(item.options)) {
    const keys = Object.keys(item.options);
    const exact = keys.find((k) => k.toLowerCase() === name);
    if (exact) return item.options[exact];
    const includes = keys.find((k) => k.toLowerCase().includes(name));
    if (includes) return item.options[includes];
    if (item.options[name] != null) return item.options[name];
  }

  if (Array.isArray(item.options)) {
    const found = item.options.find((o) => (((o?.name || o?.option) || "").toLowerCase()) === name);
    if (found) return found.value ?? found.val ?? found.option ?? null;
  }

  if (Array.isArray(item.attributes)) {
    const found = item.attributes.find((o) => (((o?.name || o?.key) || "").toLowerCase()) === name);
    if (found) return found.value ?? found.val ?? found.option ?? null;
  }

  if (item.variant) {
    if (Array.isArray(item.variant.options)) {
      const found = item.variant.options.find((o) => ((o?.name || "").toLowerCase()) === name);
      if (found) return found.value ?? found.val ?? found.option ?? null;
    }
    if (Array.isArray(item.variant.attributes)) {
      const found = item.variant.attributes.find((o) => ((o?.name || o?.key) || "").toLowerCase() === name);
      if (found) return found.value ?? found.val ?? found.option ?? null;
    }
    if (item.variant[name]) return item.variant[name];
  }

  if (item[name]) return item[name];
  if (item.selectedColor && name === "color") return item.selectedColor;
  if ((item.selected_size || item.selectedSize) && name === "size") return item.selected_size ?? item.selectedSize;
  if (item.color && name === "color") return item.color;
  if (item.size && name === "size") return item.size;

  if (item.meta && typeof item.meta === "object") {
    const k = Object.keys(item.meta).find((k) => k.toLowerCase().includes(name));
    if (k) return item.meta[k];
  }

  return null;
};

const normalizeOrder = (o = {}) => {
  const total =
    Number(
      o.total ?? o.total_amount ?? o.total_price ?? o.order_total ?? o.amount ?? 0
    ) || 0;

  let items = [];
  if (Array.isArray(o.items)) items = o.items;
  else if (Array.isArray(o.order_items)) items = o.order_items;
  else if (Array.isArray(o.products)) items = o.products;
  else if (o.items && typeof o.items === "object") {
    items = [o.items];
  } else if (o.order_items && typeof o.order_items === "object") {
    items = [o.order_items];
  }

  const shipping_address =
    o.shipping_address != null
      ? typeof o.shipping_address === "string"
        ? safeParseJSON(o.shipping_address)
        : o.shipping_address
      : safeParseJSON(o.address) ?? null;

  return {
    id: o.id ?? o.order_id ?? o._id ?? null,
    status: (o.status ?? o.order_status ?? "").toString(),
    total,
    created_at: o.created_at || o.date || o.createdAt || o.order_date || null,
    items,
    products: o.products ?? null,
    shipping_address,
    subtotal: Number(o.subtotal ?? o.amount_subtotal ?? o.sub_total ?? total),
    shipping: Number(o.shipping ?? o.shipping_cost ?? 0),
    tax: Number(o.tax ?? o.tax_amount ?? 0),
    discount: Number(o.discount ?? o.discount_amount ?? 0),
    tracking: o.tracking ?? o.tracking_info ?? {},
    customer_name: o.customer_name ?? o.customer?.name ?? null,
    raw: o,
  };
};

const formatAddressLines = (addr) => {
  if (!addr) return "—";
  const parts = [];
  if (addr.line1) parts.push(addr.line1);
  if (addr.line2) parts.push(addr.line2);
  const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (addr.pincode || addr.postcode) parts.push(addr.pincode ?? addr.postcode);
  if (addr.country) parts.push(addr.country);
  return parts.join(", ");
};

/* ---------- main component ---------- */
export default function OrdersSection() {
  // query state - simplified per request (only status-based sorting + pagination)
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(12); // fixed page size for simplicity
  const [total, setTotal] = useState(0);
  const [statusSortMode, setStatusSortMode] = useState("priority"); // "priority" | "alpha"

  // ui state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const abortRef = useRef(null);
  const sseRef = useRef(null);
  const pollTimerRef = useRef(null);

  // fetch orders
  const fetchOrders = async () => {
    try {
      abortRef.current?.abort?.();
    } catch {}
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));

      const url = `${API_BASE}/api/user/orders${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = "Failed fetching orders";
        try {
          const j = txt ? JSON.parse(txt) : null;
          msg = j?.message || j?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }

      const arr =
        body?.data ??
        (Array.isArray(body) ? body : body?.orders ?? body?.results ?? []);
      const meta =
        body?.meta ??
        body?.pagination ??
        {
          total: Number(body?.total ?? (Array.isArray(arr) ? arr.length : 0)),
          page,
          pages: Math.max(
            1,
            Math.ceil(
              Number(body?.total ?? (Array.isArray(arr) ? arr.length : 0)) /
                (limit || 12)
            )
          ),
          limit,
        };

      const normalized = Array.isArray(arr) ? arr.map(normalizeOrder) : [];
      setOrders(normalized);
      setTotal(Number(meta.total ?? normalized.length ?? 0));
      setPage(Number(meta.page ?? page));
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("fetchOrders error:", err);
        setOrders([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    return () => abortRef.current?.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshKey]);

  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 12)));

  const openOrder = (order) => setSelectedOrder(order);
  const closeOrder = () => setSelectedOrder(null);

  // Sorting strictly based on statuses (per request)
  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    if (statusSortMode === "alpha") {
      copy.sort((a, b) =>
        (a.status || "").localeCompare(b.status || "", undefined, { sensitivity: "base" })
      );
      return copy;
    }

    // "priority" ordering: processing -> shipped -> out_for_delivery -> delivered -> cancelled -> others
    const priority = {
      processing: 1,
      packed: 2,
      shipped: 3,
      out_for_delivery: 4,
      "out for delivery": 4,
      delivered: 5,
      cancelled: 6,
    };
    copy.sort((a, b) => {
      const sa = (a.status || "").toLowerCase();
      const sb = (b.status || "").toLowerCase();
      const pa = priority[sa] ?? 99;
      const pb = priority[sb] ?? 99;
      if (pa !== pb) return pa - pb;
      // fallback to date (newest first) within same status
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return copy;
  }, [orders, statusSortMode]);

  // SSE / poll fallback (unchanged)
  const applyTrackingUpdate = (orderId, payload) => {
    if (!orderId) return;
    setOrders((prev) => {
      const next = [...prev];
      const ix = next.findIndex((o) => o?.id === orderId);
      if (ix < 0) return prev;
      const current = next[ix];
      const merged = {
        ...current,
        status: payload?.status ?? current?.status,
        tracking: {
          ...(current?.tracking || {}),
          ...(payload || {}),
        },
      };
      next[ix] = merged;
      setSelectedOrder((so) => (so?.id === orderId ? merged : so));
      return next;
    });
  };

  useEffect(() => {
    if (sseRef.current) {
      try {
        sseRef.current.close();
      } catch {}
      sseRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!token || orders.length === 0 || !API_BASE) return;

    function startPollFallback() {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const ids = orders.map((o) => o.id).filter(Boolean);
          if (ids.length === 0) return;
          const res = await fetch(
            `${API_BASE}/api/orders/status?ids=${ids.join(",")}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          if (res.ok) {
            const list = await res.json().catch(() => []);
            if (Array.isArray(list)) {
              list.forEach((row) =>
                applyTrackingUpdate(row.id, {
                  status: row.status,
                  ...(row.tracking || {}),
                })
              );
            }
          }
        } catch {
          // ignore
        }
      }, 20000);
    }

    try {
      const streamUrl = `${API_BASE}/api/orders/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const es = new EventSource(streamUrl, { withCredentials: false });
      sseRef.current = es;
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data?.type === "tracking" && data?.orderId)
            applyTrackingUpdate(data.orderId, data.payload || {});
        } catch {}
      };
      es.onerror = () => {
        try {
          es.close();
        } catch {}
        sseRef.current = null;
        startPollFallback();
      };
    } catch {
      startPollFallback();
    }

    return () => {
      if (sseRef.current) try { sseRef.current.close(); } catch {}
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, token]);

  // actions (cancel + reorder unchanged except small UX)
  const performCancel = async (orderId) => {
    if (!orderId) return;
    setCanceling(true);
    setActionLoadingId(orderId);

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, cancelling: true } : o))
    );

    try {
      const res = await fetch(
        `${API_BASE}/api/user/orders/${orderId}/cancel`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const text = await res.text().catch(() => "");
      let body = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { message: text || "" };
      }

      if (!res.ok) throw new Error(body.message || body.error || `Cancel failed (status ${res.status})`);

      await fetchOrders();
      alert(body.message || "Order cancelled successfully");
    } catch (err) {
      console.error("Cancel error:", err);
      await fetchOrders();
      alert(err.message || "Could not cancel order. See console.");
    } finally {
      setActionLoadingId(null);
      setCanceling(false);
      setOrderToCancel(null);
    }
  };

  const reorder = async (orderId) => {
    if (!orderId) return;
    setActionLoadingId(orderId);

    const endpoints = [
      `${API_BASE}/api/user/orders/${orderId}/reorder`,
      `${API_BASE}/api/orders/${orderId}/reorder`,
    ];

    let lastError = null;
    try {
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          const text = await res.text().catch(() => "");
          let body = {};
          try {
            body = text ? JSON.parse(text) : {};
          } catch {
            body = { message: text || "" };
          }

          if (!res.ok) {
            if (res.status === 404) {
              lastError = new Error(body.message || `Not found at ${url}`);
              continue;
            }
            throw new Error(body.message || body.error || `Reorder failed (status ${res.status})`);
          }

          await fetchOrders();
          alert(body.message || "Reorder placed successfully");
          return;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error("Reorder failed");
    } catch (err) {
      console.error("Reorder error:", err);
      alert(err.message || "Could not reorder. See console.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // download invoice now uses POST /api/shipping/download-invoice and downloads blob
  const downloadInvoice = async (order) => {
    if (!order?.id) return;
    setActionLoadingId(order.id);
    try {
      const res = await fetch(`${API_BASE}/api/shipping/download-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let body = {};
        try {
          body = txt ? JSON.parse(txt) : {};
        } catch {
          body = { message: txt || "" };
        }
        throw new Error(body.message || `Invoice download failed (status ${res.status})`);
      }

      const blob = await res.blob();
      const filename = `invoice-${order.id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice download error:", err);
      alert(err.message || "Unable to download invoice. See console.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // card click redirect
  const onCardClick = (order, e) => {
    // If click originates from an element that called stopPropagation, it won't reach here.
    if (!order?.id) return;
    window.location.href = `https://dripzoid.com/order-details/${encodeURIComponent(order.id)}`;
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Orders</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Recent orders — sorted by status. Click a card to view details on Dripzoid.</p>
          </div>

          {/* Status-based sorting (only control kept) */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-300">Sort</label>
            <select
              value={statusSortMode}
              onChange={(e) => setStatusSortMode(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              title="Sort by status"
            >
              <option value="priority">Status (Processing → Delivered)</option>
              <option value="alpha">Status (A → Z)</option>
            </select>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black"
              title="Refresh"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* List (full horizontal cards) */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (<SkeletonCard key={i} />))}
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-3">No orders found</p>
              <button onClick={() => setRefreshKey((k) => k + 1)} className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">Refresh</button>
            </div>
          ) : (
            <>
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {sortedOrders.map((order) => (
                  <article
                    key={order.id ?? Math.random().toString(36).slice(2, 8)}
                    onClick={(e) => onCardClick(order, e)}
                    role="button"
                    className="w-full flex gap-4 items-start p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-900 cursor-pointer"
                  >
                    {/* Image */}
                    <div className="w-36 min-w-[9rem] h-36 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={getImageFromItem(order.items && order.items[0])}
                        alt={order.items?.[0]?.name || `order-${order.id}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
                      />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Order #{order.id}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(order.created_at)}</p>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{order.items?.[0]?.name ? `${order.items[0].name}${order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}` : "—"}</p>
                        </div>

                        <div className="text-right">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>
                            <Package size={14} />
                            <span className="capitalize">{order.status || "—"}</span>
                          </div>
                          <div className="mt-2 text-lg font-bold">{fmtCurrency(order.total)}</div>
                        </div>
                      </div>

                      {/* bottom row: actions and brief tracking */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                          {/* Details (opens modal) */}
                          <button
                            onClick={(e) => { e.stopPropagation(); openOrder(order); }}
                            className="text-sm underline"
                            title="Details"
                          >
                            Details
                          </button>

                          {/* Download invoice uses POST /api/shipping/download-invoice */}
                          <button
                            onClick={async (e) => { e.stopPropagation(); await downloadInvoice(order); }}
                            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Download Invoice"
                          >
                            <Download size={14} /> {actionLoadingId === order.id ? "Downloading..." : "Invoice"}
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); reorder(order.id); }}
                            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <Repeat size={14} /> Reorder
                          </button>

                          {!["cancelled", "delivered"].includes((order.status || "").toLowerCase()) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setOrderToCancel(order.id); }}
                              className="flex items-center gap-2 px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            >
                              <Trash2 size={14} /> Cancel
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {/* small tracking summary */}
                          {order.tracking?.checkpoints && order.tracking.checkpoints.length > 0
                            ? <span>{order.tracking.checkpoints[order.tracking.checkpoints.length - 1]?.note ?? order.tracking.checkpoints[order.tracking.checkpoints.length - 1]?.code}</span>
                            : <span>Tracking info not available</span>}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* pagination */}
              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {total === 0 ? (
                    <>Showing 0 orders</>
                  ) : (
                    <>Showing <strong>{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> orders</>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <div className="text-sm">Page <strong>{page}</strong> / {pages}</div>
                  <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800"><h3 className="font-semibold">Cancel Order</h3></div>
            <div className="p-4">
              <p>Are you sure you want to cancel order <strong>#{orderToCancel}</strong>?</p>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setOrderToCancel(null)} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">No</button>
                <button onClick={() => performCancel(orderToCancel)} disabled={canceling || actionLoadingId === orderToCancel} className="px-4 py-2 rounded-md bg-rose-600 text-white disabled:opacity-50">
                  {canceling || actionLoadingId === orderToCancel ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold">Order #{selectedOrder.id}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadInvoice(selectedOrder)}
                  className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800"
                  title="Download Invoice"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800"
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={closeOrder}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Items</h4>
                <ul className="space-y-4">
                  {(selectedOrder.items || []).map((it, idx) => {
                    const key = it?.id ?? it?.sku ?? `item-${idx}`;
                    const imgItemShape = { ...it, image: it.image ?? it.img ?? it.picture ?? it.photo };
                    const img = getImageFromItem(imgItemShape);
                    const color =
                      (it.options && (it.options.color ?? it.options.colour)) ??
                      getOptionFromItem(it, "color") ??
                      getOptionFromItem(it, "colour");
                    const size =
                      (it.options && (it.options.size ?? it.options.s)) ??
                      getOptionFromItem(it, "size");
                    const qty = it.quantity ?? it.qty ?? it.count ?? 1;
                    const price = Number(it.price ?? it.unit_price ?? it.price_per_unit ?? 0);
                    const totalLine = Number(price) * Number(qty);

                    return (
                      <li
                        key={key}
                        className="flex items-center gap-4 border-b pb-3"
                      >
                        <div className="w-16 h-16 rounded overflow-hidden bg-gray-50 dark:bg-gray-800">
                          <img
                            src={img}
                            alt={it.name || "item"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.jpg";
                            }}
                          />
                        </div>

                        <div className="flex-1">
                          <div className="font-medium">
                            {it.name || it.title || "Item"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 space-x-2">
                            {color && (
                              <span>
                                Color: <strong>{color}</strong>
                              </span>
                            )}
                            {size && (
                              <span>
                                Size: <strong>{size}</strong>
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Qty: <strong>{qty}</strong> × {fmtCurrency(price)}
                          </div>
                        </div>

                        <div className="text-right font-semibold">
                          {fmtCurrency(totalLine)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Summary / Delivery / Actions */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{fmtCurrency(selectedOrder.subtotal ?? selectedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{fmtCurrency(selectedOrder.shipping ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{fmtCurrency(selectedOrder.tax ?? 0)}</span>
                  </div>
                  {selectedOrder.discount != null && selectedOrder.discount !== 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{fmtCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{fmtCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Delivery</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {selectedOrder.shipping_address?.name || selectedOrder.customer_name || "—"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedOrder.shipping_address
                      ? (
                        <>
                          {selectedOrder.shipping_address.line1 || ""}{selectedOrder.shipping_address.line2 ? `, ${selectedOrder.shipping_address.line2}` : ""}<br />
                          {(selectedOrder.shipping_address.city ? `${selectedOrder.shipping_address.city}, ` : "")}{selectedOrder.shipping_address.state || ""}{" "}{selectedOrder.shipping_address.pincode || selectedOrder.shipping_address.postcode || ""}<br />
                          {selectedOrder.shipping_address.country || ""}<br />
                          {selectedOrder.shipping_address.phone ? `Phone: ${selectedOrder.shipping_address.phone}` : ""}
                        </>
                      )
                      : (selectedOrder.shipping_address?.address || "—")
                    }
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Tracking</h4>
                  <ShipmentProgress
                    status={selectedOrder.status}
                    checkpoints={selectedOrder.tracking?.checkpoints ?? []}
                  />
                </div>

                <div className="mt-6 flex gap-2">
                  {!["cancelled", "delivered"].includes(
                    (selectedOrder.status || "").toLowerCase()
                  ) && (
                    <button
                      onClick={() => setOrderToCancel(selectedOrder.id)}
                      className="px-3 py-2 rounded-md bg-rose-50 text-rose-600"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => reorder(selectedOrder.id)}
                    className="px-3 py-2 rounded-md bg-black text-white"
                  >
                    Reorder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ShipmentProgress (unchanged) */
function ShipmentProgress({ status, checkpoints = [] }) {
  const stages = ["processing", "shipped", "delivered"];
  const lower = (status || "").toLowerCase();
  const hasOFD = Array.isArray(checkpoints) && checkpoints.some((c) => (c?.code || "").toLowerCase() === "out_for_delivery");
  const fullStages = hasOFD ? ["processing", "shipped", "out_for_delivery", "delivered"] : stages;
  const idx = Math.max(0, fullStages.indexOf(lower));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {fullStages.map((s, i) => {
          const cp = (checkpoints || []).find((c) => (c?.code || "").toLowerCase() === s) || {};
          const active = i <= idx;
          return (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border ${active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white dark:bg-gray-800 text-gray-400"}`}
                title={cp?.note || s}
              >
                {active ? <Truck size={16} /> : <Package size={16} />}
              </div>
              {i < fullStages.length - 1 && <div className={`h-1 w-16 ${i < idx ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-800"}`} />}
            </div>
          );
        })}
      </div>

      {Array.isArray(checkpoints) && checkpoints.length > 0 && (
        <ul className="mt-2 space-y-1">
          {checkpoints.map((c, index) => (
            <li key={`${c.code ?? "cp"}-${c.at ?? index}`} className="text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
              <span className="capitalize">{(c.code || "").replace(/_/g, " ")}</span>
              <span className="text-gray-500 dark:text-gray-400">{fmtDate(c.at)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">Status: <strong className="capitalize">{status || "—"}</strong></div>
    </div>
  );
}
