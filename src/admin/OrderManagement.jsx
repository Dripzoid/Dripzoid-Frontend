// src/admin/OrderManagement.jsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BarChart3,
  PackageSearch,
  ClipboardList,
  Upload,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Truck,
  User2,
  Trash2,
  Copy,
  Calendar,
} from "lucide-react";

import { motion } from "framer-motion";

import api from "../utils/api";

/* =====================================================
   CONFIG
===================================================== */

const DEBUG = false;

const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

/* =====================================================
   HELPERS
===================================================== */

const normalize = (res) => {
  if (!res) return {};

  if (
    res.data &&
    typeof res.data ===
      "object"
  ) {
    return res.data;
  }

  return res;
};

const formatCurrency = (
  n
) =>
  typeof n === "number"
    ? n.toLocaleString(
        "en-IN",
        {
          style:
            "currency",

          currency:
            "INR",

          maximumFractionDigits: 2,
        }
      )
    : "₹0.00";

const safeItemsCount = (
  order
) => {
  if (!order) return 0;

  if (
    Array.isArray(
      order.items
    ) &&
    order.items.length
  ) {
    return order.items
      .length;
  }

  return Number(
    order.items_count ||
      0
  );
};

const userNameFrom = (
  o
) =>
  (
    o?.user_name ||
    o?.customer_name ||
    o?.user?.name ||
    ""
  ).trim();

const userIdFrom = (
  o
) =>
  o?.user_id ||
  o?.user?.id ||
  "-";

/* =====================================================
   TRY GET MANY
===================================================== */

async function tryGetMany(
  urls = [],
  params = {}
) {
  for (const url of urls) {
    try {
      const res =
        await api.get(
          url,
          { params },
          true
        );

      if (res) {
        return res;
      }
    } catch (err) {
      if (DEBUG) {
        console.error(
          err
        );
      }
    }
  }

  return null;
}

/* =====================================================
   SORT
===================================================== */

const sortOrdersClient = (
  list = [],
  sort = "newest"
) => {
  if (
    !Array.isArray(list)
  ) {
    return [];
  }

  const copy = [
    ...list,
  ];

  switch (sort) {
    case "newest":
      copy.sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );
      break;

    case "oldest":
      copy.sort(
        (a, b) =>
          new Date(
            a.createdAt
          ) -
          new Date(
            b.createdAt
          )
      );
      break;

    case "amount_asc":
      copy.sort(
        (a, b) =>
          Number(
            a.totalAmount ||
              0
          ) -
          Number(
            b.totalAmount ||
              0
          )
      );
      break;

    case "amount_desc":
      copy.sort(
        (a, b) =>
          Number(
            b.totalAmount ||
              0
          ) -
          Number(
            a.totalAmount ||
              0
          )
      );
      break;

    default:
      break;
  }

  return copy;
};

/* =====================================================
   COMPONENT
===================================================== */

