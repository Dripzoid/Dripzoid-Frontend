// src/pages/OrderDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package as PackageIcon,
  CheckCircle,
  Clock,
  Info,
  Download,
  Share2,
  XCircle,
} from "lucide-react";

/**
 * OrderDetailsPage - reads API that returns shape like:
 * {
 *   id, status, total_amount, created_at, user_name, payment_method,
 *   shipping_address: {...},
 *   items: [{ id, name, image, quantity, price, options: {color,size} }, ...]
 * }
 *
 * Normalizes that response for the UI and includes Authorization header
 * (Bearer token) if a token is found in localStorage or cookies.
 */

// -------------------- API base helper --------------------
const API_BASE = process.env.REACT_APP_API_BASE || ""; // CRA default. For Vite use import.meta.env.VITE_API_BASE

const apiUrl = (path = "") => {
  if (!path.startsWith("/")) path = `/${path}`;
  const combined = API_BASE ? `${API_BASE}${path}` : path;
  return combined.replace(/([^:]\/)\/+/g, "$1");
};

// -------------------- Auth helpers --------------------
function getAuthToken() {
  if (typeof window === "undefined") return null;
  const ls = localStorage.getItem("token") || localStorage.getItem("authToken");
  if (ls) return ls;
  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

function authHeaders(hasJson = true) {
  const headers = {};
  if (hasJson) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  } else {
    headers["Accept"] = "application/json";
  }
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// -------------------- utils --------------------
function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}
function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

// -------------------- global button class --------------------
const BTN =
  "transition-all duration-200 font-medium rounded-full px-4 py-2 " +
  "bg-black text-white dark:bg-white dark:text-black " +
  "hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white " +
  "hover:ring-2 hover:ring-black dark:hover:ring-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus:outline-none";

// marker constants
const MARKER_SIZE_PX = 28;
const MARKER_INNER_OFFSET_PX = 6;
const LEFT_6_PX = 24;

