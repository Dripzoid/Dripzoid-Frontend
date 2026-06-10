import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Image as ImageIcon,
  Download,
  Tag,
  Megaphone,
  ShieldCheck,
  Truck,
} from "lucide-react";

export default function AdminLayout() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "Products",
      path: "/admin/products",
      icon: <Package size={20} />,
    },
    {
      label: "Orders",
      path: "/admin/orders",
      icon: <ShoppingBag size={20} />,
    },
    {
      label: "Shipping",
      path: "/admin/shipping",
      icon: <Truck size={20} />,
    },
    {
      label: "Users",
      path: "/admin/users",
      icon: <Users size={20} />,
    },
    {
      label: "Certificates",
      path: "/admin/certificates",
      icon: <ShieldCheck size={20} />,
    },
    {
      label: "Image Upload",
      path: "/admin/upload",
      icon: <ImageIcon size={20} />,
    },
    {
      label: "Labels Download",
      path: "/admin/labels",
      icon: <Download size={20} />,
    },
    {
      label: "Coupons",
      path: "/admin/coupons",
      icon: <Tag size={20} />,
    },
    {
      label: "Sales & Slides",
      path: "/admin/salesandslides",
      icon: <Megaphone size={20} />,
    },
  ];

  const isActive = (path) => {
    if (path === "/admin/dashboard") {
      return location.pathname === "/admin" || location.pathname === "/admin/dashboard";
    }
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`
          relative flex flex-col border-r border-slate-200 bg-white
          transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950
          ${expanded ? "w-64" : "w-[72px]"}
        `}
      >
        {/* Header */}
        <div className="flex h-20 items-center border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`
                min-w-0 whitespace-nowrap transition-all duration-300
                ${expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}
              `}
            >
              <h2 className="text-lg font-bold tracking-tight">Dripzoid</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="
            flex-1 space-y-2 overflow-y-auto p-3
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
          "
          role="navigation"
          aria-label="Admin sidebar"
        >
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`
                  group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200
                  ${
                    active
                      ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }
                `}
              >
                <div
                  className={`
                    flex min-w-[24px] items-center justify-center
                    ${active ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400"}
                  `}
                >
                  {item.icon}
                </div>

                <span
                  className={`
                    whitespace-nowrap font-medium transition-all duration-300
                    ${
                      expanded
                        ? "opacity-100 translate-x-0"
                        : "pointer-events-none opacity-0 -translate-x-3"
                    }
                  `}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-slate-100 p-3 dark:bg-slate-900">
            <div
              className={`
                min-w-0 whitespace-nowrap transition-all duration-300
                ${expanded ? "opacity-100 translate-x-0" : "pointer-events-none opacity-0 -translate-x-3"}
              `}
            >
              <p className="text-sm font-semibold">Administrator</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className="
          flex flex-1 flex-col overflow-hidden
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {/* Header */}
        <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage products, orders, users & shipping
            </p>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="
            flex-1 overflow-y-auto p-6
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
