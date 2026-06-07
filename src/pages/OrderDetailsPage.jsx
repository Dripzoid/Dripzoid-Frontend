// src/pages/OrderDetailsPage.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package as PackageIcon,
  CheckCircle,
  Clock,
  Info,
  Download,
  XCircle,
} from "lucide-react";
import Reviews from "../components/Reviews";
import { UserContext } from "../contexts/UserContext";

/* =========================================================
   COOKIE-ONLY AUTH HELPERS
========================================================= */

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

const apiUrl = (path = "") => {
  if (!path.startsWith("/")) path = `/${path}`;
  const combined = API_BASE ? `${API_BASE}${path}` : path;
  return combined.replace(/([^:]\/)\/+/g, "$1");
};

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    const txt = await res.text().catch(() => "");
    return { message: txt || `HTTP ${res.status}` };
  }
}

function formatDateTime(iso) {
  if (!iso) return "";
  let d = iso;
  if (
    typeof iso === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(iso)
  ) {
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

/* smaller global buttons */
const BTN =
  "transition-all duration-200 font-medium rounded-full px-3 py-1 " +
  "bg-black text-white dark:bg-white dark:text-black " +
  "hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white " +
  "hover:ring-2 hover:ring-black dark:hover:ring-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus:outline-none";

const MARKER_SIZE_PX = 28;
const MARKER_INNER_OFFSET_PX = 6;
const LEFT_6_PX = 24;

/* =========================================================
   STATUS ICON HELPERS
========================================================= */

function getStepIcon(step, done) {
  const s = String(step || "").toLowerCase();

  if (s.includes("cancel")) {
    return XCircle;
  }

  if (s.includes("delivered")) {
    return CheckCircle;
  }

  if (s.includes("out for delivery") || s.includes("shipped")) {
    return Truck;
  }

  if (s.includes("packed") || s.includes("confirmed")) {
    return PackageIcon;
  }

  return done ? CheckCircle : Clock;
}

function getOrderHeaderIcon(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("cancel")) return XCircle;
  if (s.includes("delivered")) return CheckCircle;
  if (s.includes("out for delivery") || s.includes("shipped")) return Truck;
  if (s.includes("packed") || s.includes("confirmed")) return PackageIcon;

  return PackageIcon;
}

/* =========================================================
   SHIPROCKET NORMALIZER
========================================================= */

function normalizeShiprocketResponse(resp) {
  if (
    resp &&
    typeof resp === "object" &&
    !resp.tracking_data &&
    Array.isArray(resp.tracking)
  ) {
    return {
      status: resp.status ?? "confirmed",
      progressIndex: (() => {
        const map = {
          confirmed: 0,
          packed: 1,
          shipped: 2,
          "out for delivery": 3,
          delivered: 4,
          cancelled: 0,
        };
        return map[(resp.status || "confirmed").toLowerCase()] ?? 0;
      })(),
      tracking: resp.tracking,
      activities: resp.activities ?? [],
      courier: resp.courier ?? {},
      history: resp.history ?? [],
      raw: resp.raw ?? resp,
    };
  }

  const root = Array.isArray(resp)
    ? resp[0]?.tracking_data ?? resp[0] ?? {}
    : resp?.tracking_data ?? resp?.tracking ?? resp ?? {};
  const td = root || {};

  const shipment =
    Array.isArray(td.shipment_track) && td.shipment_track.length
      ? td.shipment_track[0]
      : td.shipment_track || {};

  const activitiesRaw = Array.isArray(td.shipment_track_activities)
    ? td.shipment_track_activities
    : td.shipment_track?.[0]?.activities ??
      td.shipment_track_activities ??
      [];

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
      const combined = `${a.status || ""} ${a.activity || ""} ${
        a["sr-status-label"] || ""
      }`.toLowerCase();
      if (re.test(combined)) {
        return a.date || a.time || a.timestamp || a.updated_time_stamp || null;
      }
    }
    return null;
  }

  let progressIndex = 0;
  const latestAct = activities[0] || {};
  const lastSrLabel = (latestAct["sr-status-label"] || latestAct.status || "")
    .toString();
  const lastSr = latestAct["sr-status"] ?? latestAct.sr_status ?? null;
  const current_status = (
    shipment.current_status ||
    td.current_status ||
    td.currentStatus ||
    ""
  )
    .toString()
    .toLowerCase();

  if (
    /delivered/i.test(current_status) ||
    /delivered/i.test(lastSrLabel) ||
    lastSr === 7 ||
    td.shipment_status === 7
  ) {
    progressIndex = 4;
  } else if (
    /out\s*for\s*delivery/i.test(current_status) ||
    /out for delivery/i.test(lastSrLabel) ||
    lastSr === 17
  ) {
    progressIndex = 3;
  } else if (
    /arrivedatcarrierfacility|in transit/i.test(lastSrLabel.toLowerCase()) ||
    /arrivedatcarrierfacility/i.test(
      (latestAct.status || "").toString().toLowerCase()
    ) ||
    lastSr === 18 ||
    lastSr === 38
  ) {
    progressIndex = 2;
  } else if (
    /readyforreceive|ready for receive/i.test(
      (latestAct.status || "").toString().toLowerCase()
    )
  ) {
    progressIndex = 1;
  } else if (
    (!shipment ||
      !shipment.awb_code ||
      !(shipment.current_status || "").trim()) &&
    (td.track_status === 0 || td.track_status === "0" || td.error)
  ) {
    progressIndex = 0;
  } else if (shipment.pickup_date) {
    progressIndex = 2;
  } else {
    progressIndex = 0;
  }

  const history = [];
  const packedDate = findActivityDate(
    activitiesRaw,
    /readyforreceive|ready for receive|ready_for_receive/i
  );
  if (packedDate) history.push({ title: "Packed", time: packedDate });

  if (shipment.pickup_date) history.push({ title: "Shipped", time: shipment.pickup_date });
  else {
    const shippedAct = findActivityDate(
      activitiesRaw,
      /arrivedatcarrierfacility|in transit|departed/i
    );
    if (shippedAct) history.push({ title: "Shipped", time: shippedAct });
  }

  const ofd = findActivityDate(
    activitiesRaw,
    /outfordelivery|out for delivery|out_for_delivery|outfor delivery/i
  );
  if (ofd) history.push({ title: "Out For Delivery", time: ofd });

  if (shipment.delivered_date) history.push({ title: "Delivered", time: shipment.delivered_date });
  else {
    const delAct = findActivityDate(activitiesRaw, /delivered/i);
    if (delAct) history.push({ title: "Delivered", time: delAct });
  }

  const returnAct = findActivityDate(activitiesRaw, /returninitiated|rto/i);
  if (returnAct) history.push({ title: "Return initiated", time: returnAct });

  const steps = [
    { step: "Order Confirmed", idx: 0, date: null },
    { step: "Packed", idx: 1, date: packedDate || null },
    { step: "Shipped", idx: 2, date: shipment.pickup_date || null },
    { step: "Out For Delivery", idx: 3, date: ofd || null },
    { step: "Delivered", idx: 4, date: shipment.delivered_date || null },
  ];

  const tracking = steps.map((s) => ({
    step: s.step,
    done: s.idx <= progressIndex,
    date: s.date,
    detail: "",
  }));

  const courier = {
    name: shipment.courier_name || td.courier_name || shipment.courier || "",
    awb: shipment.awb_code || shipment.awb || "",
  };

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

