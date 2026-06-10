import { motion } from "framer-motion";
import {
  Eye,
  RefreshCw,
  FileText,
  Truck,
  PackageCheck,
  MapPinned,
} from "lucide-react";

const statusStyles = {
  Confirmed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",

  Shipped:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",

  "Out For Delivery":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",

  Delivered:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",

  Cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",

  RTO:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

function StatusBadge({
  status,
}) {
  return (
    <span
      className={`
        inline-flex items-center
        rounded-full
        px-3 py-1
        text-xs font-medium
        ${
          statusStyles[
            status
          ] ||
          "bg-gray-100 text-gray-700"
        }
      `}
    >
      {status}
    </span>
  );
}

export default function ShippingTable({
  shipments = [],
  onView,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
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
      {/* Header */}

      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Shipments
          </h2>

          <p className="text-sm text-gray-500">
            Monitor and
            manage all
            shipment
            activity
          </p>
        </div>

        <div className="text-sm text-gray-500">
          {shipments.length}{" "}
          Records
        </div>
      </div>

      {/* Desktop Table */}

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left dark:border-gray-800">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Order
              </th>

              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Customer
              </th>

              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Courier
              </th>

              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                AWB
              </th>

              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Shipment
              </th>

              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Order Status
              </th>

              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Date
              </th>

              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {shipments.map(
              (
                shipment,
                index
              ) => (
                <motion.tr
                  key={
                    shipment.id
                  }
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    delay:
                      index *
                      0.05,
                  }}
                  whileHover={{
                    backgroundColor:
                      "rgba(0,0,0,0.02)",
                  }}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {
                          shipment.orderNumber
                        }
                      </p>

                      <p className="text-xs text-gray-500">
                        #
                        {
                          shipment.id
                        }
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {
                          shipment.customer
                        }
                      </p>

                      <p className="text-xs text-gray-500">
                        {
                          shipment.phone
                        }
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Truck
                        size={
                          16
                        }
                        className="text-blue-500"
                      />

                      <span className="text-gray-700 dark:text-gray-300">
                        {
                          shipment.courier
                        }
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <code className="rounded-lg bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                      {
                        shipment.awbCode
                      }
                    </code>
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge
                      status={
                        shipment.shipmentStatus
                      }
                    />
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge
                      status={
                        shipment.orderStatus
                      }
                    />
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {
                      shipment.createdAt
                    }
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onView?.(
                            shipment
                          )
                        }
                        className="
                          rounded-lg
                          border
                          border-gray-200
                          p-2
                          transition
                          hover:bg-gray-100
                          dark:border-gray-700
                          dark:hover:bg-gray-800
                        "
                      >
                        <Eye
                          size={
                            16
                          }
                        />
                      </button>

                      <button
                        className="
                          rounded-lg
                          border
                          border-gray-200
                          p-2
                          transition
                          hover:bg-gray-100
                          dark:border-gray-700
                          dark:hover:bg-gray-800
                        "
                      >
                        <RefreshCw
                          size={
                            16
                          }
                        />
                      </button>

                      <button
                        className="
                          rounded-lg
                          border
                          border-gray-200
                          p-2
                          transition
                          hover:bg-gray-100
                          dark:border-gray-700
                          dark:hover:bg-gray-800
                        "
                      >
                        <FileText
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}

      <div className="space-y-4 p-4 lg:hidden">
        {shipments.map(
          (
            shipment
          ) => (
            <motion.div
              key={
                shipment.id
              }
              whileHover={{
                y: -2,
              }}
              className="
                rounded-xl
                border
                border-gray-200
                p-4
                dark:border-gray-800
              "
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {
                      shipment.orderNumber
                    }
                  </h3>

                  <p className="text-sm text-gray-500">
                    {
                      shipment.customer
                    }
                  </p>
                </div>

                <StatusBadge
                  status={
                    shipment.shipmentStatus
                  }
                />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Truck
                    size={
                      15
                    }
                  />
                  {
                    shipment.courier
                  }
                </div>

                <div className="flex items-center gap-2">
                  <PackageCheck
                    size={
                      15
                    }
                  />
                  {
                    shipment.awbCode
                  }
                </div>

                <div className="flex items-center gap-2">
                  <MapPinned
                    size={
                      15
                    }
                  />
                  {
                    shipment.city
                  }
                  ,
                  {
                    shipment.state
                  }
                </div>
              </div>

              <button
                onClick={() =>
                  onView?.(
                    shipment
                  )
                }
                className="
                  mt-4
                  w-full
                  rounded-xl
                  bg-black
                  py-2
                  text-white
                  dark:bg-white
                  dark:text-black
                "
              >
                View Details
              </button>
            </motion.div>
          )
        )}
      </div>

      {shipments.length ===
        0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageCheck
            size={50}
            className="mb-4 text-gray-300"
          />

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Shipments
            Found
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Try adjusting
            your filters or
            search criteria.
          </p>
        </div>
      )}
    </motion.div>
  );
}
