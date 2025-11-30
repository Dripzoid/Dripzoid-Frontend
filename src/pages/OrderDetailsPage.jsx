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
import Reviews from "../components/Reviews";

/**
 * OrderDetailsPage.jsx
 * - Modern Tailwind UI + full original logic
 * - Shiprocket-first tracking on load; DB fallback.
 * - Coupon discount computed from product sum + COD (25) if not present in payload.
 *
 * NOTE:
 * - Ensure REACT_APP_API_BASE is set in env or adjust API_BASE below.
 * - This file is large by purpose (you requested full, un-omitted file).
 */

// ----------------------------- Config / Helpers -----------------------------
const API_BASE = process.env.REACT_APP_API_BASE || "";
const apiUrl = (path = "") => {
  if (!path.startsWith("/")) path = `/${path}`;
  const combined = API_BASE ? `${API_BASE}${path}` : path;
  return combined.replace(/([^:]\/)\/+/g, "$1");
};

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

function formatDateTime(iso) {
  if (!iso) return "";
  let d = iso;
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(iso)) {
    d = iso.replace(" ", "T");
  }
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(iso);
  }
}
function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

const BTN =
  "transition-all duration-200 font-medium rounded-full px-3 py-1 " +
  "bg-black text-white dark:bg-white dark:text-black " +
  "hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white " +
  "hover:ring-2 hover:ring-black dark:hover:ring-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus:outline-none";

// -------------------- Shiprocket normalizer --------------------
/**
 * Accepts various shapes:
 *  - payload.tracking (your server wrapper): { success, tracking: {...} }
 *  - raw Shiprocket payload (tracking_data / shipment_track / shipment_track_activities)
 *  - already-normalized object (status + tracking array)
 *
 * Returns normalized:
 *  {
 *    status: "confirmed"|"packed"|"shipped"|"out for delivery"|"delivered"|"rto",
 *    progressIndex: 0..4,
 *    tracking: [ { step, done, date } ... ],
 *    activities: [ { date, status, location, description, raw } ],
 *    courier: { name, awb },
 *    history: [ { title, time }, ... ],
 *    raw: originalTrackingData
 *  }
 */