function normalizeTrackPayload(payload, fallbackStatus = "") {
  if (!payload) {
    return {
      status: fallbackStatus || "confirmed",
      tracking: [],
      activities: [],
      courier: null,
      history: [],
      raw: payload,
    };
  }

  if (
    payload.tracking_data ||
    payload.shipment_track ||
    payload.shipment_track_activities ||
    Array.isArray(payload)
  ) {
    return normalizeShiprocketResponse(payload.tracking_data ?? payload.tracking ?? payload);
  }

  const trackingRoot = payload.tracking ?? payload.data?.tracking ?? {};
  const firstTracking = Array.isArray(trackingRoot)
    ? trackingRoot[0]
    : Object.values(trackingRoot || {})[0];

  const trackingData =
    firstTracking?.tracking_data ??
    trackingRoot?.tracking_data ??
    payload.tracking_data ??
    payload.data?.tracking_data ??
    null;

  if (trackingData) {
    const shipmentTrack = trackingData.shipment_track || [];
    const activities = trackingData.shipment_track_activities || [];
    const currentShipment = shipmentTrack[0] || {};

    return {
      status:
        currentShipment.current_status ||
        trackingData.current_status ||
        trackingData.status ||
        payload.status ||
        fallbackStatus ||
        "confirmed",
      tracking: payload.tracking ?? [],
      activities,
      courier: {
        name: currentShipment.courier_name || "",
        awb: currentShipment.awb_code || "",
      },
      history: payload.history ?? [],
      raw: trackingData,
    };
  }

  return {
    status:
      payload.status ??
      payload.tracking?.current_status ??
      payload.tracking?.shipment_status ??
      payload.tracking?.status ??
      fallbackStatus ??
      "confirmed",
    tracking: Array.isArray(payload.tracking)
      ? payload.tracking
      : payload.tracking ?? [],
    activities: payload.activities ?? payload.shipment_track_activities ?? [],
    courier:
      payload.courier ??
      (payload.tracking && {
        name: payload.tracking.courier_name,
        awb: payload.tracking.awb_code,
      }) ??
      null,
    history: payload.history ?? [],
    raw: payload,
  };
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function OrderDetailsPage({ orderId: propOrderId }) {
  const routeOrderId = (() => {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname || "";
    const m = path.match(/\/order-details\/([^/]+)(?:\/|$)/i);
    return m?.[1] ?? null;
  })();

  const [orderId] = useState(() => {
    if (propOrderId) return String(propOrderId);
    if (routeOrderId) return String(routeOrderId);
    return "38";
  });

  const { user: currentUser } = useContext(UserContext) || {};

  const [order, setOrder] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [openReviews, setOpenReviews] = useState({});

  function normalizeApiOrder(payload) {
    const source = payload?.data ?? payload;
    if (!source) return null;

    const pricing = {
      total:
        source.totalAmount ??
        source.total_amount ??
        source.pricing?.total ??
        0,
      sellingPrice:
        source.totalAmount ??
        source.total_amount ??
        source.pricing?.sellingPrice ??
        0,
      listingPrice: source.pricing?.listingPrice ?? source.totalAmount ?? 0,
      fees: source.pricing?.fees ?? 0,
      extraDiscount: source.pricing?.extraDiscount ?? 0,
      specialPrice: source.pricing?.specialPrice ?? 0,
      otherDiscount: source.pricing?.otherDiscount ?? 0,
      couponDiscount:
        source.pricing?.couponDiscount ??
        source.pricing?.coupon ??
        source.pricing?.otherDiscount ??
        0,
    };

    const sa =
      source.shippingAddress || source.shipping_address || source.shipping || null;

    const shipping = sa
      ? {
          id: sa.id ?? null,
          label: sa.label ?? null,
          name: sa.name ?? sa.label ?? source.user_name ?? null,
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

    const items = Array.isArray(source.items)
      ? source.items.map((it) => {
          const firstImg =
            (it.image || it.images || "")
              .toString()
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)[0] || "";

          const opts = it.options || {};
          const optionsText =
            typeof opts === "string"
              ? opts
              : [
                  opts.color ? `${opts.color}` : null,
                  opts.size ? `${opts.size}` : null,
                  opts.variant ? `${opts.variant}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ");

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
      id: source.id,
      orderNumber: source.orderNumber ?? null,
      status: source.status ?? "",
      created_at: source.createdAt ?? source.created_at ?? source.placedAt ?? null,
      paymentMethod: source.paymentMethod ?? source.payment_method ?? null,
      deliveryDate: source.deliveryDate ?? null,
      shipping,
      pricing,
      items,
      courier: source.courier ?? null,
      history: source.history ?? [],
      raw: source,
    };
  }

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    (async () => {
      setInitialLoading(true);
      try {
        const url = apiUrl(`/api/user/orders/${encodeURIComponent(orderId)}`);
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: ac.signal,
        });

        const payload = await parseJsonSafe(res);
        if (!res.ok) {
          console.error(
            "Failed to fetch order:",
            payload?.message || `HTTP ${res.status}`
          );
          throw new Error(payload?.message || `Failed to fetch order: ${res.status}`);
        }

        const normalized = normalizeApiOrder(payload);
        if (!mounted) return;
        setOrder(normalized);

        (async function prefetchTracking() {
          try {
            if (!normalized?.id) return;

            const turl = apiUrl(`/api/user/orders/${encodeURIComponent(normalized.id)}/track`);
            const tRes = await fetch(turl, {
              method: "GET",
              credentials: "include",
              headers: {
                Accept: "application/json",
              },
              signal: ac.signal,
            });

            const tPayload = await parseJsonSafe(tRes);
            if (!tRes.ok) {
              console.warn(
                "Prefetch track failed:",
                tPayload?.message || `HTTP ${tRes.status}`
              );
              return;
            }

            const trackNormalized = normalizeTrackPayload(
              tPayload,
              normalized.status
            );

            setOrder((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                tracking:
                  trackNormalized.tracking && trackNormalized.tracking.length
                    ? trackNormalized.tracking
                    : prev.tracking,
                status: trackNormalized.status ?? prev.status,
                courier: { ...(prev.courier || {}), ...(trackNormalized.courier || {}) },
                history: trackNormalized.history
                  ? [...trackNormalized.history, ...(prev.history || [])]
                  : prev.history,
                raw_tracking: trackNormalized.raw ?? prev.raw_tracking,
              };
            });
          } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("Prefetch tracking error:", err);
          }
        })();
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error loading order:", err);
      } finally {
        if (mounted) setInitialLoading(false);
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [orderId]);

  const computedPricing = useMemo(() => {
    if (!order) return null;

    const productPrice = (order.items || []).reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.qty || 1),
      0
    );
    const fees = Number(order.pricing?.fees || 0);
    const codFee =
      (order.paymentMethod || "").toString().toLowerCase() === "cod" ? 25 : 0;

    let couponDiscount = Math.max(
      0,
      Number(order.pricing?.couponDiscount ?? order.pricing?.otherDiscount ?? 0)
    );

    if (!couponDiscount) {
      const serverTotal = Number(
        order.pricing?.total ??
          order.pricing?.sellingPrice ??
          order.raw?.totalAmount ??
          order.raw?.total_amount ??
          order.raw?.total ??
          0
      );
      if (serverTotal > 0) {
        const inferred = productPrice + fees + codFee - serverTotal;
        if (inferred > 0) couponDiscount = inferred;
      }
    }

    couponDiscount = Math.max(0, Number(couponDiscount || 0));

    const total = productPrice + fees + codFee - couponDiscount;

    return {
      productPrice,
      fees,
      codFee,
      couponDiscount,
      total,
    };
  }, [order]);

  async function handleCancel() {
    if (!order) return;

    const prevOrder = order;
    const nowIso = new Date().toISOString();

    setShowCancel(false);
    setActionLoading(true);

    // Optimistic UI update so the cancelled state appears immediately
    setOrder((prev) => ({
      ...prev,
      status: "cancelled",
      history: [...(prev?.history || []), { title: "Cancelled", time: nowIso }],
      tracking: [
        ...(prev?.tracking || []),
        { step: "Cancelled", done: true, time: nowIso },
      ],
      raw: {
        ...(prev?.raw || {}),
        status: "cancelled",
      },
    }));

    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/cancel`);
      const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) {
        console.error("Cancel failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Cancel failed (${res.status})`);
      }

      const normalized =
        normalizeApiOrder(payload?.order ?? payload) ?? {
          ...prevOrder,
          status: payload?.status ?? "cancelled",
        };

      setOrder((current) => ({
        ...current,
        ...normalized,
        status: (normalized.status || payload?.status || "cancelled").toString().toLowerCase(),
        history: normalized.history || current?.history || [],
      }));
    } catch (err) {
      console.error("Cancel error:", err);
      setOrder(prevOrder);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestReturn() {
    if (!order) return;
    setActionLoading(true);
    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/return`);
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
      setActionLoading(false);
    }
  }

  async function handleTrackOrder() {
    if (!order?.id) {
      console.warn("Track order: no order to track");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/track`), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = await parseJsonSafe(res);

      if (!res.ok) {
        throw new Error(payload?.message || `Track API error (${res.status})`);
      }

      const trackNormalized = normalizeTrackPayload(payload, order.status);

      const shipmentTrack =
        payload?.tracking?.shipment_track ||
        payload?.tracking_data?.shipment_track ||
        payload?.shipment_track ||
        trackNormalized.raw?.shipment_track ||
        [];

      const activities =
        payload?.tracking?.shipment_track_activities ||
        payload?.tracking_data?.shipment_track_activities ||
        payload?.shipment_track_activities ||
        trackNormalized.activities ||
        [];

      const currentShipment = shipmentTrack[0] || {};

      const infoForModal = {
        shipment_track: shipmentTrack,
        shipment_track_activities: activities,
        courier_name:
          currentShipment.courier_name ||
          trackNormalized.courier?.name ||
          "",
        awb_code:
          currentShipment.awb_code ||
          trackNormalized.courier?.awb ||
          "",
        current_status:
          currentShipment.current_status ||
          payload?.status ||
          trackNormalized.status ||
          order.status,
        origin: currentShipment.origin || "",
        destination: currentShipment.destination || "",
        etd: currentShipment.edd || "",
        raw: trackNormalized.raw || payload,
      };

      setTrackInfo(infoForModal);
      setShowTrackModal(true);

      setOrder((prev) => ({
        ...prev,
        status: trackNormalized.status ?? prev.status,
        tracking: trackNormalized.tracking?.length ? trackNormalized.tracking : prev.tracking,
        courier: { ...(prev?.courier || {}), ...(trackNormalized.courier || {}) },
        history: trackNormalized.history
          ? [...trackNormalized.history, ...(prev?.history || [])]
          : prev?.history,
        raw_tracking: trackNormalized.raw ?? prev?.raw_tracking,
      }));
    } catch (err) {
      console.error("Track order failed:", err);
      alert(err.message || "Unable to fetch tracking information");
    } finally {
      setActionLoading(false);
    }
  }

async function handleDownloadInvoice() {
  if (!order?.id) {
    console.warn("No order available to download invoice.");
    return;
  }

  setActionLoading(true);

  try {
    const url = apiUrl(
      `/api/user/orders/${encodeURIComponent(order.id)}/invoice`
    );

    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/pdf,application/json",
      },
    });

    if (!res.ok) {
      const payload = await parseJsonSafe(res);

      console.error(
        "Invoice download failed:",
        payload?.message || `HTTP ${res.status}`
      );

      throw new Error(
        payload?.message || `Invoice download failed (${res.status})`
      );
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
    setActionLoading(false);
  }
}

  if (initialLoading || !order) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  const isDelivered =
    (order.status || "").toString().toLowerCase() === "delivered" ||
    order.tracking?.some?.(
      (t) =>
        (t.step || t.status)?.toString().toLowerCase() === "delivered" &&
        (t.done || t.status === "delivered")
    );
  const isCancelled =
    (order.status || "").toString().toLowerCase() === "cancelled";

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <div className="bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
          Home &gt; My Account &gt; My Orders &gt;{" "}
          <span className="font-mono">{order.id}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <TimelineCard
            order={order}
            onCancel={() => setShowCancel(true)}
            onRequestReturn={() => setShowReturn(true)}
            onTrackAll={handleTrackOrder}
            isDelivered={isDelivered}
            isBusy={actionLoading}
          />

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Items in this order</h3>
              <div className="text-sm text-neutral-500">
                {order.items?.length ?? 0} item(s)
              </div>
            </div>

            <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items?.map((it) => (
                <div key={it.id || `${it.title}-${Math.random()}`} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
                        <div className="text-sm text-neutral-500">
                          {it.options || "—"}
                        </div>
                        <div className="text-sm text-neutral-500 mt-1">
                          Seller: {it.seller || "—"}
                        </div>
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
                              setOpenReviews((prev) => ({
                                ...(prev || {}),
                                [String(it.id)]: !Boolean(prev?.[String(it.id)]),
                              }))
                            }
                            className={`${BTN} text-sm px-3 py-1`}
                            disabled={actionLoading}
                          >
                            Submit review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {openReviews[String(it.id)] && (
                    <div className="mt-4">
                      <Reviews
                        productId={it.id}
                        apiBase={API_BASE}
                        currentUser={currentUser}
                        showToast={(m) => console.log("Review:", m)}
                      />
                    </div>
                  )}
                </div>
              )) ?? null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Delivery details</div>
              <div className="text-sm text-neutral-400">
                AWB: {order.courier?.awb ?? "—"}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3">
                <div className="text-sm text-neutral-500">Home</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200 break-words">
                  {order.shipping?.address || "—"}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-neutral-500">
                    {order.shipping?.name || "—"} • {order.shipping?.phone || "—"}
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Courier</div>
                  <div className="text-sm font-medium">
                    {order.courier?.name ?? "—"}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {order.courier?.exec?.name ?? ""} •{" "}
                    {order.courier?.exec?.phone ?? ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{order.courier?.exec?.eta ?? ""}</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <button
                      onClick={handleTrackOrder}
                      className={BTN + " text-sm px-3 py-1"}
                      disabled={actionLoading}
                    >
                      Track
                    </button>
                  </div>
                </div>
              </div>

              {order.deliveryDate && (
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3">
                  <div className="text-sm text-neutral-500">Delivery date</div>
                  <div className="text-sm font-medium">
                    {formatDateTime(order.deliveryDate)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Price details</div>
              <div className="text-sm text-neutral-400">
                Items: {order.items?.length ?? 0}
              </div>
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

              {String(order.paymentMethod || "").toLowerCase() === "cod" && (
                <div className="flex justify-between">
                  <div>COD Fee</div>
                  <div>{currency(computedPricing?.codFee ?? 25)}</div>
                </div>
              )}

              {computedPricing?.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <div>Coupon discount</div>
                  <div>-{currency(computedPricing?.couponDiscount ?? 0)}</div>
                </div>
              )}

              <div className="mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
                <div className="font-semibold">Total amount</div>
                <div className="font-semibold">
                  {currency(computedPricing?.total ?? order.pricing?.total)}
                </div>
              </div>

              <div className="mt-3 text-sm text-neutral-500">
                Paid by <strong className="ml-1">{order.paymentMethod ?? "—"}</strong>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadInvoice}
                  className={BTN + " flex-1 py-2 px-3 flex items-center justify-center gap-2 text-sm"}
                  disabled={actionLoading}
                >
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        </aside>

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

        <TrackModal
          open={showTrackModal}
          info={trackInfo}
          onClose={() => setShowTrackModal(false)}
        />
      </main>
    </div>
  );
}

