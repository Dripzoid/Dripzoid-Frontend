import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Package,
  Truck,
  User,
  Phone,
  MapPin,
  Calendar,
  Hash,
  FileText,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Circle,
  ShieldCheck,
  BadgeCheck,
  Route,
  Clock3,
  ArrowUpRight,
  PackageCheck,
} from "lucide-react";

const defaultTimeline = [
  {
    status: "Confirmed",
    completed: true,
    date: "10 Jun 2026, 09:30 AM",
  },
  {
    status: "Picked Up",
    completed: true,
    date: "10 Jun 2026, 01:45 PM",
  },
  {
    status: "In Transit",
    completed: true,
    date: "11 Jun 2026, 08:15 AM",
  },
  {
    status: "Out For Delivery",
    completed: false,
    date: null,
  },
  {
    status: "Delivered",
    completed: false,
    date: null,
  },
];

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words font-medium text-slate-950 dark:text-white">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, variant = "ghost", className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";
  const variants = {
    primary:
      "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100",
    ghost:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800",
    soft:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  };

  return (
    <button type="button" onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export default function ShipmentDetailsModal({
  open,
  shipment,
  onClose,
  onRefresh,
  onGenerateAwb,
  onTrackLive,
  onRequestPickup,
}) {
  if (!shipment) return null;

  const timeline = shipment.timeline?.length ? shipment.timeline : defaultTimeline;
  const hasAwb = Boolean(shipment.awbCode && shipment.awbCode !== "Not generated");

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 z-50 h-screen w-full overflow-y-auto bg-white shadow-2xl dark:bg-slate-950 md:w-[720px]"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                    <PackageCheck size={13} />
                    Shipment details
                  </div>
                  <h2 className="mt-3 truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">
                    {shipment.orderNumber}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {shipment.customer}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ActionButton variant="primary" onClick={() => onRefresh?.(shipment)}>
                  <RefreshCw size={16} />
                  Sync Tracking
                </ActionButton>

                <ActionButton
                  variant="ghost"
                  onClick={() => onGenerateAwb?.(shipment)}
                  className={!hasAwb ? "ring-1 ring-emerald-500/30" : ""}
                >
                  <PackageCheck size={16} />
                  {hasAwb ? "AWB Generated" : "Generate AWB"}
                </ActionButton>

                <ActionButton variant="ghost" onClick={() => onTrackLive?.(shipment)}>
                  <ExternalLink size={16} />
                  Track Live
                </ActionButton>

                <ActionButton variant="ghost" onClick={() => onRequestPickup?.(shipment)}>
                  <ShieldCheck size={16} />
                  Request Pickup
                </ActionButton>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2">
                    <Package size={18} className="text-sky-500" />
                    <h3 className="font-bold text-slate-950 dark:text-white">Order Details</h3>
                  </div>

                  <div className="space-y-3">
                    <InfoRow icon={<Hash size={14} />} label="Order Number" value={shipment.orderNumber} />
                    <InfoRow icon={<Calendar size={14} />} label="Created" value={shipment.createdAt} />
                    <InfoRow icon={<BadgeCheck size={14} />} label="Order Status" value={shipment.orderStatus} />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2">
                    <Truck size={18} className="text-violet-500" />
                    <h3 className="font-bold text-slate-950 dark:text-white">Shipment Info</h3>
                  </div>

                  <div className="space-y-3">
                    <InfoRow icon={<Truck size={14} />} label="Courier" value={shipment.courier} />
                    <InfoRow
                      icon={<Hash size={14} />}
                      label="AWB"
                      value={shipment.awbCode || "Not generated"}
                    />
                    <InfoRow
                      icon={<BadgeCheck size={14} />}
                      label="Shipment Status"
                      value={shipment.shipmentStatus}
                    />
                  </div>
                </section>
              </div>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center gap-2">
                  <User size={18} className="text-emerald-500" />
                  <h3 className="font-bold text-slate-950 dark:text-white">Customer Details</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoRow icon={<User size={14} />} label="Customer" value={shipment.customer} />
                  <InfoRow icon={<Phone size={14} />} label="Phone" value={shipment.phone} />
                </div>

                <div className="mt-4">
                  <InfoRow
                    icon={<MapPin size={14} />}
                    label="Location"
                    value={`${shipment.city}, ${shipment.state}`}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-center gap-2">
                  <Route size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-950 dark:text-white">Tracking Timeline</h3>
                </div>

                <div className="space-y-5">
                  {timeline.map((item, index) => (
                    <div key={`${item.status}-${index}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        {item.completed ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : (
                          <Circle size={20} className="text-slate-300 dark:text-slate-600" />
                        )}
                        {index !== timeline.length - 1 ? (
                          <div className="mt-1 h-10 w-px bg-slate-200 dark:bg-slate-800" />
                        ) : null}
                      </div>

                      <div className="pb-1">
                        <p className="font-semibold text-slate-950 dark:text-white">{item.status}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {item.date || "Pending"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock3 size={16} className="text-slate-500" />
                    <h3 className="font-bold text-slate-950 dark:text-white">Quick Status</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Current shipment state is{" "}
                    <span className="font-semibold text-slate-950 dark:text-white">
                      {shipment.shipmentStatus}
                    </span>
                    .
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    <h3 className="font-bold text-slate-950 dark:text-white">Documents</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Invoice, labels, pickup slip, and tracking updates can be shown here.
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Live webhook events from Shiprocket can be rendered here later.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
