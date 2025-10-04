import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package as PackageIcon,
  CheckCircle,
  Clock,
  Info,
  Star,
  Download,
  Share2,
  XCircle,
} from "lucide-react";

/**
 * OrderDetailsPage - wired to backend endpoints
 *
 * Backend endpoints used:
 *  - GET  /api/user/orders/:id                  -> order details (JSON)
 *  - POST /api/user/orders/:id/cancel           -> cancel order
 *  - POST /api/user/orders/:id/return           -> request return
 *  - PUT  /api/user/orders/:id/address          -> update shipping address
 *  - POST /api/user/orders/:id/rating           -> submit rating for product
 *  - POST /api/shipping/track-order             -> { orderId } -> latest tracking info
 *
 * Adjust headers (auth) as needed in fetch calls below.
 */

// -------------------- utils --------------------
function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}
function currency(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

// -------------------- global button class --------------------
const BTN =
  "transition-all duration-200 font-medium rounded-full px-4 py-2 " +
  "bg-black text-white dark:bg-white dark:text-black " +
  "hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white " +
  "hover:ring-2 hover:ring-black dark:hover:ring-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus:outline-none";

// marker size in pixels (outer marker diameter)
const MARKER_SIZE_PX = 28; // outer marker diameter
const MARKER_INNER_OFFSET_PX = 6; // inner icon inset

// Tailwind left-6 roughly equals 24px (1.5rem)
const LEFT_6_PX = 24;

// -------------------- Main component --------------------
export default function OrderDetailsPage({ orderId = "40" }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showEditAddress, setShowEditAddress] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const invoiceRef = useRef(null);

  const [ratings, setRatings] = useState({});
  const [infoModal, setInfo] = useState({ open: false, title: "", message: "" });

  // ------------------ fetch order from backend ------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/user/orders/${encodeURIComponent(orderId)}`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            // Add Authorization header if your backend needs it:
            // "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Failed to fetch order: ${res.status} ${txt}`);
        }

        const data = await res.json();
        if (!mounted) return;
        setOrder(data);
      } catch (err) {
        console.error("Error loading order:", err);
        setInfo({ open: true, title: "Error", message: "Could not load order. Check network or try again." });
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
      const res = await fetch(`/api/user/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // body: JSON.stringify({ reason: "User cancelled" }), // optional
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Cancel failed (${res.status})`);

      // update optimistic UI using returned status if available
      setOrder((o) => ({
        ...o,
        status: payload?.status ?? "Cancelled",
        history: payload?.history ? [...(payload.history || []), ...(o.history || [])] : [{ id: Date.now(), time: new Date().toISOString(), title: "Cancelled", detail: payload?.message || "Order cancelled" }, ...o.history],
      }));

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
      const res = await fetch(`/api/user/orders/${encodeURIComponent(order.id)}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // body: JSON.stringify({ reason: "Product damaged" }), // optional
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Return failed (${res.status})`);

      setOrder((o) => ({
        ...o,
        status: payload?.status ?? "Return requested",
        history: payload?.history ? [...(payload.history || []), ...(o.history || [])] : [{ id: Date.now(), time: new Date().toISOString(), title: "Return requested", detail: payload?.message || "Return requested" }, ...o.history],
      }));

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
      const res = await fetch(`/api/user/orders/${encodeURIComponent(order.id)}/address`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shippingObj),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Address update failed (${res.status})`);

      setOrder((o) => ({
        ...o,
        shipping: { ...o.shipping, ...shippingObj },
        history: payload?.history ? [...payload.history, ...(o.history || [])] : [{ id: Date.now(), time: new Date().toISOString(), title: "Address updated", detail: shippingObj.address }, ...o.history],
      }));

      setInfo({ open: true, title: "Address updated", message: payload?.message ?? "Address updated" });
    } catch (err) {
      console.error("Update address error:", err);
      setInfo({ open: true, title: "Error", message: err.message || "Could not update address" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRating(productId) {
    if (!order) return;
    const r = ratings[productId];
    if (!r || !r.rating) {
      setInfo({ open: true, title: "Rating required", message: "Please choose a rating" });
      return;
    }
    setLoading(true);
    try {
      const body = {
        productId,
        rating: r.rating,
        review: r.review || "",
      };
      const res = await fetch(`/api/user/orders/${encodeURIComponent(order.id)}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Rating failed (${res.status})`);

      setOrder((o) => ({
        ...o,
        history: payload?.history ? [...payload.history, ...(o.history || [])] : [{ id: Date.now(), time: new Date().toISOString(), title: "Rating submitted", detail: `Product ${productId} rated ${r.rating}` }, ...o.history],
      }));

      setInfo({ open: true, title: "Thanks", message: payload?.message ?? "Rating submitted" });
      setRatings((s) => ({ ...s, [productId]: {} }));
    } catch (err) {
      console.error("Submit rating error:", err);
      setInfo({ open: true, title: "Error", message: err.message || "Could not submit rating" });
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
      const res = await fetch("/api/shipping/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) throw new Error(payload?.message || `Track API error (${res.status})`);

      // payload expected to include: tracking (array), status, courier, history
      setOrder((o) => ({
        ...o,
        tracking: payload.tracking ?? o.tracking,
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
    const shareText = `Order ${order.id} • ${order.items.length} items • ${currency(order.pricing.total)}`;
    if (navigator.share) {
      navigator.share({ title: `Order ${order.id}`, text: shareText }).catch(() => setInfo({ open: true, title: "Share", message: "Sharing cancelled or not supported" }));
    } else {
      navigator.clipboard?.writeText(`${shareText}\nView in your orders`).then(() => setInfo({ open: true, title: "Copied", message: "Order summary copied to clipboard" }), () => setInfo({ open: true, title: "Share", message: "Share not available" }));
    }
  }

  function contactCourier() {
    if (!order?.courier?.phone) {
      setInfo({ open: true, title: "No courier number", message: "Courier phone not available" });
      return;
    }
    setInfo({ open: true, title: "Contact courier", message: `Call ${order.courier.phone}` });
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
              <div className="text-sm text-neutral-500">{order.items.length} item(s)</div>
            </div>

            <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items.map((it) => (
                <div key={it.id} className="py-4">
                  <div className="flex items-center gap-4">
                    <img src={it.img} alt={it.title} className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-sm text-neutral-500">{it.options}</div>
                      <div className="text-sm text-neutral-500 mt-1">Seller: {it.seller}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{currency(it.price)}</div>
                      <div className="text-sm text-neutral-500">Qty: {it.qty}</div>
                    </div>
                  </div>

                  {isDelivered && (
                    <div className="mt-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded p-3">
                      <div className="text-sm font-medium mb-2">Rate this product</div>
                      <div className="flex items-start gap-3">
                        <StarRating value={(ratings[it.id] && ratings[it.id].rating) || 0} onChange={(v) => setRatings((r) => ({ ...r, [it.id]: { ...(r[it.id] || {}), rating: v } }))} />
                        <textarea
                          value={(ratings[it.id] && ratings[it.id].review) || ""}
                          onChange={(e) => setRatings((r) => ({ ...r, [it.id]: { ...(r[it.id] || {}), review: e.target.value } }))}
                          placeholder="Write a short review (optional)"
                          className="flex-1 p-2 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                        />
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handleSubmitRating(it.id)} className={BTN + " flex items-center gap-2"}>
                          <Star size={14} /> Submit rating
                        </button>
                        <button onClick={() => setRatings((r) => ({ ...r, [it.id]: {} }))} className={BTN + " flex items-center gap-2"}>
                          <XCircle size={14} /> Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right - Sidebar */}
        <aside className="space-y-6 sticky top-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Delivery details</div>
              <div className="text-sm text-neutral-400">AWB: {order.courier?.awb}</div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3">
                <div className="text-sm text-neutral-500">Home</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200">{order.shipping?.address}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-neutral-500">{order.shipping?.name} • {order.shipping?.phone}</div>
                  <div>
                    {!isPacked && (
                      <button onClick={() => setShowEditAddress(true)} className={BTN + " text-sm px-3 py-1"}>Edit</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Courier</div>
                  <div className="text-sm font-medium">{order.courier?.name}</div>
                  <div className="text-sm text-neutral-500">{order.courier?.exec?.name} • {order.courier?.exec?.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{order.courier?.exec?.eta}</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <button onClick={contactCourier} className={BTN + " text-sm px-3 py-1"}>Call</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price details */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Price details</div>
              <div className="text-sm text-neutral-400">Items: {order.items.length}</div>
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

              <div className="mt-3 text-sm text-neutral-500">Paid by <strong className="ml-1">{order.paymentMethod}</strong></div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2">
                <button onClick={handleShare} className={BTN + " flex-1 py-2 flex items-center justify-center gap-2"}>
                  <Share2 size={16} /> Share
                </button>
                <button onClick={() => setInfo({ open: true, title: "Download invoice", message: "Downloading invoice..." })} className={BTN + " py-2 px-3 flex items-center gap-2"}>
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
        <ConfirmModal open={!!showCancel} title="Cancel order" message="Are you sure you want to cancel this order?" confirmLabel="Yes, cancel" onClose={() => setShowCancel(false)} onConfirm={async () => { setShowCancel(false); await handleCancel(); }} />
        <ConfirmModal open={!!showReturn} title="Request return" message="Do you want to request a return for this order?" confirmLabel="Request return" onClose={() => setShowReturn(false)} onConfirm={async () => { setShowReturn(false); await handleRequestReturn(); }} />

        <InputModal
          open={!!showEditAddress}
          title="Edit shipping address"
          initialShipping={order.shipping}
          onClose={() => setShowEditAddress(false)}
          onConfirm={async (newShipping) => { setShowEditAddress(false); await handleSaveAddress(newShipping); }}
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
 * TimelineCard - measured overlay for perfect alignment
 */
function TimelineCard({ order, onCancel, onRequestReturn, onTrackAll, isDelivered }) {
  const timelineRef = useRef(null);
  const markersRef = useRef([]);
  const [overlayRect, setOverlayRect] = useState(null); // { leftPx, topPx, heightPx }

  const innerSize = MARKER_SIZE_PX - MARKER_INNER_OFFSET_PX;

  // If order is cancelled, render simple two-step timeline
  const isCancelled = order.status && order.status.toLowerCase() === "cancelled";
  const cancelledTracking = isCancelled
    ? [
        { step: "Order confirmed", date: order.history?.find((h) => h.title?.toLowerCase().includes("order"))?.time || null, done: true, detail: "Payment verified" },
        { step: "Cancelled", date: order.history?.find((h) => h.title?.toLowerCase().includes("cancel"))?.time || new Date().toISOString(), done: true, detail: "Order cancelled" },
      ]
    : null;

  const trackingToUse = cancelledTracking ?? (order.tracking ?? []);

  // compute last done index
  const lastDoneIndex = trackingToUse.map((t) => t.done).lastIndexOf(true);

  // measure positions (centers) and compute overlay top/height in px
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

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="text-neutral-600 dark:text-neutral-300" />
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Tracking status</div>
            <div className="font-semibold">{order.status}</div>
          </div>
        </div>
        <div />
      </div>

      <div className="mt-6 relative" ref={timelineRef}>
        {/* base spine (neutral, behind) */}
        <div
          className="absolute top-0 bottom-0 w-[4px] bg-neutral-100 dark:bg-neutral-800 z-0"
          style={{ left: `${spineLeftForCSS}px` }}
        />

        {/* progress overlay (animated via Framer Motion) */}
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
              backgroundColor: "rgb(16,185,129)",
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
            const isCancelStep = t.step.toLowerCase().includes("cancel");

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
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t.date ? formatDateTime(t.date) : done ? "" : "Pending"}</div>
                  {t.detail && <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t.detail}</div>}

                  {t.step.toLowerCase().includes("shipped") && done && (
                    <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded p-3 text-sm text-neutral-700 dark:text-neutral-200">
                      Your item has arrived at a delivery partner facility — {t.date ? new Date(t.date).toLocaleDateString() : ""}
                    </div>
                  )}
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
          {!isDelivered && order.status.toLowerCase() !== "cancelled" ? (
            <button onClick={onCancel} className={BTN + " flex-1 py-3 flex items-center justify-center gap-2"}>
              Cancel
            </button>
          ) : (
            <button onClick={onRequestReturn} className={BTN + " flex-1 py-3 flex items-center justify-center gap-2"}>
              Request Return
            </button>
          )}

          <button onClick={onTrackAll} className={BTN + " py-3 flex items-center gap-2"}>
            <Truck size={16} /> Track order
          </button>
        </div>

        <div className="w-44" />
      </div>
    </div>
  );
}

// Invoice Template (simple)
function InvoiceTemplate({ order, pricing }) {
  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>Invoice</h2>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <div>
          <div><strong>Order ID:</strong> {order.id}</div>
          <div><strong>Placed:</strong> {formatDateTime(order.placedAt)}</div>
        </div>
        <div>
          <div><strong>Ship to:</strong></div>
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
          <div style={{ display: "flex", justifyContent: "space-between" }}><div>Subtotal</div><div>{currency(order.pricing?.sellingPrice)}</div></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><div>Fees</div><div>{currency(order.pricing?.fees)}</div></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8 }}><div>Total</div><div>{currency(pricing?.total ?? order.pricing?.total)}</div></div>
        </div>
      </div>
    </div>
  );
}

// Star rating component
function StarRating({ value = 0, onChange = () => {} }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} star`} className="focus:outline-none">
          <Star size={18} className={n <= value ? "text-yellow-400" : "text-neutral-400 dark:text-neutral-500"} />
        </button>
      ))}
    </div>
  );
}

// Confirm modal
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
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700"><Info /></div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">{message}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className={BTN}>Cancel</button>
              <button onClick={() => onConfirm()} className="px-4 py-2 rounded-full bg-emerald-600 text-white">{confirmLabel}</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Input modal (edit address form)
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
          <button onClick={onClose} className={BTN}>Cancel</button>
          <button onClick={() => onConfirm({ name: name.trim(), phone: phone.trim(), address: address.trim() })} className={BTN}>Save</button>
        </div>
      </motion.div>
    </div>
  );
}

// Info modal
function InfoModal({ open, title = "", message = "", onClose = () => {} }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg max-w-sm w-full p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle /></div>
          <div className="flex-1">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{message}</div>
            <div className="mt-3 text-right">
              <button onClick={onClose} className={BTN}>Close</button>
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
