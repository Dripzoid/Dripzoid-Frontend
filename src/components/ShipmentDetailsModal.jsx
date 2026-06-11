import { useEffect } from "react";
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
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-semibold text-slate-950 dark:text-white ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value ?? "-"}
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
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className={`fixed left-1/2 top-1/2 z-[101] w-[min(96vw,1200px)] ${widthClass} max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_100px_-30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900`}
          >
            {children}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function OrderView({ data }) {
  const order = data || {};
  const shipment = Array.isArray(order?.shipments) ? order.shipments[0] : null;
  const products = Array.isArray(order?.products) ? order.products : [];
  const activities = Array.isArray(order?.activities) ? order.activities : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Shiprocket Order ID" value={order?.id ?? order?.shiprocketOrderId} mono />
        <DetailCard label="Channel Order ID" value={order?.channel_order_id || order?.channelOrderId || "-"} mono />
        <DetailCard label="Status" value={order?.status || "-"} />
        <DetailCard label="Payment" value={order?.payment_method || order?.paymentMethod || "-"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Customer" description="Essential customer and order metadata">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Customer" value={order?.customer_name || "-"} />
            <DetailCard label="Email" value={order?.customer_email || "-"} />
            <DetailCard label="Phone" value={order?.customer_phone || "-"} />
            <DetailCard label="Pickup Location" value={order?.pickup_location || "-"} />
            <DetailCard label="Shipping Method" value={order?.shipping_method || "-"} />
            <DetailCard label="Created At" value={formatDateTime(order?.created_at || order?.channel_created_at)} />
          </div>
        </SectionShell>

        <SectionShell title="Shipment" description="Shipment snapshot inside Shiprocket order response">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Shipment ID" value={shipment?.id || "-"} mono />
            <DetailCard label="Courier" value={shipment?.courier || "-"} />
            <DetailCard label="AWB" value={shipment?.awb || "-"} mono />
            <DetailCard label="Return AWB" value={shipment?.return_awb || "-"} mono />
            <DetailCard label="Pickup Token" value={shipment?.pickup_token_number || "-"} mono />
            <DetailCard label="ETD" value={shipment?.etd || "-"} />
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
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  HSN
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
                      {product?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {product?.channel_sku || product?.sku || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {product?.quantity ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="slate">{product?.status || "-"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {product?.hsn || "-"}
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
                {String(item)}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No activities available.</p>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function ShipmentView({ data }) {
  const shipment = data || {};
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
                    {evt?.status || "Update"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {evt?.activity || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {evt?.location || "-"}{" "}
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
  const summary = data?.tracking_data || data?.data?.tracking_data || data?.track_data || data || {};
  const events = Array.isArray(summary?.shipment_track_activities)
    ? summary.shipment_track_activities
    : Array.isArray(summary?.shipment_track)
      ? summary.shipment_track
      : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="AWB" value={summary?.awb_code || summary?.awbCode || "-"} mono />
        <DetailCard label="Shipment ID" value={summary?.shipment_id || summary?.shipmentId || "-"} mono />
        <DetailCard label="Current Status" value={summary?.current_status || summary?.status || "-"} />
        <DetailCard label="Courier" value={summary?.courier_name || summary?.courierName || "-"} />
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
                    {evt?.status || "Update"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {evt?.activity || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {evt?.location || "-"}{" "}
                    {evt?.scanTimestamp ? `• ${formatDateTime(evt?.scanTimestamp)}` : ""}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No structured timeline events were found in the live response.
            </p>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function ReturnView({ data }) {
  const row = data || {};
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
                value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "-")}
                mono
              />
            ))}
        </div>
      </SectionShell>
    </div>
  );
}

export default function ShipmentDetailsModal({
  open,
  kind = "order",
  title,
  data,
  showRaw,
  onToggleRaw,
  onClose,
  onCopy,
}) {
  const body =
    showRaw ? (
      <pre className="overflow-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    ) : kind === "shipment" ? (
      <ShipmentView data={data} />
    ) : kind === "tracking" ? (
      <TrackingView data={data} />
    ) : kind === "return" ? (
      <ReturnView data={data} />
    ) : (
      <OrderView data={data} />
    );

  return (
    <ModalShell open={open} onClose={onClose} widthClass="max-w-6xl">
      <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
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
              <h3 className="mt-3 break-all text-xl font-black tracking-tight text-slate-950 dark:text-white" title={title}>
                {title}
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

        <div className="flex-1 overflow-y-auto p-5">{body}</div>
      </div>
    </ModalShell>
  );
}
