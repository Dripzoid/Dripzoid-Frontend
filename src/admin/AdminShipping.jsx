import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package,
  PackageCheck,
  MapPinned,
  Search,
  RefreshCw,
  Filter,
  CircleAlert,
  TrendingUp,
  Clock3,
} from "lucide-react";

import ShippingTable from "../components/ShippingTable";
import ShipmentDetailsModal from "../components/ShipmentDetailsModal";

const mockShipments = [
  {
    id: "1",
    orderNumber: "DRIP-20260610-001",
    customer: "Sainadh Chowdary",
    phone: "9390942546",
    courier: "Delhivery",
    awbCode: "AWB123456789",
    shipmentStatus: "Shipped",
    orderStatus: "Shipped",
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

export default function AdminShipping() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [courier, setCourier] = useState("All");

  const [selectedShipment, setSelectedShipment] =
    useState(null);

  const filteredShipments = useMemo(() => {
    return mockShipments.filter((shipment) => {
      const matchesSearch =
        shipment.orderNumber
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        shipment.customer
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        shipment.awbCode
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        status === "All" ||
        shipment.shipmentStatus === status;

      const matchesCourier =
        courier === "All" ||
        shipment.courier === courier;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourier
      );
    });
  }, [search, status, courier]);

  const stats = useMemo(() => {
    const total =
      mockShipments.length;

    const shipped =
      mockShipments.filter(
        (s) =>
          s.shipmentStatus ===
          "Shipped"
      ).length;

    const delivered =
      mockShipments.filter(
        (s) =>
          s.shipmentStatus ===
          "Delivered"
      ).length;

    const ofd =
      mockShipments.filter(
        (s) =>
          s.shipmentStatus ===
          "Out For Delivery"
      ).length;

    return {
      total,
      shipped,
      delivered,
      ofd,
    };
  }, []);

  const statCards = [
    {
      title: "Total Shipments",
      value: stats.total,
      icon: Package,
      gradient:
        "from-violet-500 to-purple-600",
    },
    {
      title: "Shipped",
      value: stats.shipped,
      icon: Truck,
      gradient:
        "from-blue-500 to-cyan-600",
    },
    {
      title: "Out For Delivery",
      value: stats.ofd,
      icon: MapPinned,
      gradient:
        "from-orange-500 to-amber-600",
    },
    {
      title: "Delivered",
      value: stats.delivered,
      icon: PackageCheck,
      gradient:
        "from-emerald-500 to-green-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Shipping Management
            </h1>

            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Manage shipments,
              track deliveries,
              and monitor courier
              operations.
            </p>
          </div>

          <button
            className="
              inline-flex items-center gap-2
              rounded-xl
              bg-black px-4 py-2
              text-white
              transition
              hover:opacity-90
              dark:bg-white
              dark:text-black
            "
          >
            <RefreshCw
              size={16}
            />
            Refresh
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(
            (
              card,
              index
            ) => {
              const Icon =
                card.icon;

              return (
                <motion.div
                  key={
                    card.title
                  }
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index *
                      0.1,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-gray-200
                    bg-white
                    shadow-sm
                    dark:border-gray-800
                    dark:bg-gray-900
                  "
                >
                  <div
                    className={`
                      bg-gradient-to-r ${card.gradient}
                      p-4
                      text-white
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <Icon
                        size={
                          24
                        }
                      />

                      <TrendingUp
                        size={
                          18
                        }
                      />
                    </div>

                    <h3 className="mt-4 text-3xl font-bold">
                      {
                        card.value
                      }
                    </h3>

                    <p className="text-sm opacity-90">
                      {
                        card.title
                      }
                    </p>
                  </div>
                </motion.div>
              );
            }
          )}
        </div>

        {/* Filters */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="
            rounded-2xl
            border
            border-gray-200
            bg-white
            p-5
            shadow-sm
            dark:border-gray-800
            dark:bg-gray-900
          "
        >
          <div className="grid gap-4 lg:grid-cols-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search
                size={18}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="text"
                value={
                  search
                }
                onChange={(
                  e
                ) =>
                  setSearch(
                    e.target
                      .value
                  )
                }
                placeholder="Search orders, customers or AWB..."
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  py-3
                  pl-10
                  pr-4
                  outline-none
                  focus:border-black
                  dark:border-gray-700
                  dark:bg-gray-800
                  dark:text-white
                "
              />
            </div>

            {/* Status */}
            <select
              value={
                status
              }
              onChange={(
                e
              ) =>
                setStatus(
                  e.target
                    .value
                )
              }
              className="
                rounded-xl
                border
                border-gray-200
                px-4
                py-3
                dark:border-gray-700
                dark:bg-gray-800
                dark:text-white
              "
            >
              <option>
                All
              </option>

              <option>
                Confirmed
              </option>

              <option>
                Shipped
              </option>

              <option>
                Out For Delivery
              </option>

              <option>
                Delivered
              </option>

              <option>
                Cancelled
              </option>
            </select>

            {/* Courier */}
            <select
              value={
                courier
              }
              onChange={(
                e
              ) =>
                setCourier(
                  e.target
                    .value
                )
              }
              className="
                rounded-xl
                border
                border-gray-200
                px-4
                py-3
                dark:border-gray-700
                dark:bg-gray-800
                dark:text-white
              "
            >
              <option>
                All
              </option>

              <option>
                Delhivery
              </option>

              <option>
                Blue Dart
              </option>

              <option>
                DTDC
              </option>
            </select>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Filter
              size={14}
            />

            Showing{" "}
            {
              filteredShipments.length
            }{" "}
            shipment(s)
          </div>
        </motion.div>

        {/* Alert */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="
            flex items-center gap-3
            rounded-2xl
            border border-amber-200
            bg-amber-50
            p-4
            text-amber-700
          "
        >
          <CircleAlert
            size={20}
          />

          <div>
            <p className="font-medium">
              Webhook
              integration
              pending
            </p>

            <p className="text-sm">
              Shipment
              statuses are
              currently
              refreshed
              manually.
            </p>
          </div>
        </motion.div>

        {/* Table */}
        <ShippingTable
          shipments={
            filteredShipments
          }
          onView={(
            shipment
          ) =>
            setSelectedShipment(
              shipment
            )
          }
        />

        {/* Footer */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock3
            size={14}
          />

          Last synced 2
          minutes ago
        </div>
      </div>

      <ShipmentDetailsModal
        shipment={
          selectedShipment
        }
        open={
          !!selectedShipment
        }
        onClose={() =>
          setSelectedShipment(
            null
          )
        }
      />
    </div>
  );
}