function normalizeShiprocketResponse(resp) {
  if (!resp) return { status: "confirmed", progressIndex: 0, tracking: [], activities: [], courier: {}, history: [], raw: resp };

  // If the server wrapped Shiprocket under `tracking` (your example)
  if (resp.tracking && typeof resp.tracking === "object") {
    resp = resp.tracking;
  }

  // If already normalized shape (quick heuristic)
  if (resp && typeof resp === "object" && !resp.tracking_data && Array.isArray(resp.tracking)) {
    return {
      status: resp.status ?? "confirmed",
      progressIndex: (() => {
        const map = { confirmed: 0, packed: 1, shipped: 2, "out for delivery": 3, delivered: 4 };
        return map[(resp.status || "confirmed").toLowerCase()] ?? 0;
      })(),
      tracking: resp.tracking,
      activities: resp.activities ?? [],
      courier: resp.courier ?? {},
      history: resp.history ?? [],
      raw: resp.raw ?? resp,
    };
  }

  // Accept many variants: resp.tracking_data, resp.shipment_track, resp.shipment_track_activities, or raw resp itself
  const root = Array.isArray(resp) ? resp[0]?.tracking_data ?? resp[0] ?? {} : resp?.tracking_data ?? resp ?? {};
  const td = root || {};

  // Support when the server returns fields at top (like your example)
  const shipment = Array.isArray(td.shipment_track) && td.shipment_track.length ? td.shipment_track[0] : td.shipment_track || {};

  // activities arrays might be named shipment_track_activities or an activities array
  const activitiesRaw = Array.isArray(td.shipment_track_activities)
    ? td.shipment_track_activities
    : Array.isArray(td.shipment_track?.[0]?.activities)
    ? td.shipment_track?.[0]?.activities
    : Array.isArray(td.activities)
    ? td.activities
    : [];

  const activities = (activitiesRaw || []).map((a) => ({
    date: a.date || a.time || a.timestamp || a.updated_time_stamp || null,
    status: a.status || a.activity || a["sr-status-label"] || "",
    location: a.location || "",
    description: a.description || a.activity || "",
    raw: a,
  }));

  function findActivityDate(acts, re) {
    if (!Array.isArray(acts)) return null;
    for (const a of acts) {
      const combined = `${a.status || ""} ${a.activity || ""} ${a["sr-status-label"] || ""}`.toLowerCase();
      if (re.test(combined)) return a.date || a.time || a.timestamp || a.updated_time_stamp || null;
    }
    return null;
  }

  let progressIndex = 0;
  const latestAct = activities[0] || {};
  const lastSrLabel = (latestAct["sr-status-label"] || latestAct.status || "").toString();
  const lastSr = latestAct["sr-status"] ?? latestAct.sr_status ?? null;
  const current_status = (shipment.current_status || td.current_status || td.current_status || "").toString().toLowerCase();

  if (/delivered/i.test(current_status) || /delivered/i.test(lastSrLabel) || lastSr === 7) {
    progressIndex = 4;
  } else if (/out\s*for\s*delivery/i.test(current_status) || /out for delivery/i.test(lastSrLabel) || lastSr === 17) {
    progressIndex = 3;
  } else if (/arrivedatcarrierfacility|in transit/i.test(lastSrLabel.toLowerCase()) || /arrivedatcarrierfacility/i.test((latestAct.status || "").toString().toLowerCase()) || lastSr === 18 || lastSr === 38) {
    progressIndex = 2;
  } else if (/readyforreceive|ready for receive/i.test((latestAct.status || "").toString().toLowerCase())) {
    progressIndex = 1;
  } else if ((!shipment || !shipment.awb_code || !(shipment.current_status || "").trim()) && (td.track_status === 0 || td.track_status === "0" || td.error)) {
    progressIndex = 0;
  } else if (shipment.pickup_date) {
    progressIndex = 2;
  } else {
    progressIndex = 0;
  }

  // history matches TimelineCard titles
  const history = [];
  const packedDate = findActivityDate(activitiesRaw, /readyforreceive|ready for receive|ready_for_receive/i);
  if (packedDate) history.push({ title: "Packed", time: packedDate });

  if (shipment.pickup_date) history.push({ title: "Shipped", time: shipment.pickup_date });
  else {
    const shippedAct = findActivityDate(activitiesRaw, /arrivedatcarrierfacility|in transit|departed/i);
    if (shippedAct) history.push({ title: "Shipped", time: shippedAct });
  }

  const ofd = findActivityDate(activitiesRaw, /outfordelivery|out for delivery|out_for_delivery|outfor delivery/i);
  if (ofd) history.push({ title: "Out For Delivery", time: ofd });

  if (shipment.delivered_date) history.push({ title: "Delivered", time: shipment.delivered_date });
  else {
    const delAct = findActivityDate(activitiesRaw, /delivered/i);
    if (delAct) history.push({ title: "Delivered", time: delAct });
  }

  const returnAct = findActivityDate(activitiesRaw, /returninitiated|rto/i);
  if (returnAct) history.push({ title: "Return initiated", time: returnAct });

  // steps fallback
  const steps = [
    { step: "Order Confirmed", idx: 0, date: null },
    { step: "Packed", idx: 1, date: packedDate || null },
    { step: "Shipped", idx: 2, date: shipment.pickup_date || null },
    { step: "Out For Delivery", idx: 3, date: ofd || null },
    { step: "Delivered", idx: 4, date: shipment.delivered_date || null },
  ];
  const tracking = steps.map((s) => ({ step: s.step, done: s.idx <= progressIndex, date: s.date, detail: "" }));

  const courier = { name: shipment.courier_name || td.courier_name || shipment.courier || "", awb: shipment.awb_code || shipment.awb || "" };

  const statusName =
    progressIndex === 4
      ? "delivered"
      : progressIndex === 3
      ? "out for delivery"
      : progressIndex === 2
      ? "shipped"
      : progressIndex === 1
      ? "packed"
      : "confirmed";

  return {
    status: statusName,
    progressIndex,
    tracking,
    activities,
    courier,
    history,
    raw: td,
  };
}