// -------------------- Main component --------------------
export default function OrderDetailsPage({ orderId: propOrderId }) {
  // If propOrderId not provided, extract from URL like /order-details/40
  const [orderId] = useState(() => {
    if (propOrderId) return String(propOrderId);
    if (typeof window === "undefined") return "38";
    const path = window.location.pathname || "";
    // match /order-details/40 or last numeric segment
    const m = path.match(/\/order-details\/(\d+)(?:\/|$)/i);
    if (m) return m[1];
    const parts = path.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (/^\d+$/.test(last)) return last;
    return "38";
  });

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showEditAddress, setShowEditAddress] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const invoiceRef = useRef(null);

  const [infoModal, setInfo] = useState({ open: false, title: "", message: "" });

  // normalize backend response into UI shape
  function normalizeApiOrder(payload) {
    if (!payload) return null;

    const pricing = {
      total: payload.total_amount ?? (payload.pricing && payload.pricing.total) ?? 0,
      sellingPrice: (payload.total_amount ?? payload.pricing?.sellingPrice) ?? 0,
      listingPrice: payload.pricing?.listingPrice ?? payload.total_amount ?? 0,
      fees: payload.pricing?.fees ?? 0,
      extraDiscount: payload.pricing?.extraDiscount ?? 0,
      specialPrice: payload.pricing?.specialPrice ?? 0,
      otherDiscount: payload.pricing?.otherDiscount ?? 0,
    };

    const sa = payload.shipping_address || payload.shipping || null;
    const shipping = sa
      ? {
          id: sa.id ?? null,
          label: sa.label ?? null,
          name: sa.name ?? sa.label ?? payload.user_name ?? null,
          phone: sa.phone ?? null,
          address: [
            sa.line1 ?? sa.address_line1 ?? sa.address1 ?? null,
            sa.line2 ?? sa.address_line2 ?? sa.address2 ?? null,
            sa.city ?? sa.town ?? null,
            sa.state ?? null,
            sa.pincode ?? sa.postcode ?? sa.zip ?? null,
            sa.country ?? null,
          ]
            .filter(Boolean)
            .join(", "),
          raw: sa,
        }
      : { address: "", name: "", phone: "" };

    const items = Array.isArray(payload.items)
      ? payload.items.map((it) => {
          const firstImg = (it.image || it.images || "")
            .toString()
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)[0] || "";

          const opts = it.options || {};
          const optionsText =
            typeof opts === "string"
              ? opts
              : [opts.color ? `${opts.color}` : null, opts.size ? `${opts.size}` : null, opts.variant ? `${opts.variant}` : null].filter(Boolean).join(" • ");

          return {
            id: it.id,
            title: it.name ?? it.title ?? "",
            img: firstImg,
            qty: it.quantity ?? it.qty ?? 1,
            price: it.price ?? it.amount ?? 0,
            options: optionsText,
            seller: it.seller ?? "",
            raw: it,
          };
        })
      : [];

    return {
      id: payload.id,
      status: payload.status,
      created_at: payload.created_at ?? payload.placedAt ?? payload.createdAt,
      user_name: payload.user_name ?? payload.userName ?? null,
      paymentMethod: payload.payment_method ?? payload.paymentMethod ?? null,
      shipping,
      pricing,
      items,
      tracking: payload.tracking ?? payload.tracking_info ?? [],
      courier: payload.courier ?? null,
      history: payload.history ?? [],
      raw: payload,
    };
  }

  // ------------------ fetch order from backend ------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const url = apiUrl(`/api/user/orders/${encodeURIComponent(orderId)}`);
        const res = await fetch(url, {
          method: "GET",
          headers: authHeaders(false),
          credentials: "same-origin",
        });

        const payload = await parseJsonSafe(res);
        if (!res.ok) throw new Error(payload?.message || `Failed to fetch order: ${res.status}`);

        const normalized = normalizeApiOrder(payload);
        if (!mounted) return;
        setOrder(normalized);
      } catch (err) {
        console.error("Error loading order:", err);
        setInfo({ open: true, title: "Error", message: err.message || "Could not load order. Check network or try again." });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [orderId]);

  const pricing = useMemo(() => (order ? { ...order.pricing } : null), [order]);

  // ------------------ backend-integrated actions ------------------
  async function handleCancel() {
    if (!order) return;
    setLoading(true);
    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/cancel`);
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders(true),
        credentials: "same-origin",
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Cancel failed (${res.status})`);

      const normalized = normalizeApiOrder(payload?.order ?? payload) ?? { ...order, status: payload?.status ?? "cancelled" };
      setOrder((o) => ({ ...o, ...normalized }));
      setInfo({ open: true, title: "Cancelled", message: payload?.message ?? "Order cancelled" });
    } catch (err) {
      console.error("Cancel error:", err);
      setInfo({ open: true, title: "Error", message: err.message || "Could not cancel order" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReturn() {
    if (!order) return;
    setLoading(true);
    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/return`);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(true),
        credentials: "same-origin",
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Return failed (${res.status})`);

      const normalized = normalizeApiOrder(payload?.order ?? payload) ?? order;
      setOrder((o) => ({ ...o, ...normalized }));
      setInfo({ open: true, title: "Return requested", message: payload?.message ?? "Return requested" });
    } catch (err) {
      console.error("Return error:", err);
      setInfo({ open: true, title: "Error", message: err.message || "Could not request return" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAddress(shippingObj) {
    if (!order) return;
    setLoading(true);
    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/address`);
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders(true),
        credentials: "same-origin",
        body: JSON.stringify(shippingObj),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Address update failed (${res.status})`);

      setOrder((o) => ({
        ...o,
        shipping: {
          ...o.shipping,
          name: shippingObj.name ?? o.shipping.name,
          phone: shippingObj.phone ?? o.shipping.phone,
          address: shippingObj.address ?? o.shipping.address,
        },
        history: payload?.history ? [...(payload.history || []), ...(o.history || [])] : o.history,
      }));

      setInfo({ open: true, title: "Address updated", message: payload?.message ?? "Address updated" });
    } catch (err) {
      console.error("Update address error:", err);
      setInfo({ open: true, title: "Error", message: err.message || "Could not update address" });
    } finally {
      setLoading(false);
    }
  }

  // ------------------ track-order ------------------
  async function handleTrackOrder() {
    if (!order) {
      setInfo({ open: true, title: "Track order", message: "No order to track" });
      return;
    }

    setLoading(true);
    try {
      const url = apiUrl(`/api/shipping/track-order`);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(true),
        credentials: "same-origin",
        body: JSON.stringify({ orderId: order.id }),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Track API error (${res.status})`);

      setOrder((o) => ({
        ...o,
        tracking: payload.tracking ?? payload.tracking_info ?? o.tracking,
        status: payload.status ?? o.status,
        courier: payload.courier ?? o.courier,
        history: payload.history ? [...payload.history, ...(o.history || [])] : o.history,
      }));
      setInfo({ open: true, title: "Tracking updated", message: payload?.message ?? "Latest tracking information received." });
    } catch (err) {
      console.error("Track order failed:", err);
      setInfo({ open: true, title: "Tracking error", message: err.message || "Could not fetch live tracking." });
    } finally {
      setLoading(false);
    }
  }

  // ------------------ misc ------------------
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setInfo({ open: false, title: "", message: "" });
        setShowCancel(false);
        setShowReturn(false);
        setShowEditAddress(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleShare() {
    if (!order) return;
    const shareText = `Order ${order.id} • ${order.items?.length ?? 0} items • ${currency(order.pricing?.total)}`;
    if (navigator.share) {
      navigator.share({ title: `Order ${order.id}`, text: shareText }).catch(() => setInfo({ open: true, title: "Share", message: "Sharing cancelled or not supported" }));
    } else {
      navigator.clipboard
        ?.writeText(`${shareText}\nView in your orders`)
        .then(() => setInfo({ open: true, title: "Copied", message: "Order summary copied to clipboard" }))
        .catch(() => setInfo({ open: true, title: "Share", message: "Share not available" }));
    }
  }

  function contactCourier() {
    if (!order?.courier?.phone) {
      setInfo({ open: true, title: "No courier number", message: "Courier phone not available" });
      return;
    }
    setInfo({ open: true, title: "Contact courier", message: `Call ${order.courier.phone}` });
  }

  async function handleDownloadInvoice() {
    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/invoice`);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Download invoice failed:", err);
      setInfo({ open: true, title: "Error", message: "Could not download invoice." });
    }
  }

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  const isDelivered = order.status?.toLowerCase() === "delivered" || order.tracking?.some((t) => t.step?.toLowerCase() === "delivered" && t.done);
  const isPacked = order.status?.toLowerCase() === "packed";
  const isCancelled = order.status?.toLowerCase() === "cancelled";

  // -------------------- Render --------------------
  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Breadcrumb */}
      <div className="bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
          Home &gt; My Account &gt; My Orders &gt; <span className="font-mono">{order.id}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Main */}
        <section className="lg:col-span-2 space-y-6">
          <ProductHeader order={order} />

          <TimelineCard
            order={order}
            onCancel={() => setShowCancel(true)}
            onRequestReturn={() => setShowReturn(true)}
            onTrackAll={handleTrackOrder}
            isDelivered={isDelivered}
          />

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Items in this order</h3>
              <div className="text-sm text-neutral-500">{order.items?.length ?? 0} item(s)</div>
            </div>

            <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items?.map((it) => (
                <div key={it.id} className="py-4">
                  <div className="flex items-center gap-4">
                    <img src={it.img} alt={it.title} className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-sm text-neutral-500">{it.options}</div>
                      <div className="text-sm text-neutral-500 mt-1">Seller: {it.seller || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{currency(it.price)}</div>
                      <div className="text-sm text-neutral-500">Qty: {it.qty}</div>
                    </div>
                  </div>
                </div>
              )) ?? null}
            </div>
          </div>
        </section>

        {/* Right - Sidebar */}
        <aside className="space-y-6 sticky top-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Delivery details</div>
              <div className="text-sm text-neutral-400">AWB: {order.courier?.awb ?? "—"}</div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3">
                <div className="text-sm text-neutral-500">Home</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200">{order.shipping?.address}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-neutral-500">
                    {order.shipping?.name} • {order.shipping?.phone}
                  </div>
                  <div>
                    {!isPacked && (
                      <button onClick={() => setShowEditAddress(true)} className={BTN + " text-sm px-3 py-1"}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Courier</div>
                  <div className="text-sm font-medium">{order.courier?.name ?? "—"}</div>
                  <div className="text-sm text-neutral-500">
                    {order.courier?.exec?.name ?? ""} • {order.courier?.exec?.phone ?? ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{order.courier?.exec?.eta ?? ""}</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <button onClick={contactCourier} className={BTN + " text-sm px-3 py-1"}>
                      Call
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price details */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Price details</div>
              <div className="text-sm text-neutral-400">Items: {order.items?.length ?? 0}</div>
            </div>

            <div className="mt-3 text-sm space-y-2">
              <div className="flex justify-between text-neutral-500">
                <div>Listing price</div>
                <div className="line-through">{currency(order.pricing?.listingPrice)}</div>
              </div>
              <div className="flex justify-between">
                <div>Selling price</div>
                <div>{currency(order.pricing?.sellingPrice)}</div>
              </div>
              <div className="flex justify-between text-emerald-600">
                <div>Extra discount</div>
                <div>-{currency(order.pricing?.extraDiscount)}</div>
              </div>
              <div className="flex justify-between">
                <div>Special price</div>
                <div>{currency(order.pricing?.specialPrice)}</div>
              </div>
              <div className="flex justify-between text-emerald-600">
                <div>Other discount</div>
                <div>-{currency(order.pricing?.otherDiscount)}</div>
              </div>
              <div className="flex justify-between text-neutral-500">
                <div>Total fees</div>
                <div>{currency(order.pricing?.fees)}</div>
              </div>

              <div className="mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
                <div className="font-semibold">Total amount</div>
                <div className="font-semibold">{currency(pricing?.total ?? order.pricing?.total)}</div>
              </div>

              <div className="mt-3 text-sm text-neutral-500">
                Paid by <strong className="ml-1">{order.paymentMethod ?? "—"}</strong>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2">
                <button onClick={handleShare} className={BTN + " flex-1 py-2 flex items-center justify-center gap-2"}>
                  <Share2 size={16} /> Share
                </button>
                <button onClick={handleDownloadInvoice} className={BTN + " flex-1 py-2 px-3 flex items-center justify-center gap-2"}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Hidden invoice content for print */}
        {showInvoice && (
          <div className="hidden" aria-hidden>
            <div ref={invoiceRef}>
              <InvoiceTemplate order={order} pricing={pricing} />
            </div>
          </div>
        )}

        {/* Modals */}
        <ConfirmModal
          open={!!showCancel}
          title="Cancel order"
          message="Are you sure you want to cancel this order?"
          confirmLabel="Yes, cancel"
          onClose={() => setShowCancel(false)}
          onConfirm={async () => {
            setShowCancel(false);
            await handleCancel();
          }}
        />

        <ConfirmModal
          open={!!showReturn}
          title="Return order"
          message="Do you want to return this order?"
          confirmLabel="Return"
          onClose={() => setShowReturn(false)}
          onConfirm={async () => {
            setShowReturn(false);
            await handleRequestReturn();
          }}
        />

        <InputModal
          open={!!showEditAddress}
          title="Edit shipping address"
          initialShipping={order.shipping}
          onClose={() => setShowEditAddress(false)}
          onConfirm={async (newShipping) => {
            setShowEditAddress(false);
            await handleSaveAddress(newShipping);
          }}
        />

        <InfoModal open={!!infoModal.open} title={infoModal.title} message={infoModal.message} onClose={() => setInfo({ open: false, title: "", message: "" })} />
      </main>
    </div>
  );
}

