// src/modules/shipping/components/ShipmentDetailsModal.jsx
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Copy, FileText, X } from "lucide-react";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? "-";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return JSON.stringify(value, null, 2);
  }
  if (isObject(value)) return JSON.stringify(value, null, 2);
  return String(value);
}

function unwrapShiprocketPayload(input) {
  if (!isObject(input)) return input;

  let current = input;

  if (isObject(current.data)) current = current.data;
  if (isObject(current.result)) current = current.result;

  if (isObject(current) && Object.keys(current).length === 1) {
    const onlyValue = current[Object.keys(current)[0]];
    if (
      isObject(onlyValue) &&
      (onlyValue.tracking_data ||
        onlyValue.products ||
        onlyValue.shipments ||
        onlyValue.status ||
        onlyValue.customer_name ||
        onlyValue.channel_order_id ||
        onlyValue.shipment_status)
    ) {
      return onlyValue;
    }
  }

  return current;
}

function unwrapTrackingNode(payload) {
  const base = unwrapShiprocketPayload(payload);

  if (base?.tracking_data) return base.tracking_data;
  if (base?.data?.tracking_data) return base.data.tracking_data;
  if (base?.track_data) return base.track_data;

  return null;
}

function normalizeTrackingEvent(evt) {
  if (!evt) return null;

  const scanTimestamp = pickFirst(
    evt?.scan_timestamp,
    evt?.scanTimestamp,
    evt?.date,
    evt?.created_at,
    evt?.updated_at
  );

  return {
    status: pickFirst(
      evt?.status,
      evt?.current_status,
      evt?.shipment_status,
      evt?.activity_status,
      evt?.sr_status_name,
      evt?.pod_status,
      evt?.track_status
    ),
    activity: pickFirst(
      evt?.activity,
      evt?.current_status,
      evt?.note,
      evt?.details,
      evt?.description,
      evt?.activity_description
    ),
    location: pickFirst(
      evt?.location,
      evt?.city,
      evt?.hub_name,
      evt?.scanned_location,
      evt?.destination
    ),
    scanTimestamp: scanTimestamp ? new Date(scanTimestamp) : null,
    raw: evt,
  };
}

