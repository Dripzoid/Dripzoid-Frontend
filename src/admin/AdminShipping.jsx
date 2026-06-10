import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Filter,
  Package,
  PackageCheck,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

import ShippingTable from "../components/ShippingTable";
import ShipmentDetailsModal from "../components/ShipmentDetailsModal";

const initialShipments = [
  {
    id: "1",
    orderNumber: "DRIP-20260610-001",
    customer: "Sainadh Chowdary",
    phone: "9390942546",
    courier: "Delhivery",
    awbCode: "",
    shipmentStatus: "Confirmed",
    orderStatus: "Confirmed",
    createdAt: "2026-06-10",
    city: "Guntur",
    state: "Andhra Pradesh",
  },
  {
    id: "2",
    orderNumber: "DRIP-20260610-002",
    customer: "Teja",
    phone: "9876543210",
    courier: "Blue Dart",
    awbCode: "AWB987654321",
    shipmentStatus: "Delivered",
    orderStatus: "Delivered",
    createdAt: "2026-06-09",
    city: "Kakinada",
    state: "Andhra Pradesh",
  },
  {
    id: "3",
    orderNumber: "DRIP-20260610-003",
    customer: "Ram",
    phone: "9123456789",
    courier: "DTDC",
    awbCode: "AWB567891234",
    shipmentStatus: "Out For Delivery",
    orderStatus: "Out For Delivery",
    createdAt: "2026-06-10",
    city: "Vijayawada",
    state: "Andhra Pradesh",
  },
];

const statusOptions = [
  "All",
  "Confirmed",
  "Shipped",
  "Out For Delivery",
  "Delivered",
  "Cancelled",
];

const courierOptions = ["All", "Delhivery", "Blue Dart", "DTDC"];