// -------------------- Subcomponents --------------------

function SkeletonPage() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-36 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-56 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <aside className="space-y-4">
          <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-56 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </aside>
      </div>
    </div>
  );
}

function ProductHeader({ order }) {
  const item = order.items?.[0] || { title: "", options: "", seller: "", price: 0, img: "" };
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-lg font-semibold leading-tight">{item.title}</h1>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{item.options}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">Seller: {item.seller}</div>

          <div className="mt-4 flex items-center gap-4">
            <div className="text-2xl font-bold">{currency(item.price)}</div>
            <div className="text-sm text-emerald-600">1 offer</div>
          </div>
        </div>

        <div className="w-28 h-28 flex-shrink-0 rounded overflow-hidden border border-neutral-200 dark:border-neutral-800">
          <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

/**
 * TimelineCard
 *
 * - Shows Cancel/Return/Track UI.
 * - Rules:
 *    - If order is cancelled: hide Return and Track buttons entirely (no actions).
 *    - If delivered (and not cancelled): show ONLY the Return button (full-width).
 *    - If not delivered (and not cancelled): show Cancel and Track buttons side-by-side (equal width).
 */
function TimelineCard({ order, onCancel, onRequestReturn, onTrackAll, isDelivered }) {
  const timelineRef = useRef(null);
  const markersRef = useRef([]);
  const [overlayRect, setOverlayRect] = useState(null);

  const innerSize = MARKER_SIZE_PX - MARKER_INNER_OFFSET_PX;
  const isCancelled = order.status && order.status.toLowerCase() === "cancelled";

  // 🔹 Define the timeline based on order status
  const allSteps = isCancelled
    ? ["Order Confirmed", "Cancelled"]
    : ["Order Confirmed", "Packed", "Shipped", "Out For Delivery", "Delivered"];

  // 🔹 Map progress index based on order.status
  const progressMap = {
    pending: 0,
    confirmed: 0,
    processing: 1,
    packed: 1,
    shipped: 2,
    "out for delivery": 3,
    delivered: 4,
    cancelled: isCancelled ? 1 : 0,
  };

  const normalizedStatus = (order.status || "").toLowerCase();
  const progressIndex = progressMap[normalizedStatus] ?? 0;

  // 🔹 Build tracking data dynamically
  const trackingToUse = allSteps.map((step, idx) => ({
    step,
    done: idx <= progressIndex,
    date:
      idx <= progressIndex
        ? order.history?.find((h) => h.title?.toLowerCase().includes(step.toLowerCase()))?.time ||
          order.created_at ||
          null
        : null,
    detail: idx <= progressIndex ? (step === "Cancelled" ? "Order cancelled" : "Completed") : "",
  }));

  const lastDoneIndex = trackingToUse.map((t) => t.done).lastIndexOf(true);

  useEffect(() => {
    function measure() {
      const container = timelineRef.current;
      const nodes = markersRef.current || [];
      if (!container || !nodes.length) {
        setOverlayRect(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const firstNode = nodes[0];

      if (lastDoneIndex < 0) {
        setOverlayRect(null);
        return;
      }
      const lastNode = nodes[lastDoneIndex] || firstNode;
      if (!firstNode || !lastNode) {
        setOverlayRect(null);
        return;
      }

      const firstRect = firstNode.getBoundingClientRect();
      const lastRect = lastNode.getBoundingClientRect();

      const firstCenter = firstRect.top - containerRect.top + MARKER_SIZE_PX / 2;
      const lastCenter = lastRect.top - containerRect.top + MARKER_SIZE_PX / 2;

      const topPx = Math.round(firstCenter - 2);
      const heightPx = Math.max(4, Math.round(lastCenter - firstCenter) + 4);

      const spineLeftPx = LEFT_6_PX + MARKER_SIZE_PX / 2 - 2;
      setOverlayRect({ leftPx: Math.round(spineLeftPx), topPx, heightPx });
    }

    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (timelineRef.current) ro.observe(timelineRef.current);
    markersRef.current.forEach((el) => el && ro.observe(el));
    return () => {
      window.removeEventListener("resize", measure);
      try {
        ro.disconnect();
      } catch (e) {}
    };
  }, [trackingToUse, lastDoneIndex, order.status]);

  const spineLeftForCSS = LEFT_6_PX + MARKER_SIZE_PX / 2 - 2;
  const markerLeftPx = spineLeftForCSS - MARKER_SIZE_PX / 2;

  const showActions = !isCancelled; // hide buttons for cancelled orders

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="text-neutral-600 dark:text-neutral-300" />
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Tracking status</div>
            <div className="font-semibold capitalize">{order.status}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 relative" ref={timelineRef}>
        <div className="absolute top-0 bottom-0 w-[4px] bg-neutral-100 dark:bg-neutral-800 z-0" style={{ left: `${spineLeftForCSS}px` }} />

        {overlayRect && (
          <motion.div
            key={`overlay-${overlayRect.heightPx}-${overlayRect.topPx}-${isCancelled ? "cancel" : "ok"}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.42, ease: [0.2, 0.9, 0.2, 1] }}
            aria-hidden
            style={{
              position: "absolute",
              left: `${overlayRect.leftPx}px`,
              top: `${overlayRect.topPx}px`,
              width: 4,
              height: `${overlayRect.heightPx}px`,
              backgroundColor: isCancelled ? "rgb(239,68,68)" : "rgb(16,185,129)", // red for cancelled
              zIndex: 5,
              borderRadius: 2,
              transformOrigin: "top center",
            }}
          />
        )}

        <div className="space-y-6 relative z-10">
          {trackingToUse.map((t, idx) => {
            const done = t.done;
            const nextDone = trackingToUse[idx + 1]?.done;
            const isCancelStep = t.step?.toLowerCase().includes("cancel");

            const outerClasses = isCancelStep
              ? "rounded-full bg-red-600"
              : done
              ? "rounded-full bg-emerald-600"
              : nextDone
              ? "rounded-full bg-white border border-neutral-300 dark:border-neutral-700"
              : "rounded-full bg-white border border-neutral-200 dark:border-neutral-800";

            const iconColorDone = done ? "text-white" : "text-neutral-500 dark:text-neutral-400";

            return (
              <div key={t.step + "-" + idx} className="pl-14 relative">
                <div
                  ref={(el) => (markersRef.current[idx] = el)}
                  style={{ position: "absolute", left: `${markerLeftPx}px`, top: 0, width: MARKER_SIZE_PX, height: MARKER_SIZE_PX }}
                >
                  <div style={{ width: "100%", height: "100%" }} className={`z-10 ${outerClasses}`} />

                  <div
                    style={{
                      position: "absolute",
                      left: `${MARKER_INNER_OFFSET_PX / 2}px`,
                      top: `${MARKER_INNER_OFFSET_PX / 2}px`,
                      width: innerSize,
                      height: innerSize,
                      zIndex: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "9999px",
                      background: "transparent",
                    }}
                  >
                    {isCancelStep ? (
                      <XCircle size={Math.max(12, innerSize - 8)} className={"text-white"} />
                    ) : done ? (
                      <CheckCircle size={Math.max(12, innerSize - 8)} className={iconColorDone} />
                    ) : nextDone ? (
                      <Clock size={Math.max(12, innerSize - 8)} className={iconColorDone} />
                    ) : (
                      <PackageIcon size={Math.max(12, innerSize - 8)} className={iconColorDone} />
                    )}
                  </div>
                </div>

                <div>
                  <div className={`font-medium ${done ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-500"}`}>{t.step}</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {t.date ? formatDateTime(t.date) : done ? "" : "Pending"}
                  </div>
                  {t.detail && <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4 text-sm text-neutral-500">
        Delivery Executive details will be available once the order is out for delivery
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex-1 flex gap-3">
          {showActions && !isDelivered && (
            <>
              <button onClick={onCancel} className={BTN + " flex-1 py-3 flex items-center justify-center gap-2"}>
                Cancel
              </button>
              <button onClick={onTrackAll} className={BTN + " flex-1 py-3 flex items-center justify-center gap-2"}>
                <Truck size={16} /> Track order
              </button>
            </>
          )}
          {showActions && isDelivered && (
            <button onClick={onRequestReturn} className={BTN + " flex-1 py-3 flex items-center justify-center gap-2"}>
              Return
            </button>
          )}
        </div>
        <div className="w-44" />
      </div>
    </div>
  );
}

// InvoiceTemplate, ConfirmModal, InputModal, InfoModal & parseJsonSafe (helpers)
function InvoiceTemplate({ order, pricing }) {
  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>Invoice</h2>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <div>
          <div>
            <strong>Order ID:</strong> {order.id}
          </div>
          <div>
            <strong>Placed:</strong> {formatDateTime(order.created_at)}
          </div>
        </div>
        <div>
          <div>
            <strong>Ship to:</strong>
          </div>
          <div>{order.shipping?.name}</div>
          <div style={{ maxWidth: 300 }}>{order.shipping?.address}</div>
        </div>
      </div>

      <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Item</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Qty</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((it) => (
            <tr key={it.id}>
              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.title}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>{it.qty}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>{currency(it.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 250 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>Subtotal</div>
            <div>{currency(order.pricing?.sellingPrice)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>Fees</div>
            <div>{currency(order.pricing?.fees)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8 }}>
            <div>Total</div>
            <div>{currency(pricing?.total ?? order.pricing?.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = "Confirm", onClose = () => {}, onConfirm = () => {} }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    return () => prev?.focus?.();
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700">
            <Info />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">{message}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className={BTN}>
                Cancel
              </button>
              <button onClick={() => onConfirm()} className="px-4 py-2 rounded-full bg-emerald-600 text-white">
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputModal({ open, title, initialShipping = { name: "", phone: "", address: "" }, onClose = () => {}, onConfirm = (val) => {} }) {
  const [name, setName] = useState(initialShipping?.name || "");
  const [phone, setPhone] = useState(initialShipping?.phone || "");
  const [address, setAddress] = useState(initialShipping?.address || "");

  useEffect(() => {
    setName(initialShipping?.name || "");
    setPhone(initialShipping?.phone || "");
    setAddress(initialShipping?.address || "");
  }, [initialShipping, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold">{title}</h3>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <label className="text-sm">
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient full name" className="mt-1 w-full p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900" />
          </label>

          <label className="text-sm">
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className="mt-1 w-full p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900" />
          </label>

          <label className="text-sm">
            Address
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat / House no., Street, Area, Landmark, City, State, PIN" className="mt-1 w-full p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900" rows={4} />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className={BTN}>
            Cancel
          </button>
          <button onClick={() => onConfirm({ name: name.trim(), phone: phone.trim(), address: address.trim() })} className={BTN}>
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoModal({ open, title = "", message = "", onClose = () => {} }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg max-w-sm w-full p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{message}</div>
            <div className="mt-3 text-right">
              <button onClick={onClose} className={BTN}>
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// -------------------- small helpers --------------------
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch (e) {
    const txt = await res.text().catch(() => "");
    return { message: txt || `HTTP ${res.status}` };
  }
}
