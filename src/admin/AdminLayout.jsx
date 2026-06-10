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
      return (
        location.pathname === "/admin" ||
        location.pathname === "/admin/dashboard"
      );
    }

    return location.pathname === path;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`
          relative flex flex-col border-r border-slate-200
          bg-white dark:bg-slate-950 dark:border-slate-800
          transition-all duration-300 ease-in-out
          ${expanded ? "w-64" : "w-[72px]"}
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold">
              D
            </div>

            <div
              className={`
                transition-all duration-300 whitespace-nowrap
                ${
                  expanded
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-3"
                }
              `}
            >
              <h2 className="font-bold text-lg">Dripzoid</h2>
              <p className="text-xs text-slate-500">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center gap-3 rounded-2xl
                  px-3 py-3 transition-all duration-200

                  ${
                    active
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-md"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }
                `}
              >
                <div
                  className={`
                    flex items-center justify-center
                    min-w-[24px]
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
                        : "opacity-0 -translate-x-3 pointer-events-none"
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
        <div className="border-t border-slate-200 dark:border-slate-800 p-3">
          <div
            className={`
              flex items-center gap-3 rounded-2xl
              bg-slate-100 dark:bg-slate-900
              p-3 overflow-hidden
            `}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600" />

            <div
              className={`
                transition-all duration-300 whitespace-nowrap
                ${
                  expanded
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-3"
                }
              `}
            >
              <p className="text-sm font-semibold">
                Administrator
              </p>
              <p className="text-xs text-slate-500">
                Logged In
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="
            h-20 shrink-0
            border-b border-slate-200
            bg-white dark:bg-slate-950
            dark:border-slate-800
            px-6
            flex items-center justify-between
          "
        >
          <div>
            <h1 className="text-xl font-bold">
              Admin Dashboard
            </h1>

            <p className="text-sm text-slate-500">
              Manage products, orders, users & shipping
            </p>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