const sortOptions = [
  { value: "latest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "customer", label: "Customer A–Z" },
  { value: "order", label: "Order No." },
];

const courierDirectory = [
  {
    name: "Delhivery",
    speed: "Fast",
    pickup: "Same day pickup",
    coverage: "Pan India",
    active: true,
  },
  {
    name: "Blue Dart",
    speed: "Fast",
    pickup: "Next day pickup",
    coverage: "Metro focus",
    active: true,
  },
  {
    name: "DTDC",
    speed: "Standard",
    pickup: "Scheduled pickup",
    coverage: "Wide coverage",
    active: true,
  },
  {
    name: "Shiprocket",
    speed: "Aggregator",
    pickup: "On demand",
    coverage: "Multiple couriers",
    active: true,
  },
];

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function MetricCard({ title, value, icon: Icon, gradient }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_60px_-24px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-900"
    >
      <div className={`bg-gradient-to-br ${gradient} p-5 text-white`}>
        <div className="flex items-center justify-between">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <Icon size={22} />
          </div>
          <ArrowUpRight size={18} className="opacity-90" />
        </div>

        <div className="mt-6">
          <h3 className="text-3xl font-black">{value}</h3>
          <p className="mt-1 text-sm/6 text-white/90">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionCard({ title, description, icon: Icon, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      className="group w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}

function ModalShell({ title, icon: Icon, onClose, children, widthClass = "max-w-2xl" }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className={`relative w-full ${widthClass} overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_100px_-30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950">
              <Icon size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminShipping() {
  const [shipments, setShipments] = useState(initialShipments);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [courier, setCourier] = useState("All");
  const [sortBy, setSortBy] = useState("latest");

  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [notice, setNotice] = useState("");

  const [showAwbModal, setShowAwbModal] = useState(false);
  const [showCouriersModal, setShowCouriersModal] = useState(false);
  const [showServiceabilityModal, setShowServiceabilityModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);

  const [awbShipmentId, setAwbShipmentId] = useState("");
  const [awbCourier, setAwbCourier] = useState("");
  const [awbPrefix, setAwbPrefix] = useState("AWB");

  const [serviceabilityCourier, setServiceabilityCourier] = useState("All");
  const [serviceabilityPincode, setServiceabilityPincode] = useState("");
  const [serviceabilityResult, setServiceabilityResult] = useState(null);

  const [pickupShipmentId, setPickupShipmentId] = useState("");
  const [pickupDate, setPickupDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [pickupTime, setPickupTime] = useState("10:00");
  const [pickupComment, setPickupComment] = useState("");

  const filteredShipments = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = shipments.filter((item) => {
      const matchesSearch =
        item.orderNumber.toLowerCase().includes(q) ||
        item.customer.toLowerCase().includes(q) ||
        item.awbCode.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.state.toLowerCase().includes(q);

      const matchesStatus = status === "All" || item.shipmentStatus === status;
      const matchesCourier = courier === "All" || item.courier === courier;

      return matchesSearch && matchesStatus && matchesCourier;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "latest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "customer") {
        return a.customer.localeCompare(b.customer);
      }
      return a.orderNumber.localeCompare(b.orderNumber);
    });
  }, [shipments, search, status, courier, sortBy]);

  const stats = useMemo(() => {
    const total = shipments.length;
    const shipped = shipments.filter((s) => s.shipmentStatus === "Shipped").length;
    const delivered = shipments.filter((s) => s.shipmentStatus === "Delivered").length;
    const ofd = shipments.filter((s) => s.shipmentStatus === "Out For Delivery").length;
    const activeCouriers = new Set(shipments.map((s) => s.courier)).size;

    return { total, shipped, delivered, ofd, activeCouriers };
  }, [shipments]);

  const activeFiltersCount =
    (search ? 1 : 0) +
    (status !== "All" ? 1 : 0) +
    (courier !== "All" ? 1 : 0) +
    (sortBy !== "latest" ? 1 : 0);

  const openGenerateAwb = (shipment = null) => {
    const base = shipment || shipments[0];
    setAwbShipmentId(base?.id || "");
    setAwbCourier(base?.courier || "Delhivery");
    setAwbPrefix("AWB");
    setShowAwbModal(true);
  };

  const openPickupRequest = (shipment = null) => {
    const base = shipment || shipments[0];
    setPickupShipmentId(base?.id || "");
    setPickupDate(new Date().toISOString().slice(0, 10));
    setPickupTime("10:00");
    setPickupComment("");
    setShowPickupModal(true);
  };

  const refreshData = () => {
    setIsRefreshing(true);
    setLastSyncedAt(new Date());
    setNotice("Tracking data refreshed.");
    window.setTimeout(() => setIsRefreshing(false), 900);
    window.setTimeout(() => setNotice(""), 2500);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("All");
    setCourier("All");
    setSortBy("latest");
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastSyncedAt(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const handleGenerateAwb = () => {
    if (!awbShipmentId) return;

    const generatedAwb = `${awbPrefix || "AWB"}${Date.now().toString().slice(-9)}`;

    setShipments((prev) =>
      prev.map((item) =>
        item.id === awbShipmentId
          ? {
              ...item,
              courier: awbCourier,
              awbCode: generatedAwb,
              shipmentStatus: "Shipped",
              orderStatus: "Shipped",
            }
          : item
      )
    );

    setSelectedShipment((prev) =>
      prev && prev.id === awbShipmentId
        ? {
            ...prev,
            courier: awbCourier,
            awbCode: generatedAwb,
            shipmentStatus: "Shipped",
            orderStatus: "Shipped",
          }
        : prev
    );

    setShowAwbModal(false);
    setNotice("AWB generated.");
    window.setTimeout(() => setNotice(""), 2500);
  };

  const handleServiceabilityCheck = () => {
    const pin = serviceabilityPincode.trim();
    const isValid = /^\d{6}$/.test(pin) && !pin.startsWith("0");
    const courierLabel =
      serviceabilityCourier === "All" ? "selected couriers" : serviceabilityCourier;

    if (isValid) {
      setServiceabilityResult({
        ok: true,
        message: `${pin} is serviceable for ${courierLabel}.`,
      });
    } else {
      setServiceabilityResult({
        ok: false,
        message: `${pin || "Pincode"} is not serviceable.`,
      });
    }
  };

  const handlePickupRequest = () => {
    const shipment = shipments.find((item) => item.id === pickupShipmentId);

    setShowPickupModal(false);
    setNotice(
      `Pickup requested for ${shipment?.orderNumber || "shipment"} on ${pickupDate} at ${pickupTime}.`
    );
    window.setTimeout(() => setNotice(""), 3000);
  };

  const handleQuickNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white sm:p-6">
      <div className="w-full space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_20px_80px_-20px_rgba(15,23,42,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                <Sparkles size={14} />
                Shipping Control
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Shipping
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  AWB, couriers, serviceability, pickup requests.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X size={16} />
                Clear Filters
              </button>
            </div>
          </div>

          <AnimatePresence>
            {notice ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <BadgeCheck size={16} />
                {notice}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total"
            value={stats.total}
            icon={Package}
            gradient="from-violet-500 to-purple-600"
          />
          <MetricCard
            title="In Transit"
            value={stats.shipped + stats.ofd}
            icon={Truck}
            gradient="from-sky-500 to-cyan-600"
          />
          <MetricCard
            title="Delivered"
            value={stats.delivered}
            icon={PackageCheck}
            gradient="from-emerald-500 to-green-600"
          />
          <MetricCard
            title="Couriers"
            value={stats.activeCouriers}
            icon={Route}
            gradient="from-amber-500 to-orange-600"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <QuickActionCard
            title="Generate AWB"
            description="Create AWB for a shipment"
            icon={PackageCheck}
            onClick={() => openGenerateAwb()}
          />
          <QuickActionCard
            title="List Couriers"
            description="See active courier options"
            icon={Truck}
            onClick={() => setShowCouriersModal(true)}
          />
          <QuickActionCard
            title="Check Serviceability"
            description="Test pincode and courier"
            icon={Route}
            onClick={() => setShowServiceabilityModal(true)}
          />
          <QuickActionCard
            title="Request Pickup"
            description="Schedule shipment pickup"
            icon={ShieldCheck}
            onClick={() => openPickupRequest()}
          />
        </div>

        <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, customer, AWB, city, state..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <ArrowUpDown
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {courierOptions.map((option) => {
              const active = courier === option;
              return (
                <button
                  key={option}
                  onClick={() => setCourier(option)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <SlidersHorizontal size={16} />
              <span>
                Showing{" "}
                <span className="font-bold text-slate-950 dark:text-white">
                  {filteredShipments.length}
                </span>{" "}
                shipment{filteredShipments.length === 1 ? "" : "s"}
                {activeFiltersCount > 0
                  ? ` across ${activeFiltersCount} filter${activeFiltersCount === 1 ? "" : "s"}`
                  : ""}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Clock3 size={14} />
              Synced {formatDate(lastSyncedAt)}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900">
          <ShippingTable
            shipments={filteredShipments}
            onView={(shipment) => setSelectedShipment(shipment)}
            onRefresh={(shipment) => {
              setLastSyncedAt(new Date());
              handleQuickNotice(`Tracking refreshed for ${shipment.orderNumber}.`);
            }}
            onDocument={(shipment) => {
              handleQuickNotice(`Shipment document opened for ${shipment.orderNumber}.`);
            }}
            onMore={(shipment) => setSelectedShipment(shipment)}
            onGenerateAwb={(shipment) => openGenerateAwb(shipment)}
            onPickup={(shipment) => openPickupRequest(shipment)}
          />
        </div>
      </div>

      <ShipmentDetailsModal
        shipment={selectedShipment}
        open={!!selectedShipment}
        onClose={() => setSelectedShipment(null)}
        onRefresh={(shipment) => handleQuickNotice(`Tracking refreshed for ${shipment.orderNumber}.`)}
        onGenerateAwb={(shipment) => openGenerateAwb(shipment)}
        onTrackLive={(shipment) => handleQuickNotice(`Live tracking opened for ${shipment.orderNumber}.`)}
        onRequestPickup={(shipment) => openPickupRequest(shipment)}
      />

      <AnimatePresence>
        {showAwbModal ? (
          <ModalShell
            title="Generate AWB"
            icon={PackageCheck}
            onClose={() => setShowAwbModal(false)}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Shipment
                  </label>
                  <select
                    value={awbShipmentId}
                    onChange={(e) => setAwbShipmentId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    {shipments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.orderNumber} • {item.customer}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Courier
                  </label>
                  <select
                    value={awbCourier}
                    onChange={(e) => setAwbCourier(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    {courierDirectory.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  AWB prefix
                </label>
                <input
                  value={awbPrefix}
                  onChange={(e) => setAwbPrefix(e.target.value.toUpperCase())}
                  placeholder="AWB"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                Generates a mock AWB number and marks the shipment as shipped.
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAwbModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAwb}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                >
                  Generate AWB
                </button>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {showCouriersModal ? (
          <ModalShell
            title="List of Couriers"
            icon={Truck}
            onClose={() => setShowCouriersModal(false)}
            widthClass="max-w-3xl"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {courierDirectory.map((item) => (
                <div
                  key={item.name}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {item.coverage}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Speed</span>
                      <span className="font-semibold">{item.speed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pickup</span>
                      <span className="font-semibold">{item.pickup}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ModalShell>
        ) : null}

        {showServiceabilityModal ? (
          <ModalShell
            title="Check Courier Serviceability"
            icon={Route}
            onClose={() => setShowServiceabilityModal(false)}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Courier
                  </label>
                  <select
                    value={serviceabilityCourier}
                    onChange={(e) => setServiceabilityCourier(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    {courierOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Pincode
                  </label>
                  <input
                    value={serviceabilityPincode}
                    onChange={(e) =>
                      setServiceabilityPincode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    maxLength={6}
                    placeholder="Enter 6 digit pincode"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleServiceabilityCheck}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
              >
                Check Serviceability
              </button>

              {serviceabilityResult ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    serviceabilityResult.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                  }`}
                >
                  {serviceabilityResult.message}
                </div>
              ) : null}
            </div>
          </ModalShell>
        ) : null}

        {showPickupModal ? (
          <ModalShell
            title="Request Shipment Pickup"
            icon={ShieldCheck}
            onClose={() => setShowPickupModal(false)}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Shipment
                </label>
                <select
                  value={pickupShipmentId}
                  onChange={(e) => setPickupShipmentId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                >
                  {shipments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.orderNumber} • {item.customer}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Pickup date
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Pickup time
                  </label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Note
                </label>
                <textarea
                  value={pickupComment}
                  onChange={(e) => setPickupComment(e.target.value)}
                  rows={3}
                  placeholder="Optional pickup notes"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPickupModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePickupRequest}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                >
                  Request Pickup
                </button>
              </div>
            </div>
          </ModalShell>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