function extractTrackingEvents(payload) {
  const tracking = unwrapTrackingNode(payload);
  if (!tracking) return [];

  const candidates = [
    tracking?.shipment_track_activities,
    tracking?.shipment_track,
    tracking?.activities,
    tracking?.data?.shipment_track_activities,
    tracking?.data?.shipment_track,
  ];

  const found = candidates.find((v) => Array.isArray(v));
  if (!found) return [];

  return found
    .flatMap((item) => {
      if (!item) return [];

      if (
        item.activity ||
        item.status ||
        item.location ||
        item.scan_timestamp ||
        item.date ||
        item.current_status
      ) {
        return [normalizeTrackingEvent(item)];
      }

      if (Array.isArray(item?.activities)) {
        return item.activities.map(normalizeTrackingEvent);
      }

      return [];
    })
    .filter(Boolean);
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    sky: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
    amber: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
    violet: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

function DetailCard({ label, value, mono = false }) {
  const display = safeText(value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 whitespace-pre-wrap break-words text-sm font-semibold text-slate-950 dark:text-white ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {display}
      </p>
    </div>
  );
}

function SectionShell({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h4 className="text-base font-bold text-slate-950 dark:text-white">{title}</h4>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ModalShell({ open, onClose, children, widthClass = "max-w-6xl" }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className={`w-full ${widthClass} max-h-[92vh] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_100px_-30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900`}
            >
              {children}
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function normalizeOrderPayload(payload) {
  const base = unwrapShiprocketPayload(payload);
  return isObject(base) ? base : {};
}

function getOrderShipment(base) {
  const shipmentValue = base?.shipments;

  if (Array.isArray(shipmentValue)) return shipmentValue[0] || null;
  if (isObject(shipmentValue)) return shipmentValue;

  return null;
}

function OrderView({ data }) {
  const order = normalizeOrderPayload(data);
  const shipment = getOrderShipment(order);
  const products = Array.isArray(order?.products) ? order.products : [];
  const activities = Array.isArray(order?.activities) ? order.activities : [];
  const extraInfo = isObject(order?.extra_info) ? order.extra_info : {};
  const shippingExtras = isObject(order?.others) ? order.others : {};
  const pickupAddress = isObject(order?.pickup_address) ? order.pickup_address : null;
  const orderRisks = {
    order: order?.order_risk,
    address: order?.address_risk,
    rto: order?.rto_risk,
    category: order?.address_category,
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Shiprocket Order ID" value={order?.id ?? "-"} mono />
        <DetailCard label="Channel Order ID" value={order?.channel_order_id || "-"} mono />
        <DetailCard label="Status" value={order?.status || "-"} />
        <DetailCard label="Payment" value={order?.payment_method || "-"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Customer" description="Essential customer and order metadata">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Customer" value={order?.customer_name || "-"} />
            <DetailCard label="Email" value={order?.customer_email || "-"} />
            <DetailCard label="Phone" value={order?.customer_phone || "-"} />
            <DetailCard label="City" value={order?.customer_city || "-"} />
            <DetailCard label="State" value={order?.customer_state || "-"} />
            <DetailCard label="Pincode" value={order?.customer_pincode || "-"} mono />
            <DetailCard label="Pickup Location" value={order?.pickup_location || "-"} />
            <DetailCard label="Pickup Code" value={order?.pickup_code || "-"} mono />
          </div>
        </SectionShell>

        <SectionShell title="Order Summary" description="Commercial and platform metadata">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Created At" value={formatDateTime(order?.created_at)} />
            <DetailCard label="Channel Created At" value={order?.channel_created_at || "-"} />
            <DetailCard label="Updated At" value={order?.updated_at ? formatDateTime(order.updated_at) : "-"} />
            <DetailCard label="Invoice No." value={order?.invoice_no || "-"} mono />
            <DetailCard label="Invoice Date" value={order?.invoice_date ? formatDateTime(order.invoice_date) : "-"} />
            <DetailCard label="Total" value={formatMoney(order?.total)} />
            <DetailCard label="Net Total" value={formatMoney(order?.net_total)} />
            <DetailCard label="Payment Method" value={order?.payment_method || "-"} />
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Shipment Snapshot" description="Shiprocket shipment object">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Shipment ID" value={shipment?.id || "-"} mono />
            <DetailCard label="AWB" value={shipment?.awb || "-"} mono />
            <DetailCard label="Courier" value={shipment?.courier || "-"} />
            <DetailCard label="Courier ID" value={shipment?.courier_id || "-"} mono />
            <DetailCard label="Status" value={shipment?.status || "-"} />
            <DetailCard label="Weight" value={shipment?.weight || "-"} />
            <DetailCard label="Dimensions" value={shipment?.dimensions || "-"} mono />
            <DetailCard label="Invoice Link" value={shipment?.invoice_link || "-"} mono />
          </div>
        </SectionShell>

        <SectionShell title="Risk Signals" description="Order quality and delivery risk fields">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Order Risk" value={orderRisks.order || "-"} />
            <DetailCard label="Address Risk" value={orderRisks.address || "-"} />
            <DetailCard label="RTO Risk" value={orderRisks.rto || "-"} />
            <DetailCard label="Address Category" value={orderRisks.category || "-"} />
            <DetailCard label="Address Score" value={order?.address_score || "-"} />
            <DetailCard label="SLA" value={order?.sla || "-"} />
            <DetailCard label="COD" value={order?.cod ? "Yes" : "No"} />
            <DetailCard label="Shipping Method" value={order?.shipping_method || "-"} />
          </div>
        </SectionShell>
      </div>

      <SectionShell title="Products" description={`Items in this order (${products.length} total)`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-left dark:bg-slate-950">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  SKU
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Qty
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Price
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {products.length ? (
                products.map((product, index) => (
                  <tr
                    key={`${product?.id || index}-${product?.name || index}`}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {safeText(product?.name)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {safeText(product?.channel_sku || product?.sku)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {safeText(product?.quantity)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {formatMoney(product?.selling_price || product?.price || product?.mrp)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="slate">{safeText(product?.status)}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No product rows returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionShell>

      <SectionShell title="Activities" description="Activity stream returned by Shiprocket">
        <div className="flex flex-wrap gap-2">
          {activities.length ? (
            activities.map((item, index) => (
              <Badge key={`${item}-${index}`} tone="violet">
                {safeText(item)}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No activities available.</p>
          )}
        </div>
      </SectionShell>

      <SectionShell title="Additional Fields" description="Useful order metadata from the Shiprocket response">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailCard label="Pickup Address" value={pickupAddress ? `${pickupAddress.name || "-"}\n${pickupAddress.address || ""}\n${pickupAddress.city || ""}, ${pickupAddress.state || ""}\n${pickupAddress.pin_code || ""}` : "-"} />
          <DetailCard label="Pickup Address 2" value={order?.customer_address_2 || order?.pickup_address_2 || "-"} />
          <DetailCard label="Country" value={order?.customer_country || "-"} />
          <DetailCard label="Shipping Is Billing" value={shippingExtras?.shipping_is_billing ? "Yes" : "No"} />
          <DetailCard label="Order Type" value={extraInfo?.order_type || "-"} />
          <DetailCard label="Source" value={extraInfo?.order_metadata?.request_type || shippingExtras?.source_name || "-"} />
        </div>
      </SectionShell>
    </div>
  );
}

function ShipmentView({ data }) {
  const shipment = normalizeOrderPayload(data);
  const order = shipment?.order || {};
  const trackingEvents = Array.isArray(shipment?.trackingEvents) ? shipment.trackingEvents : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Shipment DB ID" value={shipment?.id || "-"} mono />
        <DetailCard label="Order ID" value={shipment?.orderId || "-"} mono />
        <DetailCard label="AWB" value={shipment?.awbCode || "-"} mono />
        <DetailCard label="Courier" value={shipment?.courierName || "-"} />
        <DetailCard label="Shipment Status" value={shipment?.shipmentStatus || "-"} />
        <DetailCard label="Pickup Token" value={shipment?.pickupTokenNumber || "-"} mono />
        <DetailCard label="Assigned At" value={formatDateTime(shipment?.assignedAt)} />
        <DetailCard label="Pickup Scheduled" value={formatDateTime(shipment?.pickupScheduledAt)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Linked Order" description="Dripzoid order attached to this shipment">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Order Number" value={order?.orderNumber || "-"} mono />
            <DetailCard label="Order Status" value={order?.status || "-"} />
            <DetailCard label="User ID" value={order?.userId || "-"} mono />
            <DetailCard label="Total Amount" value={formatMoney(order?.totalAmount)} />
          </div>
        </SectionShell>

        <SectionShell title="Shipment Metadata" description="Carrier and return flags">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Shiprocket Order ID" value={shipment?.shiprocketOrderId || "-"} mono />
            <DetailCard label="Shiprocket Shipment ID" value={shipment?.shipmentId || "-"} mono />
            <DetailCard label="Is Return" value={shipment?.isReturn ? "Yes" : "No"} />
            <DetailCard label="Updated At" value={formatDateTime(shipment?.updatedAt)} />
          </div>
        </SectionShell>
      </div>

      <SectionShell
        title="Tracking Events"
        description={`Stored events in ShipmentTracking (${trackingEvents.length} total)`}
      >
        <div className="space-y-4">
          {trackingEvents.length ? (
            trackingEvents.map((evt, index) => (
              <div key={`${evt?.id || index}-${index}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-0.5 h-3 w-3 rounded-full bg-slate-900 dark:bg-white" />
                  {index !== trackingEvents.length - 1 ? (
                    <div className="mt-1 h-12 w-px bg-slate-200 dark:bg-slate-800" />
                  ) : null}
                </div>
                <div className="pb-1">
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {safeText(evt?.status) || "Update"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {safeText(evt?.activity)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {safeText(evt?.location)}{" "}
                    {evt?.scanTimestamp ? `• ${formatDateTime(evt?.scanTimestamp)}` : ""}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No tracking events have been synced yet.
            </p>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function TrackingView({ data }) {
  const trackingNode = unwrapTrackingNode(data);
  const events = extractTrackingEvents(data);

  const summary = trackingNode || {};
  const firstTrack = Array.isArray(summary?.shipment_track)
    ? summary.shipment_track[0] || {}
    : Array.isArray(summary?.shipment_track_activities)
      ? summary.shipment_track_activities[0] || {}
      : {};

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="AWB" value={pickFirst(firstTrack?.awb_code, summary?.awb_code, "-")} mono />
        <DetailCard label="Shipment ID" value={pickFirst(firstTrack?.shipment_id, summary?.shipment_id, "-")} mono />
        <DetailCard label="Current Status" value={pickFirst(firstTrack?.current_status, summary?.status, "-")} />
        <DetailCard label="Courier" value={pickFirst(firstTrack?.courier_name, summary?.courier_name, "-")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Tracking Snapshot" description="Compatible with the Shiprocket tracking response you shared">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Track Status" value={summary?.track_status ?? "-"} />
            <DetailCard label="Shipment Status" value={summary?.shipment_status ?? "-"} />
            <DetailCard label="Is Return" value={summary?.is_return ? "Yes" : "No"} />
            <DetailCard label="Track URL" value={summary?.track_url || "-"} mono />
            <DetailCard label="Error" value={summary?.error || "-"} />
            <DetailCard label="POD Status" value={firstTrack?.pod_status || summary?.pod_status || "-"} />
          </div>
        </SectionShell>

        <SectionShell title="Latest Event" description="Best available snapshot from the tracking payload">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Status" value={firstTrack?.current_status || summary?.current_status || "-"} />
            <DetailCard label="Destination" value={firstTrack?.destination || "-"} />
            <DetailCard label="Origin" value={firstTrack?.origin || "-"} />
            <DetailCard label="Consignee" value={firstTrack?.consignee_name || "-"} />
            <DetailCard label="Pickup Date" value={firstTrack?.pickup_date || "-"} />
            <DetailCard label="Delivered Date" value={firstTrack?.delivered_date || "-"} />
          </div>
        </SectionShell>
      </div>

      <SectionShell title="Timeline" description={`Parsed from Shiprocket response (${events.length} events)`}>
        <div className="space-y-4">
          {events.length ? (
            events.map((evt, index) => (
              <div key={`${evt?.status || index}-${index}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-0.5 h-3 w-3 rounded-full bg-slate-900 dark:bg-white" />
                  {index !== events.length - 1 ? (
                    <div className="mt-1 h-12 w-px bg-slate-200 dark:bg-slate-800" />
                  ) : null}
                </div>
                <div className="pb-1">
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {safeText(evt?.status) || "Update"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {safeText(evt?.activity)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {safeText(evt?.location)}{" "}
                    {evt?.scanTimestamp ? `• ${formatDateTime(evt?.scanTimestamp)}` : ""}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              No tracking activities were found in the response. The response still includes the latest shipment snapshot and error message, if any.
            </div>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function ReturnView({ data }) {
  const row = normalizeOrderPayload(data);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Order ID" value={row?.orderId || row?.order_id || "-"} mono />
        <DetailCard label="Shipment ID" value={row?.shipmentId || row?.shipment_id || "-"} mono />
        <DetailCard label="Status" value={row?.status || "-"} />
        <DetailCard label="Company" value={row?.companyName || row?.company_name || "-"} />
      </div>

      <SectionShell title="Return Snapshot" description="Essential fields returned by the backend">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(row || {})
            .slice(0, 8)
            .map(([key, value]) => (
              <DetailCard
                key={key}
                label={key}
                value={safeText(value)}
                mono
              />
            ))}
        </div>
      </SectionShell>
    </div>
  );
}

function TrackingNote({ data }) {
  const trackingNode = unwrapTrackingNode(data);
  const errorMessage = trackingNode?.error || data?.error || null;

  if (!errorMessage) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
      {safeText(errorMessage)}
    </div>
  );
}

export default function ShipmentDetailsModal({
  open,
  kind = "order",
  title,
  data,
  showRaw = false,
  onToggleRaw,
  onClose,
  onCopy,
}) {
  const safeTitle = title || "Details";

  const body = useMemo(() => {
    if (showRaw) {
      return (
        <pre className="overflow-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          {JSON.stringify(data ?? {}, null, 2)}
        </pre>
      );
    }

    if (kind === "shipment") return <ShipmentView data={data} />;
    if (kind === "tracking")
      return (
        <div className="space-y-5">
          <TrackingNote data={data} />
          <TrackingView data={data} />
        </div>
      );
    if (kind === "return") return <ReturnView data={data} />;
    return <OrderView data={data} />;
  }, [data, kind, showRaw]);

  return (
    <ModalShell open={open} onClose={onClose} widthClass="max-w-6xl">
      <div className="flex h-full max-h-[92vh] min-h-0 flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                <BadgeCheck size={13} />
                {kind === "order"
                  ? "Order View"
                  : kind === "shipment"
                    ? "Shipment View"
                    : kind === "tracking"
                      ? "Tracking View"
                      : kind === "return"
                        ? "Return View"
                        : "Details"}
              </div>

              <h3
                className="mt-3 break-all text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl"
                title={safeTitle}
              >
                {safeTitle}
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Essential information first. Raw JSON is available on demand.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onToggleRaw}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileText size={16} />
                {showRaw ? "Show Essential Info" : "Show Raw Response"}
              </button>

              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Copy size={16} />
                Copy JSON
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{body}</div>
      </div>
    </ModalShell>
  );
}
