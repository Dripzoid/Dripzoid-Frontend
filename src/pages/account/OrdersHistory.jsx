// src/components/OrdersSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * OrdersSection — cookie-only auth version
 * - Removed localStorage token and Bearer headers
 * - Uses credentials: "include" for all protected requests
 * - Removed reorder / buy again entirely
 * - Card click now redirects to /order-details/:id
 * - Matches backend response shape:
 *   {
 *     success: true,
 *     data: [
 *       {
 *         id,
 *         orderNumber,
 *         userId,
 *         addressId,
 *         totalAmount,
 *         paymentMethod,
 *         status,
 *         paymentDetails,
 *         shippingAddress,
 *         items,
 *         deliveryDate,
 *         createdAt,
 *         updatedAt
 *       }
 *     ],
 *     meta: { total, page, pages, limit }
 *   }
 */

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

/* ---------- helpers ---------- */
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

const safeParseJSON = (s) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

const getImageFromItem = (item) => {
  if (!item) return "/placeholder.jpg";
  if (typeof item === "string" && item.startsWith("http")) return item;

  const directFields = [
    "image",
    "image_url",
    "img",
    "picture",
    "photo",
    "thumbnail",
    "thumbnail_url",
  ];

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
      if (typeof first === "string") {
        return first.split(",").map((s) => s.trim()).find(Boolean) || first;
      }
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

const normalizeOrder = (o = {}) => {
  const total =
    Number(
      o.totalAmount ??
        o.total ??
        o.total_amount ??
        o.total_price ??
        o.order_total ??
        o.amount ??
        0
    ) || 0;

  const items = Array.isArray(o.items) ? o.items : [];

  const shippingAddress =
    o.shippingAddress != null
      ? typeof o.shippingAddress === "string"
        ? safeParseJSON(o.shippingAddress)
        : o.shippingAddress
      : o.shipping_address != null
      ? typeof o.shipping_address === "string"
        ? safeParseJSON(o.shipping_address)
        : o.shipping_address
      : safeParseJSON(o.address) ?? null;

  return {
    id: o.id ?? o.order_id ?? o._id ?? null,
    orderNumber: o.orderNumber ?? o.order_number ?? null,
    userId: o.userId ?? o.user_id ?? null,
    addressId: o.addressId ?? o.address_id ?? null,
    paymentMethod: o.paymentMethod ?? o.payment_method ?? "",
    status: (o.status ?? o.order_status ?? "").toString(),
    total,
    created_at: o.createdAt || o.created_at || o.date || o.order_date || null,
    updated_at: o.updatedAt || o.updated_at || null,
    deliveryDate: o.deliveryDate ?? o.delivery_date ?? null,
    items,
    shipping_address: shippingAddress,
    shippingAddress,
    subtotal: Number(o.subtotal ?? o.amount_subtotal ?? o.sub_total ?? total),
    shipping: Number(o.shipping ?? o.shipping_cost ?? 0),
    tax: Number(o.tax ?? o.tax_amount ?? 0),
    discount: Number(o.discount ?? o.discount_amount ?? 0),
    raw: o,
  };
};

function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export default function OrdersSection() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const abortRef = useRef(null);
  const prevStatusRef = useRef(statusFilter);

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
      if (statusFilter && statusFilter !== "All") {
        params.append("status", String(statusFilter).toLowerCase());
      }

      const url = `${buildUrl("/api/user/orders")}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = "Failed fetching orders";
        try {
          const j = txt ? JSON.parse(txt) : null;
          msg = j?.message || j?.error || msg;
        } catch {}

        if (res.status === 401) {
          setOrders([]);
          setTotal(0);
          return;
        }

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
    if (prevStatusRef.current !== statusFilter) {
      prevStatusRef.current = statusFilter;
      setPage(1);
      return;
    }

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshKey, statusFilter]);

  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 12)));

  const visibleOrders = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (!statusFilter || statusFilter === "All") return copy;

    const want = String(statusFilter).toLowerCase();
    return copy.filter((o) => String(o.status || "").toLowerCase() === want);
  }, [orders, statusFilter]);

  const performCancel = async (orderId) => {
    if (!orderId) return;
    setCanceling(true);
    setActionLoadingId(orderId);

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, cancelling: true } : o))
    );

    try {
      const res = await fetch(
        buildUrl(`/api/user/orders/${encodeURIComponent(orderId)}/cancel`),
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
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

      if (!res.ok) {
        throw new Error(body.message || body.error || `Cancel failed (status ${res.status})`);
      }

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

const downloadInvoice = async (order) => {
  if (!order?.id) return;

  setActionLoadingId(order.id);

  try {
    const res = await fetch(
      buildUrl(`/api/user/orders/${order.id}/invoice`),
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.message || "Invoice download failed"
      );
    }

    const invoiceUrl =
      data?.invoice?.invoice_url ||
      data?.invoice_url;

    if (!invoiceUrl) {
      throw new Error(
        "Invoice URL not available"
      );
    }

    window.open(
      invoiceUrl,
      "_blank",
      "noopener,noreferrer"
    );
  } catch (err) {
    console.error(
      "Invoice download error:",
      err
    );

    alert(
      err.message ||
        "Unable to download invoice"
    );
  } finally {
    setActionLoadingId(null);
  }
};

  const openOrderDetails = (order) => {
    if (!order?.id) return;
    navigate(`/order-details/${encodeURIComponent(order.id)}`);
  };

  return (
    <div className="p-6 bg-white dark:bg-black min-h-screen text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">My Orders</h2>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-sm w-full sm:w-auto"
              title="Filter by status"
            >
              <option value="All">All</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black"
              title="Refresh"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900"
                />
              ))}
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-3">No orders found</p>
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {visibleOrders.map((order) => (
                <article
                  key={order.id ?? Math.random().toString(36).slice(2, 8)}
                  onClick={() => openOrderDetails(order)}
                  role="button"
                  className="w-full flex flex-col sm:flex-row gap-4 items-start p-4 hover:shadow-lg transition-shadow bg-white dark:bg-gray-900 cursor-pointer rounded-lg"
                >
                  <div className="w-full sm:w-36 h-36 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={getImageFromItem(order.items && order.items[0])}
                      alt={order.items?.[0]?.name || `order-${order.id}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.jpg";
                      }}
                    />
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {order.orderNumber
                            ? `Order ${order.orderNumber}`
                            : `Order #${order.id}`}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {fmtDate(order.created_at)}
                        </p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          {order.items?.[0]?.name
                            ? `${order.items[0].name}${
                                order.items.length > 1
                                  ? ` + ${order.items.length - 1} more`
                                  : ""
                              }`
                            : "—"}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800">
                          <span className="capitalize">{order.status || "—"}</span>
                        </div>
                        <div className="mt-2 text-lg font-bold">{fmtCurrency(order.total)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/order-details/${encodeURIComponent(order.id)}`);
                          }}
                          className="text-sm underline"
                          title="Open order details"
                        >
                          Details
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await downloadInvoice(order);
                          }}
                          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Download Invoice"
                        >
                          <Download size={14} />{" "}
                          {actionLoadingId === order.id ? "Downloading..." : "Invoice"}
                        </button>

                        {String(order.status || "").toLowerCase() !== "cancelled" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToCancel(order.id);
                            }}
                            className="flex items-center gap-2 px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          >
                            <Trash2 size={14} /> Cancel
                          </button>
                        )}
                      </div>

                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span>Tap the card to open delivery and payment details.</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-2 py-2">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {total === 0 ? (
                    <>Showing 0 orders</>
                  ) : (
                    <>
                      Showing{" "}
                      <strong>
                        {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
                      </strong>{" "}
                      of <strong>{total}</strong> orders
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-sm">
                    Page <strong>{page}</strong> / {pages}
                  </div>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold">Cancel Order</h3>
            </div>
            <div className="p-4">
              <p>
                Are you sure you want to cancel order <strong>#{orderToCancel}</strong>?
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setOrderToCancel(null)}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700"
                >
                  No
                </button>
                <button
                  onClick={() => performCancel(orderToCancel)}
                  disabled={canceling || actionLoadingId === orderToCancel}
                  className="px-4 py-2 rounded-md bg-rose-600 text-white disabled:opacity-50"
                >
                  {canceling || actionLoadingId === orderToCancel
                    ? "Cancelling..."
                    : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
