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
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const displayName =
    user?.name || user?.fullName || user?.username || user?.email?.split?.("@")?.[0] || "";

  const navLinks = [
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" onClick={() => setMobileMenu(false)}>
              <img
                src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
                alt="Logo"
                className="h-8"
              />
            </Link>
          </div>

          {/* Desktop Nav Links */}
          {isDesktop ? (
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
          ) : null}

          {/* Right side: Search + Icons */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* ✅ Search moved here */}
            {isDesktop && (
              <div className="w-52">
                <GlobalSearchBar />
              </div>
            )}

            {/* Wishlist */}
            <Link
              to="/account/wishlist"
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-200"
              aria-label="View wishlist"
              onClick={() => setMobileMenu(false)}
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] md:text-xs w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-200"
              aria-label="View cart"
              onClick={() => setMobileMenu(false)}
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] md:text-xs w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-200"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* User / Login */}
            {user ? (
              <Link
                to="/account"
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-200 transition"
                onClick={() => setMobileMenu(false)}
              >
                <User size={18} />
                <span className="hidden sm:inline font-medium">{displayName}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-full text-black bg-white hover:text-white hover:bg-black ring-2 ring-black dark:text-white dark:bg-black dark:hover:text-black dark:hover:bg-white dark:ring-white transition"
                onClick={() => setMobileMenu(false)}
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            {!isDesktop && (
              <button
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-200"
                onClick={() => setMobileMenu((m) => !m)}
                aria-label="Toggle menu"
              >
                {mobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {!isDesktop && mobileMenu && (
        <div className="px-4 pb-4 space-y-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="block text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white font-medium py-2"
                onClick={() => setMobileMenu(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Mobile Search */}
          <div className="w-full mt-2">
            <GlobalSearchBar />
          </div>
        </div>
      )}
    </nav>
  );
}
