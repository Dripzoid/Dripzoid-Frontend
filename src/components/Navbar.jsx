// src/components/Navbar.jsx
import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import {
  Sun,
  Moon,
  User,
  Menu,
  X,
} from "lucide-react";
import GlobalSearchBar from "./GlobalSearch.jsx";

export default function Navbar() {
  const { user } = useContext(UserContext);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const navLinks = [
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
  ];

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-[96px]">

            {/* LEFT — LOGO */}
            <Link to="/" className="flex items-center h-full flex-shrink-0">
              <div className="h-[86px] flex items-center pr-3">
                <img
                  src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
                  alt="Dripzoid"
                  className="h-full w-auto object-cover block"
                />
              </div>
            </Link>

            {/* DESKTOP NAV LINKS */}
            <div className="hidden md:flex items-center space-x-10">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* RIGHT — ACTIONS */}
            <div className="flex items-center gap-3">

              {/* Desktop Search */}
              <div className="hidden md:block w-52">
                <GlobalSearchBar />
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {/* LOGIN / ACCOUNT — REPLACES CART & WISHLIST */}
              {user ? (
                <Link
                  to="/account"
                  className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
                >
                  <User size={16} />
                  Account
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-flex px-5 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
                >
                  Login
                </Link>
              )}

              {/* MOBILE MENU TOGGLE */}
              <button
                onClick={() => setMobileMenu((m) => !m)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Toggle menu"
              >
                {mobileMenu ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE DROPDOWN ================= */}
      {mobileMenu && (
        <div className="md:hidden fixed top-[96px] left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t shadow-lg">
          <div className="flex flex-col p-5 space-y-5 text-gray-800 dark:text-gray-200">

            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenu(false)}
                className="text-lg font-medium"
              >
                {link.name}
              </Link>
            ))}

            <GlobalSearchBar />
          </div>
        </div>
      )}
    </>
  );
}