export default function OrderManagement() {
  /* =====================================================
     STATE
  ===================================================== */

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "browse"
  );

  const [
    statsTab,
    setStatsTab,
  ] = useState(
    "overall"
  );

  const todayIso =
    new Date()
      .toISOString()
      .slice(0, 10);

  const currentMonth =
    new Date()
      .toISOString()
      .slice(0, 7);

  const [
    statsDay,
    setStatsDay,
  ] = useState(
    todayIso
  );

  const [
    statsMonth,
    setStatsMonth,
  ] = useState(
    currentMonth
  );

  const [
    statsWeek,
    setStatsWeek,
  ] = useState("");

  const [
    stats,
    setStats,
  ] = useState({
    totalOrders: 0,
    confirmedOrders: 0,
    pendingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalSales: 0,
    totalItemsSold: 0,
  });

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    browseQ,
    setBrowseQ,
  ] = useState("");

  const [
    browseSort,
    setBrowseSort,
  ] = useState(
    "newest"
  );

  const [
    browseLimit,
    setBrowseLimit,
  ] = useState("20");

  const [
    browsePage,
    setBrowsePage,
  ] = useState(1);

  const [
    browseTotalPages,
    setBrowseTotalPages,
  ] = useState(null);

  const [
    browseHasMore,
    setBrowseHasMore,
  ] = useState(false);

  const [
    browseLoading,
    setBrowseLoading,
  ] = useState(false);

  const [
    updateOrders,
    setUpdateOrders,
  ] = useState([]);

  const [
    updateQ,
    setUpdateQ,
  ] = useState("");

  const [
    updateSort,
    setUpdateSort,
  ] = useState(
    "newest"
  );

  const [
    updateLimit,
    setUpdateLimit,
  ] = useState("20");

  const [
    updatePage,
    setUpdatePage,
  ] = useState(1);

  const [
    updateTotalPages,
    setUpdateTotalPages,
  ] = useState(null);

  const [
    updateHasMore,
    setUpdateHasMore,
  ] = useState(false);

  const [
    updateLoading,
    setUpdateLoading,
  ] = useState(false);

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState(null);

  const [
    statusUpdatingId,
    setStatusUpdatingId,
  ] = useState(null);

  const [
    bulkRows,
    setBulkRows,
  ] = useState([
    {
      value: "",
      status:
        STATUS_OPTIONS[1],
    },
  ]);

  const [
    globalBulkStatus,
    setGlobalBulkStatus,
  ] = useState(
    STATUS_OPTIONS[1]
  );

  const [
    bulkUpdating,
    setBulkUpdating,
  ] = useState(false);

  const bulkInputRefs =
    useRef({});

  /* =====================================================
     FETCH STATS
  ===================================================== */

  const fetchStatsForTab =
    async (
      tab = "overall"
    ) => {
      try {
        let params = {};

        switch (tab) {
          case "monthly":
            params = {
              range:
                "monthly",
              month:
                statsMonth,
            };
            break;

          case "weekly":
            params = {
              range:
                "weekly",
              week:
                statsWeek,
            };
            break;

          case "day":
            params = {
              range:
                "daywise",
              date:
                statsDay,
            };
            break;

          default:
            params = {
              range:
                "overall",
            };
        }

        const res =
          await api.get(
            "/api/admin/stats",
            {
              params,
            },
            true
          );

        const body =
          normalize(
            res
          );

        setStats({
          totalOrders:
            Number(
              body.totalOrders ||
                0
            ),

          confirmedOrders:
            Number(
              body.confirmedOrders ||
                0
            ),

          pendingOrders:
            Number(
              body.pendingOrders ||
                0
            ),

          shippedOrders:
            Number(
              body.shippedOrders ||
                0
            ),

          deliveredOrders:
            Number(
              body.deliveredOrders ||
                0
            ),

          cancelledOrders:
            Number(
              body.cancelledOrders ||
                0
            ),

          totalSales:
            Number(
              body.totalSales ||
                0
            ),

          totalItemsSold:
            Number(
              body.totalItemsSold ||
                0
            ),
        });
      } catch (e) {
        console.error(
          "Failed to fetch stats:",
          e
        );
      }
    };

  /* =====================================================
     BUILD SEARCH PARAMS
  ===================================================== */

  const buildSearchParams =
    (
      page,
      limit,
      search,
      sort
    ) => {
      const params = {
        page:
          Number(
            page || 1
          ),
      };

      if (
        limit !== "all"
      ) {
        params.limit =
          Number(
            limit || 20
          );
      } else {
        params.limit =
          "all";
      }

      if (
        search?.trim()
      ) {
        params.search =
          search.trim();
      }

      if (sort) {
        params.sort =
          sort;
      }

      return params;
    };

  /* =====================================================
     FETCH ORDERS
  ===================================================== */

  const fetchOrders =
    async ({
      page =
        browsePage,

      limit =
        browseLimit,

      search =
        browseQ,

      sort =
        browseSort,
    } = {}) => {
      setBrowseLoading(
        true
      );

      try {
        const candidate =
          [
            "/api/admin/orders",
          ];

        const params =
          buildSearchParams(
            page,
            limit,
            search,
            sort
          );

        const res =
          await tryGetMany(
            candidate,
            params
          );

        const body =
          normalize(
            res
          );

        let list = [];

        if (
          Array.isArray(
            body.data
          )
        ) {
          list =
            body.data;
        }

        const sorted =
          sortOrdersClient(
            list,
            sort
          );

        setOrders(
          sorted
        );

        setBrowseTotalPages(
          body.totalPages ||
            1
        );

        setBrowseHasMore(
          page <
            (body.totalPages ||
              1)
        );
      } catch (e) {
        console.error(e);

        setOrders([]);
      } finally {
        setBrowseLoading(
          false
        );
      }
    };

  /* =====================================================
     FETCH UPDATE ORDERS
  ===================================================== */

  const fetchUpdateOrders =
    async ({
      page =
        updatePage,

      limit =
        updateLimit,

      search =
        updateQ,

      sort =
        updateSort,
    } = {}) => {
      setUpdateLoading(
        true
      );

      try {
        const candidate =
          [
            "/api/admin/orders",
          ];

        const params =
          buildSearchParams(
            page,
            limit,
            search,
            sort
          );

        const res =
          await tryGetMany(
            candidate,
            params
          );

        const body =
          normalize(
            res
          );

        let list = [];

        if (
          Array.isArray(
            body.data
          )
        ) {
          list =
            body.data;
        }

        const sorted =
          sortOrdersClient(
            list,
            sort
          );

        setUpdateOrders(
          sorted
        );

        setUpdateTotalPages(
          body.totalPages ||
            1
        );

        setUpdateHasMore(
          page <
            (body.totalPages ||
              1)
        );
      } catch (e) {
        console.error(e);

        setUpdateOrders(
          []
        );
      } finally {
        setUpdateLoading(
          false
        );
      }
    };

  /* =====================================================
     VIEW ORDER
  ===================================================== */

  const viewOrder =
    async (o) => {
      if (!o) return;

      try {
        const candidate =
          [
            `/api/admin/orders/${o.id}`,
          ];

        const res =
          await tryGetMany(
            candidate
          );

        const body =
          normalize(
            res
          );

        setSelectedOrder(
          body
        );
      } catch (e) {
        console.error(e);
      }
    };

  /* =====================================================
     UPDATE STATUS
  ===================================================== */

  const updateOrderStatus =
    async (
      id,
      status
    ) => {
      try {
        setStatusUpdatingId(
          id
        );

        const candidate =
          [
            `/api/admin/orders/${id}`,
          ];

        let ok = false;

        for (const u of candidate) {
          try {
            await api.patch(
              u,
              {
                status,
              },
              true
            );

            ok = true;

            break;
          } catch {
            try {
              await api.put(
                u,
                {
                  status,
                },
                true
              );

              ok = true;

              break;
            } catch {}
          }
        }

        if (!ok) {
          throw new Error(
            "Failed"
          );
        }

        await Promise.allSettled(
          [
            fetchStatsForTab(
              statsTab
            ),

            fetchOrders(),

            fetchUpdateOrders(),
          ]
        );
      } catch (e) {
        console.error(e);

        alert(
          "Failed to update order status"
        );
      } finally {
        setStatusUpdatingId(
          null
        );
      }
    };

  /* =====================================================
     BULK UPDATE
  ===================================================== */

  const doBulkUpdate =
    async () => {
      const rows =
        bulkRows.filter(
          (r) =>
            r.value
        );

      if (!rows.length) {
        return alert(
          "Enter at least one order ID"
        );
      }

      setBulkUpdating(
        true
      );

      try {
        const ids =
          rows.map(
            (r) =>
              Number(
                r.value
              )
          );

        const candidateBulk =
          [
            {
              method:
                "post",

              url:
                "/api/admin/orders/bulk-update",

              key: "ids",
            },

            {
              method:
                "put",

              url:
                "/api/admin/orders/bulk-update",

              key: "ids",
            },

            {
              method:
                "post",

              url:
                "/api/admin/orders/bulk-update",

              key:
                "orderIds",
            },

            {
              method:
                "put",

              url:
                "/api/admin/orders/bulk-update",

              key:
                "orderIds",
            },
          ];

        for (const attempt of candidateBulk) {
          try {
            const body = {
              [
                attempt
                  .key
              ]: ids,

              status:
                globalBulkStatus,
            };

            if (
              attempt.method ===
              "post"
            ) {
              await api.post(
                attempt.url,
                body,
                true
              );
            } else {
              await api.put(
                attempt.url,
                body,
                true
              );
            }

            break;
          } catch {}
        }

        await Promise.allSettled(
          [
            fetchStatsForTab(
              statsTab
            ),

            fetchOrders(),

            fetchUpdateOrders(),
          ]
        );

        alert(
          "Bulk update completed"
        );
      } catch (e) {
        console.error(e);

        alert(
          "Bulk update failed"
        );
      } finally {
        setBulkUpdating(
          false
        );
      }
    };

  /* =====================================================
     EFFECTS
  ===================================================== */

  useEffect(() => {
    fetchStatsForTab(
      statsTab
    );

    fetchOrders();

    fetchUpdateOrders();

    // eslint-disable-next-line
  }, []);

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div>
      Order Management
    </div>
  );
}