// -------------------- Order normalizer (API -> UI) --------------------
function normalizeApiOrder(payload) {
  if (!payload) return null;

  const pricing = {
    total: payload.total_amount ?? (payload.pricing && payload.pricing.total) ?? payload.total ?? 0,
    sellingPrice: (payload.total_amount ?? payload.pricing?.sellingPrice) ?? 0,
    listingPrice: payload.pricing?.listingPrice ?? payload.total_amount ?? 0,
    fees: payload.pricing?.fees ?? 0,
    extraDiscount: payload.pricing?.extraDiscount ?? 0,
    specialPrice: payload.pricing?.specialPrice ?? 0,
    otherDiscount: payload.pricing?.otherDiscount ?? 0,
    // couponDiscount might be present; if not, we'll compute later
    couponDiscount: payload.pricing?.couponDiscount ?? payload.pricing?.coupon ?? payload.pricing?.otherDiscount ?? 0,
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
    tracking: payload.tracking ?? payload.tracking_info ?? payload.tracking ?? [],
    courier: payload.courier ?? null,
    history: payload.history ?? [],
    raw: payload,
  };
}

// -------------------- Main component --------------------
export default function OrderDetailsPage({ orderId: propOrderId }) {
  const [orderId] = useState(() => {
    if (propOrderId) return String(propOrderId);
    if (typeof window === "undefined") return "38";
    const path = window.location.pathname || "";
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

  const [currentUser, setCurrentUser] = useState(null);
  const [openReviews, setOpenReviews] = useState({});

  // Track modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);

  // ------------------ initial load: fetch order then attempt tracking ------------------
  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const url = apiUrl(`/api/user/orders/${encodeURIComponent(orderId)}`);
        const res = await fetch(url, {
          method: "GET",
          headers: authHeaders(false),
          credentials: "same-origin",
          signal: ac.signal,
        });

        const payload = await parseJsonSafe(res);
        if (!res.ok) {
          console.error("Failed to fetch order:", payload?.message || `HTTP ${res.status}`);
          throw new Error(payload?.message || `Failed to fetch order: ${res.status}`);
        }

        const normalized = normalizeApiOrder(payload);
        if (!mounted) return;
        setOrder(normalized);

        // Immediately attempt to fetch Shiprocket tracking and use it to set status/timeline (no modal)
        // If track fails, keep DB order as-is (fallback)
        await fetchTrackAndMerge(normalized.id, false);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error loading order:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [orderId]);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("current_user") || "null");
      setCurrentUser(u);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // -------------------- Pricing compute with coupon fallback --------------------
  const computedPricing = useMemo(() => {
    if (!order) return null;
    // product price (sum of items)
    const productPrice = (order.items || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
    const fees = Number(order.pricing?.fees || 0);
    // shippingCharge: COD -> 25
    const shippingCharge = (order.paymentMethod || "").toString().toLowerCase() === "cod" ? 25 : 0;

    // reported total from API (try multiple keys)
    const reportedTotal = Number(order.pricing?.total ?? order.pricing?.total_amount ?? order.raw?.total_amount ?? order.raw?.total ?? order.raw?.pricing?.total ?? 0);

    // compute coupon discount if not provided or seems inconsistent:
    // compute expected sum = productPrice + fees + shippingCharge
    const expectedSum = productPrice + fees + shippingCharge;

    // server coupon (if present)
    let serverCoupon = Number(order.pricing?.couponDiscount ?? order.pricing?.coupon ?? order.pricing?.otherDiscount ?? 0);

    // If serverCoupon is missing or zero and reportedTotal exists and expectedSum > reportedTotal -> infer coupon
    if ((!serverCoupon || serverCoupon === 0) && reportedTotal > 0 && expectedSum - reportedTotal > 0) {
      serverCoupon = Math.max(0, expectedSum - reportedTotal);
    }

    // final couponDiscount
    const couponDiscount = Math.max(0, serverCoupon || 0);

    // final total: prefer reportedTotal when present, else calculate
    const total = reportedTotal > 0 ? reportedTotal : Math.max(0, expectedSum - couponDiscount);

    return {
      productPrice,
      fees,
      couponDiscount,
      shippingCharge,
      total,
    };
  }, [order]);

  // ------------------ backend-integrated actions ------------------
  async function handleCancel() {
    if (!order) return;
    const prevOrder = order;
    const nowIso = new Date().toISOString();
    const optimistic = {
      ...order,
      status: "cancelled",
      history: [...(order.history || []), { title: "Cancelled", time: nowIso }],
      tracking: [...(order.tracking || []), { step: "Cancelled", done: true, time: nowIso }],
    };
    setOrder(optimistic);
    setShowCancel(false);
    setLoading(true);

    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/cancel`);
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders(true),
        credentials: "same-origin",
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) {
        console.error("Cancel failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Cancel failed (${res.status})`);
      }

      const normalized = normalizeApiOrder(payload?.order ?? payload) ?? { ...order, status: payload?.status ?? "cancelled" };
      setOrder((o) => ({ ...o, ...normalized }));
    } catch (err) {
      console.error("Cancel error:", err);
      setOrder(prevOrder);
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
      if (!res.ok) {
        console.error("Return failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Return failed (${res.status})`);
      }

      const normalized = normalizeApiOrder(payload?.order ?? payload) ?? order;
      setOrder((o) => ({ ...o, ...normalized }));
    } catch (err) {
      console.error("Return error:", err);
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
      if (!res.ok) {
        console.error("Address update failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Address update failed (${res.status})`);
      }

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
    } catch (err) {
      console.error("Update address error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ------------------ Track order (used for both initial load and manual track) ------------------
  // openModal: if true, open the track modal showing detailed activities and shipment_track
  async function fetchTrackAndMerge(orderIdToTrack, openModal = false) {
    if (!orderIdToTrack) {
      console.warn("Track order: no orderId");
      return;
    }
    setLoading(true);
    try {
      const url = apiUrl(`/api/shipping/track-order`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...authHeaders(true),
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ order_id: orderIdToTrack }),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok && !payload) {
        throw new Error(`Track API failed: HTTP ${res.status}`);
      }

      // payload could be { success, tracking: {...} } (your example)
      // or raw Shiprocket shape (tracking_data / shipment_track / activities)
      // or normalized shape.

      const isWrapped = payload && payload.tracking;
      const rawCandidate = isWrapped ? payload.tracking : payload;

      const isShiprocketRaw =
        rawCandidate && (rawCandidate.tracking_data || rawCandidate.shipment_track || rawCandidate.shipment_track_activities || Array.isArray(rawCandidate));

      let normalizedTrack;
      if (isShiprocketRaw) {
        normalizedTrack = normalizeShiprocketResponse(rawCandidate);
      } else {
        // assume server returned normalized shape
        normalizedTrack = {
          status: rawCandidate.status ?? rawCandidate.tracking?.status ?? order?.status,
          tracking: rawCandidate.tracking ?? order?.tracking ?? [],
          activities: rawCandidate.activities ?? [],
          courier: rawCandidate.courier ?? order?.courier ?? {},
          history: rawCandidate.history ?? [],
          raw: rawCandidate,
        };
      }

      // Merge into order (server-wins for tracking info)
      setOrder((prev) => ({
        ...prev,
        tracking: normalizedTrack.tracking ?? prev?.tracking,
        status: normalizedTrack.status ?? prev?.status,
        courier: { ...(prev?.courier || {}), ...(normalizedTrack.courier || {}) },
        history: normalizedTrack.history ? [...normalizedTrack.history, ...(prev?.history || [])] : prev?.history,
        raw_tracking: normalizedTrack.raw ?? prev?.raw_tracking,
      }));

      // If user requested modal, prepare info and open
      const infoForModal = {
        shipment_track:
          (normalizedTrack.raw && normalizedTrack.raw.shipment_track) ||
          normalizedTrack.raw?.shipment_track ||
          (Array.isArray(normalizedTrack.raw) ? normalizedTrack.raw[0]?.shipment_track : undefined) ||
          [],
        shipment_track_activities: normalizedTrack.raw?.shipment_track_activities || normalizedTrack.activities || [],
        courier_name: normalizedTrack.courier?.name || "",
        awb_code: normalizedTrack.courier?.awb || "",
        current_status: normalizedTrack.status || "",
        origin: (normalizedTrack.raw?.shipment_track?.[0]?.origin) || "",
        destination: (normalizedTrack.raw?.shipment_track?.[0]?.destination) || "",
        etd: normalizedTrack.raw?.etd || normalizedTrack.raw?.shipment_track?.[0]?.edd || "",
        raw: normalizedTrack.raw || payload,
        status: normalizedTrack.status,
      };

      setTrackInfo(infoForModal);
      if (openModal) setShowTrackModal(true);
    } catch (err) {
      console.error("Track order failed:", err);
      // fallback: if order already has raw tracking, use that to show modal (if openModal requested)
      if (openModal && (order?.raw_tracking || order?.raw?.shipment_track || order?.raw?.shipment_track_activities)) {
        const raw = order.raw_tracking || order.raw;
        const fallback = {
          shipment_track: raw?.shipment_track || [],
          shipment_track_activities: raw?.shipment_track_activities || [],
          courier_name: raw?.courier_name || order?.courier?.name || "",
          awb_code: raw?.shipment_track?.[0]?.awb_code || order?.courier?.awb || "",
          current_status: order?.status || "",
          raw,
        };
        setTrackInfo(fallback);
        setShowTrackModal(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // wrapper used when user clicks Track button
  async function handleTrackOrder() {
    if (!order?.id) {
      console.warn("no order to track");
      return;
    }
    await fetchTrackAndMerge(order.id, true);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setShowCancel(false);
        setShowReturn(false);
        setShowEditAddress(false);
        setShowTrackModal(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleShare() {
    if (!order) return;
    const shareText = `Order ${order.id} • ${order.items?.length ?? 0} items • ${currency(computedPricing?.total ?? order.pricing?.total)}`;
    if (navigator.share) {
      navigator.share({ title: `Order ${order.id}`, text: shareText }).catch(() => {
        console.warn("Sharing cancelled or not supported");
      });
    } else {
      navigator.clipboard
        ?.writeText(`${shareText}\nView in your orders`)
        .then(() => console.log("Order summary copied to clipboard"))
        .catch(() => console.warn("Share not available"));
    }
  }

  function contactCourier() {
    if (!order?.courier?.phone) {
      console.warn("Courier phone not available");
      return;
    }
    window.location.href = `tel:${order.courier.phone}`;
  }

  async function handleDownloadInvoice() {
    if (!order?.id) {
      console.warn("No order available to download invoice.");
      return;
    }
    setLoading(true);
    try {
      const url = apiUrl(`/api/shipping/download-invoice`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...authHeaders(true),
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ order_id: order.id }),
      });

      if (!res.ok) {
        const payload = await parseJsonSafe(res);
        console.error("Invoice download failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Invoice download failed (${res.status})`);
      }

      const blob = await res.blob();
      const filename = `invoice-${order.id}.pdf`;
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      console.log("Invoice downloaded.");
    } catch (err) {
      console.error("Download invoice failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // Loading state UI
  if (loading || !order) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  // derived booleans
  const isDelivered =
    (order.status || "").toString().toLowerCase() === "delivered" ||
    order.tracking?.some?.((t) => (t.step || t.status)?.toString().toLowerCase() === "delivered" && (t.done || t.status === "delivered"));
  const isPacked = (order.status || "").toString().toLowerCase() === "packed";
  const isCancelled = (order.status || "").toString().toLowerCase() === "cancelled";

  // Timeline steps for the stepper
  const timelineSteps = isCancelled ? ["Order Confirmed", "Cancelled"] : ["Order Confirmed", "Packed", "Shipped", "Out For Delivery", "Delivered"];

  // Determine progress index from order.status matched to map
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

  // Build trackingToUse similar to previous TimelineCard logic
  const trackingToUse = timelineSteps.map((step, idx) => {
    const done = idx <= progressIndex;

    const detailRaw =
      step.toLowerCase().includes("cancel")
        ? "Order cancelled"
        : step.toLowerCase().includes("confirmed")
        ? "Order placed successfully."
        : step.toLowerCase().includes("packed")
        ? "Order packed and waiting for shipping partner to pickup."
        : step.toLowerCase().includes("shipped")
        ? "Shipped successfully — waiting for delivery partner to pick up."
        : step.toLowerCase().includes("out for delivery")
        ? "Out for delivery — with delivery partner."
        : step.toLowerCase().includes("delivered")
        ? "Delivered successfully. Share your feedback through review."
        : "";

    const date =
      idx === progressIndex
        ? order.history?.find((h) => (h.title || "").toString().toLowerCase().includes(step.toLowerCase()))?.time || order.created_at || null
        : null;

    const detail = idx === progressIndex && done ? detailRaw : "";

    return {
      step,
      done,
      date,
      detail,
    };
  });

  // ---------------- UI - Modern layout ----------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-100">
      <div className="border-b backdrop-blur bg-white/70 dark:bg-neutral-900/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Home &gt; My Account &gt; My Orders &gt; <span className="font-mono">{order.id}</span></div>
            <h1 className="text-lg font-semibold tracking-tight mt-1">Order #{order.id}</h1>
            <div className="mt-1 text-sm text-neutral-500">Placed: {formatDateTime(order.created_at)}</div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <button onClick={handleShare} className="px-3 py-2 rounded-full border bg-white dark:bg-neutral-900 text-sm">Share</button>
            <button onClick={handleDownloadInvoice} className="px-3 py-2 rounded-full border bg-white dark:bg-neutral-900 text-sm flex items-center gap-2">
              <Download size={14} /> Invoice
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-8">
          {/* Tracking Card */}
          <div className="bg-white dark:bg-neutral-900 shadow-lg border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Truck className="text-neutral-600 dark:text-neutral-300" />
                  <div>
                    <div className="text-sm text-neutral-500">Tracking status</div>
                    <div className="font-semibold capitalize">{order.status || "Order Confirmed"}</div>
                  </div>
                </div>
                <div className="text-xs text-neutral-500 mt-2">Delivery Executive details will be available once the order is out for delivery</div>
              </div>

              <div className="text-sm text-neutral-500">
                AWB: {order.courier?.awb ?? order.raw_tracking?.shipment_track?.[0]?.awb_code ?? "—"}
                <div className="mt-2">{order.courier?.name ?? order.raw_tracking?.shipment_track?.[0]?.courier_name ?? "—"}</div>
              </div>
            </div>

            <div className="mt-6">
              <ModernStepper steps={timelineSteps} activeIndex={progressIndex} />
            </div>

            <div className="mt-4 flex gap-3">
              {!isCancelled && !isDelivered && (
                <>
                  <button onClick={() => setShowCancel(true)} className={`${BTN} flex-1 py-2 flex items-center justify-center gap-2 text-sm`}>
                    Cancel
                  </button>
                  <button onClick={handleTrackOrder} className={`${BTN} flex-1 py-2 flex items-center justify-center gap-2 text-sm`}>
                    <Truck size={16} /> Track order
                  </button>
                </>
              )}

              {!isCancelled && isDelivered && (
                <button onClick={() => setShowReturn(true)} className={`${BTN} flex-1 py-2 flex items-center justify-center gap-2 text-sm`}>
                  Return
                </button>
              )}

              {isCancelled && <div className="text-sm text-red-600 italic px-2">This order has been cancelled.</div>}
            </div>
          </div>

          {/* Items Card */}
          <div className="bg-white dark:bg-neutral-900 shadow-md border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Items in this order</h3>
              <div className="text-sm text-neutral-500">{order.items?.length ?? 0} item(s)</div>
            </div>

            <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items?.map((it) => (
                <div key={it.id || `${it.title}-${Math.random()}`} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-full sm:w-auto flex items-center gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-gray-50">
                      <img
                        src={it.img || "/placeholder.png"}
                        alt={it.title}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-sm text-neutral-500">{it.options || "—"}</div>
                      <div className="text-sm text-neutral-500 mt-1">Seller: {it.seller || "—"}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{currency(it.price)}</div>
                      <div className="text-sm text-neutral-500">Qty: {it.qty}</div>
                    </div>

                    {isDelivered && !isCancelled && (
                      <div className="flex-shrink-0">
                        <button
                          onClick={() =>
                            setOpenReviews((prev) => ({ ...(prev || {}), [String(it.id)]: !Boolean(prev?.[String(it.id)]) }))
                          }
                          className={`${BTN} text-sm px-3 py-1`}
                        >
                          Submit review
                        </button>
                      </div>
                    )}
                  </div>

                  {openReviews[String(it.id)] && (
                    <div className="mt-4">
                      <Reviews productId={it.id} apiBase={API_BASE} currentUser={currentUser} showToast={(m) => console.log("Review:", m)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Delivery details</h3>
              <div className="text-sm text-neutral-400">AWB: {order.courier?.awb ?? "—"}</div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3">
                <div className="text-sm text-neutral-500">Home</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200 break-words">{order.shipping?.address || "—"}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-neutral-500">
                    {order.shipping?.name || "—"} • {order.shipping?.phone || "—"}
                  </div>
                  <div>
                    {!isPacked && !isCancelled && (
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

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Price details</h3>
              <div className="text-sm text-neutral-400">Items: {order.items?.length ?? 0}</div>
            </div>

            <div className="mt-3 text-sm space-y-2">
              <div className="flex justify-between">
                <div>Product price</div>
                <div>{currency(computedPricing?.productPrice ?? 0)}</div>
              </div>

              <div className="flex justify-between text-neutral-500">
                <div>Fees</div>
                <div>{currency(computedPricing?.fees ?? order.pricing?.fees ?? 0)}</div>
              </div>

              <div className="flex justify-between">
                <div>Shipping</div>
                <div>{currency(computedPricing?.shippingCharge ?? 0)}</div>
              </div>

              {computedPricing?.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <div>Coupon discount</div>
                  <div>-{currency(computedPricing?.couponDiscount ?? 0)}</div>
                </div>
              )}

              <div className="mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
                <div className="font-semibold">Total amount</div>
                <div className="font-semibold">{currency(computedPricing?.total ?? order.pricing?.total)}</div>
              </div>

              <div className="mt-3 text-sm text-neutral-500">
                Paid by <strong className="ml-1">{order.paymentMethod ?? "—"}</strong>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2">
                <button onClick={handleShare} className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}>
                  <Share2 size={16} /> Share
                </button>
                <button onClick={handleDownloadInvoice} className={BTN + " flex-1 py-2 px-3 flex items-center justify-center gap-2 text-sm"}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Modals */}
        {showInvoice && (
          <div className="hidden" aria-hidden>
            <div ref={invoiceRef}>
              <InvoiceTemplate order={order} pricing={computedPricing} />
            </div>
          </div>
        )}

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

        <TrackModal open={showTrackModal} info={trackInfo} onClose={() => setShowTrackModal(false)} />
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

function StatusBadge({ status }) {
  const map = {
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-300",
    shipped: "bg-blue-100 text-blue-800 border-blue-300",
    "out for delivery": "bg-indigo-100 text-indigo-800 border-indigo-300",
    packed: "bg-amber-100 text-amber-800 border-amber-300",
    confirmed: "bg-neutral-100 text-neutral-700 border-neutral-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };
  const cls = map[(status || "").toLowerCase()] || map.confirmed;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {(status || "Confirmed").toString().toUpperCase()}
    </span>
  );
}

function ModernStepper({ steps, activeIndex }) {
  return (
    <div className="relative flex justify-between items-center w-full py-6">
      <div className="absolute top-1/2 left-0 right-0 h-[4px] bg-neutral-200 dark:bg-neutral-800 -translate-y-1/2" />

      {steps.map((step, i) => {
        const isActive = i <= activeIndex;
        return (
          <div key={i} className="relative z-10 flex flex-col items-center text-center w-full">
            <div
              className={`w-9 h-9 flex items-center justify-center rounded-full border-2 shadow-sm transition-all duration-200
              ${isActive ? "bg-black text-white border-black" : "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600"}`}
            >
              {isActive ? <CheckCircle size={16} /> : <PackageIcon size={16} />}
            </div>
            <p
              className={`mt-2 text-xs font-medium transition-all duration-200 ${isActive ? "text-black dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}
            >
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ConfirmModal (non-blocking backdrop pattern)
function ConfirmModal({ open, title, message, confirmLabel = "Confirm", onClose = () => {}, onConfirm = () => {} }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    return () => prev?.focus?.();
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="pointer-events-auto mx-auto relative top-1/4 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700">
            <Info />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">{message}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className={BTN + " text-sm px-3 py-1"}>
                Cancel
              </button>
              <button onClick={() => onConfirm()} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-sm">
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// InputModal (Edit shipping address)
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
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pointer-events-auto mx-auto relative top-1/6 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-lg w-full p-6">
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
          <button onClick={onClose} className={BTN + " text-sm px-3 py-1"}>
            Cancel
          </button>
          <button onClick={() => onConfirm({ name: name.trim(), phone: phone.trim(), address: address.trim() })} className={BTN + " text-sm px-3 py-1"}>
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* TrackModal: shows shipment_track and shipment_track_activities (pure Tailwind) */
function TrackModal({ open, info, onClose }) {
  if (!open) return null;

  const shipmentTrack = info?.shipment_track ?? info?.shipmentTrack ?? [];
  const activities = info?.shipment_track_activities ?? info?.shipmentTrackActivities ?? [];
  const rawError = info?.raw?.error ?? info?.error ?? "";

  return (
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pointer-events-auto mx-auto relative top-8 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Track order</h3>
            <div className="text-sm text-neutral-500">Latest shipment information</div>
          </div>
          <div>
            <button onClick={onClose} className="text-sm underline text-neutral-500">Close</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-4">
            <div className="text-sm text-neutral-500">Courier</div>
            <div className="font-medium">{info?.courier_name ?? info?.courier?.name ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">AWB</div>
            <div className="font-medium">{info?.awb_code ?? info?.courier?.awb ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">Current status</div>
            <div className="font-medium">{info?.current_status ?? info?.status ?? "-"}</div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-4">
            <div className="text-sm text-neutral-500">Origin</div>
            <div className="font-medium">{info?.origin ?? info?.shipment?.origin ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">Destination</div>
            <div className="font-medium">{info?.destination ?? info?.shipment?.destination ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">ETD</div>
            <div className="font-medium">{info?.etd ?? "-"}</div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium">Shipment activities</h4>
          <div className="mt-3 space-y-3">
            {Array.isArray(activities) && activities.length > 0 ? (
              activities.map((act, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{act.status || act.activity || "Activity"}</div>
                    <div className="text-xs text-neutral-500">{formatDateTime(act.time || act.timestamp || act.updated_time_stamp || act.date)}</div>
                  </div>
                  {act.description && <div className="text-sm text-neutral-500 mt-1">{act.description}</div>}
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-4 text-sm text-neutral-600">
                No activities found.
                {rawError ? <div className="mt-2 text-xs text-neutral-500">{rawError}</div> : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium">Shipment track entries</h4>
          <div className="mt-3 space-y-3">
            {Array.isArray(shipmentTrack) && shipmentTrack.length > 0 ? (
              shipmentTrack.map((s, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{s.courier_name || s.awb_code || `Entry ${i + 1}`}</div>
                    <div className="text-xs text-neutral-500">{formatDateTime(s.updated_time_stamp || s.pickup_date || s.delivered_date)}</div>
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">Pickup: {s.pickup_date || "-"}</div>
                  <div className="text-sm text-neutral-500">Delivered: {s.delivered_date || "-"}</div>
                  <div className="text-sm text-neutral-500">POD: {s.pod || s.pod_status || "-"}</div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-4 text-sm text-neutral-600">
                No shipment track entries found.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className={BTN + " text-sm px-3 py-1"}>
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// InvoiceTemplate
function InvoiceTemplate({ order, pricing }) {
  const productPrice = pricing?.productPrice ?? order.pricing?.sellingPrice ?? 0;
  const fees = pricing?.fees ?? order.pricing?.fees ?? 0;
  const couponDiscount = pricing?.couponDiscount ?? order.pricing?.couponDiscount ?? 0;
  const shippingCharge = pricing?.shippingCharge ?? 0;
  const total = pricing?.total ?? order.pricing?.total ?? productPrice + fees + shippingCharge - couponDiscount;

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-xl font-semibold">Invoice</h2>
      <div className="mt-4 flex justify-between">
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
          <div className="font-medium">{order.shipping?.name}</div>
          <div className="max-w-xs break-words">{order.shipping?.address}</div>
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Item</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((it) => (
              <tr key={it.id}>
                <td className="py-2 border-t border-neutral-100">{it.title}</td>
                <td className="py-2 border-t border-neutral-100 text-right">{it.qty}</td>
                <td className="py-2 border-t border-neutral-100 text-right">{currency(Number(it.price) * Number(it.qty || 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between">
              <div>Subtotal</div>
              <div>{currency(productPrice)}</div>
            </div>
            <div className="flex justify-between">
              <div>Fees</div>
              <div>{currency(fees)}</div>
            </div>
            <div className="flex justify-between">
              <div>Shipping</div>
              <div>{currency(shippingCharge)}</div>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <div>Coupon discount</div>
                <div>-{currency(couponDiscount)}</div>
              </div>
            )}
            <div className="flex justify-between font-semibold mt-3">
              <div>Total</div>
              <div>{currency(total)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// parseJsonSafe helper
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch (e) {
    const txt = await res.text().catch(() => "");
    return { message: txt || `HTTP ${res.status}` };
  }
}