/* =========================================================
   SKELETON
========================================================= */

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

/* =========================================================
   TIMELINE CARD
========================================================= */

function TimelineCard({ order, onCancel, onRequestReturn, onTrackAll, isDelivered, isBusy }) {
  const timelineRef = useRef(null);
  const markersRef = useRef([]);
  const [overlayRect, setOverlayRect] = useState(null);

  const innerSize = MARKER_SIZE_PX - MARKER_INNER_OFFSET_PX;
  const isCancelled = (order.status || "").toLowerCase() === "cancelled";
  const HeaderIcon = getOrderHeaderIcon(order.status);

  const allSteps = isCancelled
    ? ["Order Confirmed", "Cancelled"]
    : ["Order Confirmed", "Packed", "Shipped", "Out For Delivery", "Delivered"];

  const progressMap = {
    pending: 0,
    confirmed: 0,
    processing: 1,
    packed: 1,
    shipped: 2,
    "out for delivery": 3,
    delivered: 4,
    cancelled: 1,
  };

  const normalizedStatus = (order.status || "").toLowerCase();
  const progressIndex = progressMap[normalizedStatus] ?? 0;

  const trackingToUse = allSteps.map((step, idx) => {
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
        ? order.history?.find((h) =>
            (h.title || "").toString().toLowerCase().includes(step.toLowerCase())
          )?.time || order.created_at || null
        : null;

    const detail = idx === progressIndex && done ? detailRaw : "";
    return { step, done, date, detail };
  });

  const lastDoneIndex = trackingToUse.map((t) => t.done).lastIndexOf(true);

  useEffect(() => {
    markersRef.current = new Array(trackingToUse.length);

    function measure() {
      const container = timelineRef.current;
      const nodes = markersRef.current || [];
      if (!container || !nodes.length) {
        setOverlayRect(null);
        return;
      }

      if (lastDoneIndex < 0) {
        setOverlayRect(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const firstNode = nodes[0];
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
      setOverlayRect({
        leftPx: Math.round(spineLeftPx),
        topPx,
        heightPx,
      });
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
      } catch {}
    };
  }, [trackingToUse, lastDoneIndex, order.status]);

  const spineLeftForCSS = LEFT_6_PX + MARKER_SIZE_PX / 2 - 2;
  const markerLeftPx = spineLeftForCSS - MARKER_SIZE_PX / 2;

  const showActions = !isCancelled;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeaderIcon className="text-neutral-600 dark:text-neutral-300" />
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Tracking status
            </div>
            <div className="font-semibold capitalize">{order.status || "Order Confirmed"}</div>
          </div>
        </div>

        <div className="text-sm text-neutral-500 hidden sm:block">
          Order placed: {formatDateTime(order.created_at)}
        </div>
      </div>

      <div className="mt-6 relative" ref={timelineRef}>
        <div
          className="absolute top-0 bottom-0 w-[4px] bg-neutral-100 dark:bg-neutral-800 z-0"
          style={{ left: `${spineLeftForCSS}px` }}
        />

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
              backgroundColor: isCancelled ? "rgb(239,68,68)" : "rgb(16,185,129)",
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
            const StepIcon = getStepIcon(t.step, done);

            const outerClasses = isCancelStep
              ? "rounded-full bg-red-600"
              : done
              ? "rounded-full bg-emerald-600"
              : nextDone
              ? "rounded-full bg-white border border-neutral-300 dark:border-neutral-700"
              : "rounded-full bg-white border border-neutral-200 dark:border-neutral-800";

            const iconColorDone = done
              ? "text-white"
              : "text-neutral-500 dark:text-neutral-400";

            return (
              <div key={t.step + "-" + idx} className="pl-14 relative">
                <div
                  ref={(el) => (markersRef.current[idx] = el)}
                  style={{
                    position: "absolute",
                    left: `${markerLeftPx}px`,
                    top: 0,
                    width: MARKER_SIZE_PX,
                    height: MARKER_SIZE_PX,
                  }}
                >
                  <div
                    style={{ width: "100%", height: "100%" }}
                    className={`z-10 ${outerClasses}`}
                  />

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
                    <StepIcon
                      size={Math.max(12, innerSize - 8)}
                      className={iconColorDone}
                    />
                  </div>
                </div>

                <div>
                  <div
                    className={`font-medium ${
                      done
                        ? "text-neutral-700 dark:text-neutral-200"
                        : "text-neutral-500"
                    }`}
                  >
                    {t.step}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {t.date ? formatDateTime(t.date) : done ? "" : "Pending"}
                  </div>
                  {t.detail && (
                    <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                      {t.detail}
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

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex gap-3 w-full">
          {showActions && !isDelivered && (
            <>
              <button
                onClick={onCancel}
                className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                onClick={onTrackAll}
                className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}
                disabled={isBusy}
              >
                <Truck size={16} /> Track order
              </button>
            </>
          )}

          {showActions && isDelivered && (
            <button
              onClick={onRequestReturn}
              className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}
              disabled={isBusy}
            >
              Return
            </button>
          )}

          {isCancelled && (
            <div className="text-sm text-red-600 italic px-2">
              This order has been cancelled.
            </div>
          )}
        </div>
        <div className="w-full sm:w-44" />
      </div>
    </div>
  );
}

/* =========================================================
   TRACK MODAL
========================================================= */

function TrackModal({ open, info, onClose }) {
  if (!open) return null;

  const shipmentTrack = info?.shipment_track ?? info?.shipmentTrack ?? [];
  const activities = info?.shipment_track_activities ?? info?.shipmentTrackActivities ?? [];
  const rawError = info?.raw?.error ?? info?.error ?? "";

  return (
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto mx-auto relative top-8 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Track order</h3>
            <div className="text-sm text-neutral-500">
              Latest shipment information
            </div>
          </div>
          <div>
            <button onClick={onClose} className="text-sm underline text-neutral-500">
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-4">
            <div className="text-sm text-neutral-500">Courier</div>
            <div className="font-medium">
              {info?.courier_name ?? info?.courier?.name ?? "-"}
            </div>
            <div className="text-sm text-neutral-500 mt-2">AWB</div>
            <div className="font-medium">
              {info?.awb_code ?? info?.courier?.awb ?? "-"}
            </div>
            <div className="text-sm text-neutral-500 mt-2">Current status</div>
            <div className="font-medium">
              {info?.current_status ?? info?.status ?? "-"}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-4">
            <div className="text-sm text-neutral-500">Origin</div>
            <div className="font-medium">{info?.origin ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">Destination</div>
            <div className="font-medium">{info?.destination ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">ETD</div>
            <div className="font-medium">{info?.etd ?? "-"}</div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium">Shipment activities</h4>
          <div className="mt-3 space-y-3">
            {Array.isArray(activities) && activities.length > 0 ? (
              activities.map((act, i) => {
                const ActIcon = /delivered/i.test(String(act.status || act.activity || ""))
                  ? CheckCircle
                  : /out for delivery|shipped|in transit/i.test(
                      String(act.status || act.activity || "")
                    )
                  ? Truck
                  : Clock;

                return (
                  <div
                    key={i}
                    className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ActIcon size={16} className="text-neutral-500" />
                        <span>{act.status || act.activity || "Activity"}</span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatDateTime(
                          act.time || act.timestamp || act.updated_time_stamp || act.date
                        )}
                      </div>
                    </div>
                    {act.description && (
                      <div className="text-sm text-neutral-500 mt-1">
                        {act.description}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-4 text-sm text-neutral-600">
                No activities found.
                {rawError ? (
                  <div className="mt-2 text-xs text-neutral-500">{rawError}</div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium">Shipment track entries</h4>
          <div className="mt-3 space-y-3">
            {Array.isArray(shipmentTrack) && shipmentTrack.length > 0 ? (
              shipmentTrack.map((s, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {s.courier_name || s.awb_code || `Entry ${i + 1}`}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {formatDateTime(
                        s.updated_time_stamp || s.pickup_date || s.delivered_date
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">
                    Pickup: {s.pickup_date || "-"}
                  </div>
                  <div className="text-sm text-neutral-500">
                    Delivered: {s.delivered_date || "-"}
                  </div>
                  <div className="text-sm text-neutral-500">
                    POD: {s.pod || s.pod_status || "-"}
                  </div>
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

/* =========================================================
   CONFIRM MODAL
========================================================= */

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onClose = () => {},
  onConfirm = () => {},
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    return () => prev?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="pointer-events-auto mx-auto relative top-1/4 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700">
            <Info />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
              {message}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className={BTN + " text-sm px-3 py-1"}>
                Cancel
              </button>
              <button
                onClick={() => onConfirm()}
                className="px-3 py-1 rounded-full bg-emerald-600 text-white text-sm"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
