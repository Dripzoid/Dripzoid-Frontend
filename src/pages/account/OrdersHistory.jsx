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

/* Invoice-specific currency formatting with two decimals and Indian grouping */
const fmtCurrencyInvoice = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

/* ---------- normalization & extraction helpers ---------- */
const normalizeOrder = (o = {}) => {
  const total =
    Number(
      o.total ?? o.total_amount ?? o.total_price ?? o.order_total ?? o.amount ?? 0
    ) || 0;

  // items: harmonize several common shapes
  let items = [];
  if (Array.isArray(o.items)) items = o.items;
  else if (Array.isArray(o.order_items)) items = o.order_items;
  else if (Array.isArray(o.products)) items = o.products;
  else if (o.items && typeof o.items === "object") {
    // maybe single item object
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

/* utility used in rendering addresses */
const formatAddressLines = (addr) => {
  if (!addr) return "—";
  // Prefer structured fields
  const parts = [];
  if (addr.line1) parts.push(addr.line1);
  if (addr.line2) parts.push(addr.line2);
  // city, state, pincode
  const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (addr.pincode || addr.postcode) parts.push(addr.pincode ?? addr.postcode);
  if (addr.country) parts.push(addr.country);
  return parts.join(", ");
};

/* ---------- invoice builder (HTML) ---------- */
const buildInvoiceHTML = (order) => {
  // local helpers
  const esc = (s) => escapeHtml(s == null ? "" : String(s));
  // dd/mm/yyyy formatting
  const formatDateDDMMYYYY = (v) => {
    if (!v) return "—";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return esc(v);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return esc(v);
    }
  };

  // currency for invoice
  const formatCurrency = (num) =>
    `₹${Number(num || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const rawOrderId = String(order?.id ?? "");
  const orderIdEscaped = esc(rawOrderId);
  const orderDate = formatDateDDMMYYYY(order?.created_at);

  // delivery estimate +4 days if possible
  let deliveryDate = "—";
  try {
    const d = new Date(order?.created_at);
    if (!Number.isNaN(d.getTime())) {
      d.setDate(d.getDate() + 4);
      deliveryDate = formatDateDDMMYYYY(d);
    }
  } catch {}

  // shipping / customer
  const ship = order?.shipping_address ?? {};
  // allow either shipping.name or shipping.full_name or order.customer_name
  const customerName = esc(ship?.name ?? ship?.full_name ?? order?.customer_name ?? "Customer");
  const customerPhone = esc(ship?.phone ?? ship?.mobile ?? "");
  const addressLines = (() => {
    const lines = [];
    if (ship?.line1) lines.push(esc(ship.line1));
    if (ship?.line2) lines.push(esc(ship.line2));
    // city/state/pincode inline
    const cityState = [ship?.city, ship?.state].filter(Boolean).map(esc).join(", ");
    if (cityState) lines.push(cityState);
    if (ship?.pincode || ship?.postcode) lines.push(esc(ship.pincode ?? ship.postcode));
    if (ship?.country) lines.push(esc(ship.country));
    // If no structured fields, maybe shipping is a flat string
    if (lines.length === 0 && typeof ship === "string" && ship.trim()) {
      return esc(ship);
    }
    if (lines.length === 0 && order?.raw?.shipping_address) {
      const raw = order.raw.shipping_address;
      if (typeof raw === "string" && raw.trim()) return esc(raw);
    }
    return lines.join("<br/>") || "Street Address";
  })();

  // items and totals
  const items = Array.isArray(order?.items) ? order.items : [];

  const calcItemsTotal = () =>
    items.reduce((acc, it) => {
      const price = Number(it?.price ?? it?.unit_price ?? 0);
      const qty = Number(it?.quantity ?? it?.qty ?? it?.count ?? 1);
      return acc + price * qty;
    }, 0);

  const itemsTotal = calcItemsTotal();
  const shipping = Number(order?.shipping ?? 0);
  const tax = Number(order?.tax ?? 0);
  // discount field if present on order
  const discount = Number(order?.discount ?? 0);

  // computed pre-discount total (items + shipping + tax)
  const computedPreCoupon = Number(itemsTotal + shipping + tax);
  // order.total (explicit) preferred
  const totalDue = Number(order?.total ?? order?.total_amount ?? computedPreCoupon - discount);

  // If computedPreCoupon differs from totalDue, attribute the difference to coupon discount
  // couponDiscount is positive number representing reduction
  let couponDiscount = 0;
  if (computedPreCoupon > totalDue) {
    couponDiscount = Number((computedPreCoupon - totalDue) || 0);
  }

  // Build rows (no description column)
  const rowsHtml =
    items.length > 0
      ? items
          .map((it) => {
            const name = esc(it?.name ?? it?.title ?? "Item");
            const colorRaw = (it?.options && (it.options.color ?? it.options.colour)) ?? (it?.selectedColor ?? it?.colour ?? "");
            const sizeRaw = (it?.options && (it.options.size ?? it.options.s)) ?? (it?.selectedSize ?? it?.size ?? "");
            const color = esc(colorRaw || "");
            const size = esc(sizeRaw || "");
            const qty = Number(it?.quantity ?? it?.qty ?? it?.count ?? 1);
            const price = Number(it?.price ?? it?.unit_price ?? it?.price_per_unit ?? 0);
            const amount = price * qty;
            return `<tr>
              <td>${name}</td>
              <td>${color || "—"}</td>
              <td>${size || "—"}</td>
              <td style="text-align:center">${escapeHtml(String(qty))}</td>
              <td class="amount">${formatCurrency(price)}</td>
              <td class="amount">${formatCurrency(amount)}</td>
            </tr>`;
          })
          .join("\n")
      : `<tr><td colspan="6" style="text-align:center;">No items</td></tr>`;

  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(rawOrderId)}&code=Code128&dpi=96`;

  // build totals rows with coupon if present
  const couponRowHtml =
    couponDiscount > 0
      ? `<tr><td style="border:none;"></td><td style="border:none;" class="total">Coupon Discount</td><td style="border:none;" class="amount">-${formatCurrency(couponDiscount)}</td></tr>`
      : "";

  const subtotalForDisplay = itemsTotal;

  // final HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Customer Invoice - DRIPZOID</title>
  <style>
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 24px;
      color: #111;
      background: #ffffff;
      font-size: 14px;
      line-height: 1.4;
    }
    .header, .footer { width: 100%; margin-bottom: 12px; }
    .header .left { float: left; }
    .header .right { float: right; text-align: right; }
    .clearfix::after { content: ""; display: table; clear: both; }
    h2, h4 { margin: 6px 0; color: #111; }
    .section { margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    table, th, td { border: 1px solid #bbb; }
    th, td { padding: 10px; text-align: left; vertical-align: middle; }
    th { background-color: #f0f0f0; font-weight: 600; color: #111; }
    .total { text-align: right; font-weight: 700; }
    .amount { text-align: right; white-space: nowrap; }
    .barcode { margin-top: 6px; }
    .footer { margin-top: 28px; font-size: 13px; color: #444; border-top: 1px solid #ddd; padding-top: 12px; text-align: center; }
    .highlight { color: #d32f2f; font-weight: bold; }
    hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
    @media print { body { margin: 8mm; } }
  </style>
</head>
<body>
  <div class="header clearfix">
    <div class="left">
      <h2>DRIPZOID</h2>
      <div>Pithapuram, Kakinada, Andhra Pradesh, India<br/>533 450</div>
    </div>
    <div class="right">
      <div><strong>Order ID:</strong> ${orderIdEscaped}</div>
      <div><strong>Order Date:</strong> ${esc(orderDate)}</div>
      <div><strong>Delivery Date:</strong> ${esc(deliveryDate)}</div>
      <div class="barcode">
        <img src="${esc(barcodeUrl)}" alt="Order Barcode" style="max-width:220px; height:auto;" />
      </div>
    </div>
  </div>

  <hr/>

  <h2>Customer Invoice</h2>
  <p>Thank you for shopping with <span class="highlight">DRIPZOID</span>! Your satisfaction is our priority.</p>

  <div class="section clearfix">
    <div style="float:left; width:48%;">
      <h4>Bill To</h4>
      <div><strong>${customerName}</strong><br/>${addressLines}${customerPhone ? `<br/>Phone: ${customerPhone}` : ""}</div>
    </div>
    <div style="float:right; width:48%; text-align:right;">
      <h4>Payment</h4>
      <div>Payment Mode: ${esc(order?.payment_method ?? order?.payment ?? "Cash on Delivery")}<br/>Amount Due: <strong>${formatCurrency(totalDue)}</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Color</th>
        <th>Size</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Price (INR)</th>
        <th style="text-align:right">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <table style="margin-top:16px; border:none;">
    <tr>
      <td style="border:none;"></td>
      <td style="border:none;" class="total">Subtotal</td>
      <td style="border:none;" class="amount">${formatCurrency(subtotalForDisplay)}</td>
    </tr>
    <tr>
      <td style="border:none;"></td>
      <td style="border:none;" class="total">Shipping</td>
      <td style="border:none;" class="amount">${formatCurrency(shipping)}</td>
    </tr>
    ${tax ? `<tr><td style="border:none;"></td><td style="border:none;" class="total">Tax</td><td style="border:none;" class="amount">${formatCurrency(tax)}</td></tr>` : ""}
    ${couponRowHtml}
    ${discount && couponDiscount <= 0 ? `<tr><td style="border:none;"></td><td style="border:none;" class="total">Discount</td><td style="border:none;" class="amount">-${formatCurrency(discount)}</td></tr>` : ""}
    <tr>
      <td style="border:none;"></td>
      <td style="border:none;" class="total">Total Due</td>
      <td style="border:none;" class="amount"><strong>${formatCurrency(totalDue)}</strong></td>
    </tr>
  </table>

  <div class="footer">
    <div>For any queries regarding your order, contact us at <strong>support@dripzoid.com</strong> or call <strong>+91-9494038163</strong>.</div>
    <div>Returns accepted within 7 days of delivery as per our return policy.</div>
    <div>Thank you for choosing <span class="highlight">DRIPZOID</span> ❤️</div>
  </div>
</body>
</html>`;

  return html;
};

/* ---------- main component ---------- */
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
      if (statusFilter) params.append("status", statusFilter);
      if (query) params.append("q", query);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

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
    // intentionally not including API_BASE, token, etc. in deps to avoid noisy refetches
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
        copy.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        break;
      case "oldest":
        copy.sort(
          (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
        );
        break;
      case "total-desc":
        copy.sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
        break;
      case "total-asc":
        copy.sort((a, b) => (Number(a.total) || 0) - (Number(b.total) || 0));
        break;
      case "status":
        copy.sort((a, b) =>
          (a.status || "").localeCompare(b.status || "", undefined, {
            sensitivity: "base",
          })
        );
        break;
      default:
        break;
    }
    return copy;
  }, [orders, sortBy]);

  // SSE / poll fallback
  const orderIndex = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < orders.length; i++) map.set(orders[i]?.id, i);
    return map;
  }, [orders]);

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
      // also update selectedOrder if it is the one
      setSelectedOrder((so) => (so?.id === orderId ? merged : so));
      return next;
    });
  };

  useEffect(() => {
    // cleanup previous
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
  }, [orders, token, selectedOrder, API_BASE]);

  // actions
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

  // download invoice: use client-side PDF generation (html2canvas + jspdf)
  const downloadInvoice = async (order) => {
    if (!order?.id) return;

    try {
      // Build HTML invoice using template builder
      const html = buildInvoiceHTML(order);

      // Create hidden container to render HTML
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "210mm"; // A4 width for consistent rendering
      container.style.background = "#ffffff"; // force solid white background
      container.style.color = "#000000"; // ensure text is crisp black
      container.style.padding = "10mm"; // optional: padding for cleaner layout
      container.innerHTML = html;
      document.body.appendChild(container);

      // Dynamically import html2canvas and jspdf (requires you to install them)
      let html2canvasModule, jsPDFModule;
      try {
        html2canvasModule = (await import("html2canvas")).default;
        jsPDFModule = await import("jspdf");
      } catch (e) {
        // Cleanup container
        document.body.removeChild(container);
        console.error("Missing dependencies for PDF generation:", e);
        alert(
          "To download PDF invoices you need to install dependencies:\n\nnpm install html2canvas jspdf\n\nThen reload the app."
        );
        return;
      }

      // Render container to canvas (useCORS to attempt cross-origin images)
      const canvas = await html2canvasModule(container, {
        scale: 2, // increase if you want sharper text (2–3 is fine)
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff", // fixes transparency issue
      });

      // Convert canvas to image and add to PDF
      const imgData = canvas.toDataURL("image/png");

      const { jsPDF } = jsPDFModule;
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = 210; // mm
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${order.id}.pdf`);

      // Cleanup
      document.body.removeChild(container);
    } catch (err) {
      console.error("Invoice PDF generation error:", err);
      alert("Unable to generate invoice PDF. See console for details.");
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
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
              className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm w-72"
            />

            <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
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

            <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />

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
                  <article key={order.id ?? Math.random().toString(36).slice(2, 8)} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
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
                          <ShipmentProgress status={order.status} checkpoints={order.tracking?.checkpoints ?? []} />
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
                    // support both `image` (string) and richer shapes
                    const imgItemShape = { ...it, image: it.image ?? it.img ?? it.picture ?? it.photo };
                    const img = getImageFromItem(imgItemShape);
                    // color/size: check options object first (common in your backend), then other shapes
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
                        {/* Image */}
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

                        {/* Details */}
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

                        {/* Line Total */}
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
                {/* Summary */}
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

                {/* Delivery */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Delivery</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {selectedOrder.shipping_address?.name || selectedOrder.customer_name || "—"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {/* show fully formatted address */}
                    {selectedOrder.shipping_address
                      ? (
                        <>
                          {selectedOrder.shipping_address.line1 || ""}{selectedOrder.shipping_address.line2 ? `, ${selectedOrder.shipping_address.line2}` : ""}<br />
                          {(selectedOrder.shipping_address.city ? `${selectedOrder.shipping_address.city}, ` : "")}{selectedOrder.shipping_address.state || ""}{" "}{selectedOrder.shipping_address.pincode || ""}<br />
                          {selectedOrder.shipping_address.country || ""}<br />
                          {selectedOrder.shipping_address.phone ? `Phone: ${selectedOrder.shipping_address.phone}` : ""}
                        </>
                      )
                      : (selectedOrder.shipping_address?.address || "—")
                    }
                  </div>
                </div>

                {/* Tracking */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Tracking</h4>
                  <ShipmentProgress
                    status={selectedOrder.status}
                    checkpoints={selectedOrder.tracking?.checkpoints ?? []}
                  />
                </div>

                {/* Actions */}
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

/** ShipmentProgress */
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
