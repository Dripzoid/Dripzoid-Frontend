// src/components/Navbar.jsx
import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import {
  Heart,
  ShoppingCart,
  Sun,
  Moon,
  User,
  Menu,
  X,
} from "lucide-react";
import GlobalSearchBar from "./GlobalSearch.jsx";

export default function Navbar() {
  const { user } = useContext(UserContext);
  const { cart = [] } = useCart();
  const { wishlist = [] } = useWishlist();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Theme handling
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () =>
    setTheme((t) => (t === "light" ? "dark" : "light"));

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email?.split?.("@")?.[0] ||
    "";

  const navLinks = [
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navbar Row */}
        <div className="flex items-center justify-between h-16">

          {/* ================= LEFT: LOGO ================= */}
          <div className="flex items-center h-full flex-shrink-0">
            <Link
              to="/"
              onClick={() => setMobileMenu(false)}
              className="flex items-center h-full"
            >
              <img
                src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
                alt="Dripzoid"
                style={{
                  height: "52px",
                  width: "auto",
                  maxHeight: "none",
                  display: "block",
                }}
              />
            </Link>
          </div>

          {/* ================= CENTER: NAV LINKS ================= */}
          {isDesktop && (
            <div className="flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white font-medium transition"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          )}

          {/* ================= RIGHT: ACTIONS ================= */}
          <div className="flex items-center gap-3 md:gap-4">
            {isDesktop && (
              <div className="w-52">
                <GlobalSearchBar />
              </div>
            )}

            {/* Wishlist */}
            <Link
              to="/account/wishlist"
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* User / Login */}
            {user ? (
              <Link
                to="/account"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <User size={18} />
                <span className="hidden sm:inline">{displayName}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu */}
            {!isDesktop && (
              <button
                onClick={() => setMobileMenu((m) => !m)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
