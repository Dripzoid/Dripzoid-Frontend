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

export default function ShipmentDetailsModal({
  open,
  shipment,
  onClose,
}) {
  if (!shipment) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={onClose}
            className="
              fixed inset-0
              z-50
              bg-black/50
              backdrop-blur-sm
            "
          />

          {/* Drawer */}

          <motion.div
            initial={{
              x: "100%",
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: "100%",
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 220,
            }}
            className="
              fixed
              right-0
              top-0
              z-50
              h-screen
              w-full
              overflow-y-auto
              bg-white
              shadow-2xl
              dark:bg-gray-950
              md:w-[700px]
            "
          >
            {/* Header */}

            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Shipment Details
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {
                      shipment.orderNumber
                    }
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="
                    rounded-xl
                    border
                    border-gray-200
                    p-2
                    transition
                    hover:bg-gray-100
                    dark:border-gray-700
                    dark:hover:bg-gray-800
                  "
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Action Buttons */}

              <div className="flex flex-wrap gap-3">
                <button
                  className="
                    flex items-center gap-2
                    rounded-xl
                    bg-black
                    px-4 py-2
                    text-white
                    transition
                    hover:opacity-90
                    dark:bg-white
                    dark:text-black
                  "
                >
                  <RefreshCw size={16} />
                  Sync Tracking
                </button>

                <button
                  className="
                    flex items-center gap-2
                    rounded-xl
                    border
                    border-gray-200
                    px-4 py-2
                    dark:border-gray-700
                  "
                >
                  <FileText size={16} />
                  Invoice
                </button>

                <button
                  className="
                    flex items-center gap-2
                    rounded-xl
                    border
                    border-gray-200
                    px-4 py-2
                    dark:border-gray-700
                  "
                >
                  <ExternalLink
                    size={16}
                  />
                  Track Live
                </button>
              </div>

              {/* Overview Cards */}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Order Info */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-gray-200
                    bg-white
                    p-5
                    dark:border-gray-800
                    dark:bg-gray-900
                  "
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Package
                      size={18}
                    />

                    <h3 className="font-semibold">
                      Order Details
                    </h3>
                  </div>

                  <div className="space-y-3 text-sm">
                    <InfoRow
                      icon={
                        <Hash
                          size={14}
                        />
                      }
                      label="Order Number"
                      value={
                        shipment.orderNumber
                      }
                    />

                    <InfoRow
                      icon={
                        <Calendar
                          size={14}
                        />
                      }
                      label="Created"
                      value={
                        shipment.createdAt
                      }
                    />

                    <InfoRow
                      icon={
                        <Package
                          size={14}
                        />
                      }
                      label="Status"
                      value={
                        shipment.orderStatus
                      }
                    />
                  </div>
                </div>

                {/* Shipment Info */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-gray-200
                    bg-white
                    p-5
                    dark:border-gray-800
                    dark:bg-gray-900
                  "
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Truck
                      size={18}
                    />

                    <h3 className="font-semibold">
                      Shipment Info
                    </h3>
                  </div>

                  <div className="space-y-3 text-sm">
                    <InfoRow
                      icon={
                        <Truck
                          size={14}
                        />
                      }
                      label="Courier"
                      value={
                        shipment.courier
                      }
                    />

                    <InfoRow
                      icon={
                        <Hash
                          size={14}
                        />
                      }
                      label="AWB"
                      value={
                        shipment.awbCode
                      }
                    />

                    <InfoRow
                      icon={
                        <Package
                          size={14}
                        />
                      }
                      label="Shipment Status"
                      value={
                        shipment.shipmentStatus
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Customer */}

              <div
                className="
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  p-5
                  dark:border-gray-800
                  dark:bg-gray-900
                "
              >
                <div className="mb-4 flex items-center gap-2">
                  <User size={18} />

                  <h3 className="font-semibold">
                    Customer Details
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoRow
                    icon={
                      <User
                        size={14}
                      />
                    }
                    label="Customer"
                    value={
                      shipment.customer
                    }
                  />

                  <InfoRow
                    icon={
                      <Phone
                        size={14}
                      />
                    }
                    label="Phone"
                    value={
                      shipment.phone
                    }
                  />
                </div>

                <div className="mt-4">
                  <InfoRow
                    icon={
                      <MapPin
                        size={14}
                      />
                    }
                    label="Location"
                    value={`${shipment.city}, ${shipment.state}`}
                  />
                </div>
              </div>

              {/* Tracking Timeline */}

              <div
                className="
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  p-5
                  dark:border-gray-800
                  dark:bg-gray-900
                "
              >
                <h3 className="mb-6 font-semibold">
                  Tracking Timeline
                </h3>

                <div className="space-y-5">
                  {defaultTimeline.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.status
                        }
                        className="flex gap-4"
                      >
                        <div className="flex flex-col items-center">
                          {item.completed ? (
                            <CheckCircle2
                              size={
                                20
                              }
                              className="text-green-500"
                            />
                          ) : (
                            <Circle
                              size={
                                20
                              }
                              className="text-gray-400"
                            />
                          )}

                          {index !==
                            defaultTimeline.length -
                              1 && (
                            <div className="mt-1 h-10 w-px bg-gray-300 dark:bg-gray-700" />
                          )}
                        </div>

                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {
                              item.status
                            }
                          </p>

                          <p className="text-sm text-gray-500">
                            {item.date ||
                              "Pending"}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Raw Tracking Events Placeholder */}

              <div
                className="
                  rounded-2xl
                  border
                  border-dashed
                  border-gray-300
                  p-5
                  text-center
                  dark:border-gray-700
                "
              >
                <p className="text-sm text-gray-500">
                  Later this section
                  will show live
                  ShipmentTracking
                  events from
                  Shiprocket
                  webhooks.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoRow({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">
        {icon}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {label}
        </p>

        <p className="font-medium text-gray-900 dark:text-white">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}
