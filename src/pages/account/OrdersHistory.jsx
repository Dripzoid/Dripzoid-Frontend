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
 * OrdersSection
 *
 * Notes:
 * - Fetches from /api/user/orders (list)
 * - Cancel uses /api/user/orders/:id/cancel
 * - Reorder + Invoice will try /api/user/orders/:id/... first, then fallback to /api/orders/:id/...
 *
 * Sorting is client-side (fast & safe) using the 'sortBy' state.
 */

const API_BASE = process.env.REACT_APP_API_BASE ;

// helpers
const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};
const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString()}`;

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

export default function OrdersSection() {
  // query state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // new sorting state

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

  // normalize single order object (makes templates simpler)
  const normalizeOrder = (o = {}) => {
    return {
      id: o.id,
      status: (o.status || "").toString(),
      total:
        (o.total ?? o.total_amount ?? o.total_price ?? Number(o.total || 0)) ||
        0,

      created_at: o.created_at || o.date || o.createdAt || null,
      items: Array.isArray(o.items) ? o.items : o.items?.length ? o.items : o.order_items ?? [],
      products: o.products ?? null,
      shipping_address: o.shipping_address ? (typeof o.shipping_address === "string" ? safeParseJSON(o.shipping_address) : o.shipping_address) : null,
      raw: o,
    };
  };

  function safeParseJSON(s) {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }

  /**
   * New helper: try many common places to get an image URL for an order item/variant
   */
  const getImageFromItem = (item) => {
    if (!item) return "/placeholder.jpg";
    // common fields
    const possible =
      item.image ||
      item.thumbnail ||
      item.thumbnail_url ||
      item.img ||
      item.image_url ||
      (item.images && (Array.isArray(item.images) ? item.images[0] : item.images)?.url) ||
      (item.media && item.media[0]?.url) ||
      (item.variant && (item.variant.image || item.variant.images?.[0]?.url)) ||
      (item.product && (item.product.image || item.product.images?.[0]?.url)) ||
      (item.product && item.product.thumbnail) ||
      item.picture ||
      item.photo;
    if (possible) return possible;
    return "/placeholder.jpg";
  };

  /**
   * New helper: try to get a named option/property (Color, Size, etc.)
   * Looks at several common shapes vendors use: selected_options, options, attributes, variant.options
   */
  const getOptionFromItem = (item, optionName) => {
    if (!item || !optionName) return null;
    const name = optionName.toLowerCase();

    // 1) selected_options: [{ name: 'Color', value: 'Red' }]
    if (Array.isArray(item.selected_options)) {
      const found = item.selected_options.find((o) => (o?.name || "").toLowerCase() === name);
      if (found) return found.value ?? found.val ?? found.option ?? found.name;
    }

    // 2) options / attributes arrays: [{ option: 'Size', value: 'M' }, { name:'size', value:'M' }]
    if (Array.isArray(item.options)) {
      const found = item.options.find((o) => ((o?.name || o?.option) || "").toLowerCase() === name);
      if (found) return found.value ?? found.val ?? found.option ?? found.name;
    }
    if (Array.isArray(item.attributes)) {
      const found = item.attributes.find((o) => ((o?.name || o?.key) || "").toLowerCase() === name);
      if (found) return found.value ?? found.val ?? found.option ?? found.name;
    }

    // 3) variant object might contain options or attributes
    if (item.variant) {
      if (Array.isArray(item.variant.options)) {
        const found = item.variant.options.find((o) => (o?.name || "").toLowerCase() === name);
        if (found) return found.value ?? found.val ?? found.option ?? found.name;
      }
      if (Array.isArray(item.variant.attributes)) {
        const found = item.variant.attributes.find((o) => (o?.name || o?.key || "").toLowerCase() === name);
        if (found) return found.value ?? found.val ?? found.option ?? found.name;
      }
      // sometimes variant stores color/size directly
      if (item.variant[name]) return item.variant[name];
    }

    // 4) flat fields
    if (item[name]) return item[name];
    if (item.selectedColor && name === "color") return item.selectedColor;
    if (item.selected_size && name === "size") return item.selected_size;
    if (item.color && name === "color") return item.color;
    if (item.size && name === "size") return item.size;

    // 5) metadata / meta
    if (item.meta && typeof item.meta === "object") {
      const k = Object.keys(item.meta).find((k) => k.toLowerCase().includes(name));
      if (k) return item.meta[k];
    }

    return null;
  };

  // fetch orders
  const fetchOrders = async () => {
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      if (statusFilter) params.append("status", statusFilter);
      if (query) params.append("q", query);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await fetch(`${API_BASE}/api/user/orders?${params.toString()}`, {
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

      const arr = body?.data ?? (Array.isArray(body) ? body : body?.orders ?? []);
      const meta =
        body?.meta ??
        {
          total: Number(body?.total ?? arr.length ?? 0),
          page,
          pages: Math.max(1, Math.ceil((Number(body?.total ?? arr.length ?? 0)) / limit)),
          limit,
        };

      // normalize data so UI uses consistent fields
      const normalized = Array.isArray(arr) ? arr.map(normalizeOrder) : [];
      setOrders(normalized);
      setTotal(Number(meta.total ?? normalized.length ?? 0));
      setPage(Number(meta.page ?? page));
      setLimit(Number(meta.limit ?? limit));
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
  }, [page, limit, statusFilter, query, dateFrom, dateTo, refreshKey]);

  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 12)));

  const openOrder = (order) => setSelectedOrder(order);
  const closeOrder = () => setSelectedOrder(null);

  // client-side sorting (fully functional)
  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    switch (sortBy) {
      case "newest":
        copy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case "oldest":
        copy.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      case "total-desc":
        copy.sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
        break;
      case "total-asc":
        copy.sort((a, b) => (Number(a.total) || 0) - (Number(b.total) || 0));
        break;
      case "status":
        copy.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
        break;
      default:
        break;
    }
    return copy;
  }, [orders, sortBy]);

  // SSE / poll fallback (same as before)
  const orderIndex = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < orders.length; i++) map.set(orders[i]?.id, i);
    return map;
  }, [orders]);

  const applyTrackingUpdate = (orderId, payload) => {
    if (!orderIndex.has(orderId)) return;
    setOrders((prev) => {
      const next = [...prev];
      const ix = orderIndex.get(orderId);
      const current = next[ix];
      const merged = {
        ...current,
        status: payload?.status || current?.status,
        tracking: {
          ...(current?.tracking || {}),
          ...(payload || {}),
        },
      };
      next[ix] = merged;
      if (selectedOrder?.id === orderId) setSelectedOrder(merged);
      return next;
    });
  };

  useEffect(() => {
    // cleanup previous
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!token || orders.length === 0) return;

    function startPollFallback() {
      pollTimerRef.current = setInterval(async () => {
        try {
          const ids = orders.map((o) => o.id).filter(Boolean);
          if (ids.length === 0) return;
          const res = await fetch(`${API_BASE}/api/orders/status?ids=${ids.join(",")}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
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
          if (data?.type === "tracking" && data?.orderId) applyTrackingUpdate(data.orderId, data.payload || {});
        } catch {}
      };
      es.onerror = () => {
        try { es.close(); } catch {}
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
  }, [orders, token, selectedOrder]);

  // actions
  const performCancel = async (orderId) => {
    if (!orderId) return;
    setCanceling(true);
    setActionLoadingId(orderId);

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, cancelling: true } : o)));

    try {
      const res = await fetch(`${API_BASE}/api/user/orders/${orderId}/cancel`, {
        method: "PUT",
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

      if (!res.ok) throw new Error(body.message || body.error || `Cancel failed (status ${res.status})`);

      // refresh to get accurate server state
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

  // Reorder: try two possible endpoints for maximum compatibility,
  // then refresh orders (so new order appears immediately).
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
            // try next endpoint on 404; otherwise stop
            if (res.status === 404) {
              lastError = new Error(body.message || `Not found at ${url}`);
              continue;
            }
            throw new Error(body.message || body.error || `Reorder failed (status ${res.status})`);
          }

          // success -> refresh list and show message
          await fetchOrders();
          alert(body.message || "Reorder placed successfully");
          return;
        } catch (err) {
          lastError = err;
          // try next endpoint
        }
      }
      // if we reach here, both endpoints failed
      throw lastError || new Error("Reorder failed");
    } catch (err) {
      console.error("Reorder error:", err);
      alert(err.message || "Could not reorder. See console.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // download invoice: try user scoped then general endpoint
  const downloadInvoice = async (order) => {
    if (!order?.id) return;
    const endpoints = [
      `${API_BASE}/api/user/orders/${order.id}/invoice`,
      `${API_BASE}/api/orders/${order.id}/invoice`,
    ];
    let lastError = null;

    try {
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            try {
              const j = txt ? JSON.parse(txt) : null;
              throw new Error(j?.message || j?.error || `Invoice failed (status ${res.status})`);
            } catch (parseErr) {
              throw new Error(txt || `Invoice failed (status ${res.status})`);
            }
          }

          const blob = await res.blob();
          const urlObj = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = urlObj;
          a.download = `invoice-${order.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(urlObj);
          return;
        } catch (err) {
          lastError = err;
          // try next endpoint
        }
      }
      throw lastError || new Error("Invoice download failed");
    } catch (err) {
      console.error("Invoice download error:", err);
      alert(err.message || "Unable to download invoice.");
    }
  };

  // Render
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header + Filters */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Orders</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Recent orders, live tracking & invoices</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Search order id or product..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm w-72"
            />

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
              <option value="">All statuses</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="total-desc">Sort: Total (High → Low)</option>
              <option value="total-asc">Sort: Total (Low → High)</option>
              <option value="status">Sort: Status (A → Z)</option>
            </select>

            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />

            <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
              {[6, 12, 24, 48].map((n) => <option key={n} value={n}>{n}/page</option>)}
            </select>

            <button onClick={() => { setPage(1); setRefreshKey((k) => k + 1); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black" title="Apply filters">
              <RefreshCw size={16} /> Apply
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (<SkeletonCard key={i} />))}
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-3">No orders found</p>
              <button onClick={() => setRefreshKey((k) => k + 1)} className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">Refresh</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedOrders.map((order) => (
                  <article key={order.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    <div className="p-4 flex gap-4">
                      <div className="flex-shrink-0 w-28 h-36 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden">
                        <img
                          src={getImageFromItem(order.items && order.items[0])}
                          alt={order.items?.[0]?.name || `order-${order.id}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
                        />
                      </div>

                      <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Order #{order.id}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(order.created_at)}</p>
                          </div>

                          <div className="text-right">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>
                              <Package size={14} />
                              <span className="capitalize">{order.status || "—"}</span>
                            </div>
                            <div className="mt-2 text-lg font-bold">{fmtCurrency(order.total)}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 items-center text-sm text-gray-600 dark:text-gray-300">
                          <button onClick={() => openOrder(order)} className="text-sm underline">Details</button>

                          <button onClick={() => downloadInvoice(order)} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                            <Download size={14} /> Invoice
                          </button>

                          <button onClick={() => reorder(order.id)} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                            <Repeat size={14} /> Reorder
                          </button>

                          {!["cancelled", "delivered"].includes((order.status || "").toLowerCase()) && (
                            <button onClick={() => setOrderToCancel(order.id)} className="flex items-center gap-2 px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                              <Trash2 size={14} /> Cancel
                            </button>
                          )}
                        </div>

                        <div className="mt-4">
                          <ShipmentProgress status={order.status} checkpoints={order.tracking?.checkpoints} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* pagination */}
              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Showing <strong>{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> orders
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
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold">Order #{selectedOrder.id}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadInvoice(selectedOrder)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800"><Download size={16} /></button>
                <button onClick={() => setRefreshKey((k) => k + 1)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800" title="Refresh"><RefreshCw size={16} /></button>
                <button onClick={closeOrder} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Items</h4>
                <ul className="space-y-3">
                  {selectedOrder.items?.map((it) => {
                    const key = it.id ?? it.sku ?? `${it.name}-${Math.random().toString(36).slice(2,6)}`;
                    const img = getImageFromItem(it);
                    const color = getOptionFromItem(it, "color") || getOptionFromItem(it, "colour");
                    const size = getOptionFromItem(it, "size");
                    const qty = it.quantity ?? it.qty ?? it.count ?? 1;
                    const price = it.price ?? it.unit_price ?? it.price_per_unit ?? 0;
                    return (
                      <li key={key} className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded overflow-hidden bg-gray-50 dark:bg-gray-800">
                          <img src={img} alt={it.name || "item"} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{it.name || it.title || "Item"}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {color && <span className="mr-3">Color: <strong>{color}</strong></span>}
                            {size && <span>Size: <strong>{size}</strong></span>}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Qty: <strong>{qty}</strong></div>
                        </div>
                        <div className="text-right font-semibold">{fmtCurrency(Number(price) * Number(qty))}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300"><span>Subtotal</span><span>{fmtCurrency(selectedOrder.subtotal || selectedOrder.total)}</span></div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300"><span>Shipping</span><span>{fmtCurrency(selectedOrder.shipping || 0)}</span></div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300"><span>Tax</span><span>{fmtCurrency(selectedOrder.tax || 0)}</span></div>
                  <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{fmtCurrency(selectedOrder.total)}</span></div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Delivery</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{selectedOrder.shipping_address?.name || selectedOrder.customer_name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{selectedOrder.shipping_address?.line1 || selectedOrder.address}</div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Tracking</h4>
                  <ShipmentProgress status={selectedOrder.status} checkpoints={selectedOrder.tracking?.checkpoints} />
                </div>

                <div className="mt-4 flex gap-2">
                  {!["cancelled", "delivered"].includes((selectedOrder.status || "").toLowerCase()) && (
                    <button onClick={() => setOrderToCancel(selectedOrder.id)} className="px-3 py-2 rounded-md bg-rose-50 text-rose-600">Cancel</button>
                  )}
                  <button onClick={() => reorder(selectedOrder.id)} className="px-3 py-2 rounded-md bg-black text-white">Reorder</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ShipmentProgress */
function ShipmentProgress({ status, checkpoints = [] }) {
  const stages = ["processing", "shipped", "delivered"];
  const lower = (status || "").toLowerCase();
  const hasOFD = checkpoints?.some((c) => c.code === "out_for_delivery");
  const fullStages = hasOFD ? ["processing", "shipped", "out_for_delivery", "delivered"] : stages;
  const idx = Math.max(0, fullStages.indexOf(lower));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {fullStages.map((s, i) => {
          const cp = (checkpoints || []).find((c) => c.code === s) || {};
          const active = i <= idx;
          return (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white dark:bg-gray-800 text-gray-400"}`} title={cp?.note || s}>
                {active ? <Truck size={16} /> : <Package size={16} />}
              </div>
              {i < fullStages.length - 1 && <div className={`h-1 w-16 ${i < idx ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-800"}`} />}
            </div>
          );
        })}
      </div>

      {checkpoints.length > 0 && (
        <ul className="mt-2 space-y-1">
          {checkpoints.map((c) => (
            <li key={`${c.code}-${c.at}`} className="text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
              <span className="capitalize">{c.code.replaceAll("_", " ")}</span>
              <span className="text-gray-500 dark:text-gray-400">{fmtDate(c.at)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">Status: <strong className="capitalize">{status || "—"}</strong></div>
    </div>
  );
}
