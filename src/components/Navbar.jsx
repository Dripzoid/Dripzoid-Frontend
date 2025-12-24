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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
            <Link to="/" className="flex items-center h-full">
              <img
                src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
                alt="Dripzoid"
                className="h-[86px] w-auto object-contain"
              />
            </Link>

            {/* CENTER — DESKTOP NAV */}
            {isDesktop && (
              <div className="flex items-center space-x-10">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            )}

            {/* RIGHT — ACTIONS */}
            <div className="flex items-center gap-3">

              {/* DESKTOP ACTIONS */}
              {isDesktop && (
                <>
                  <GlobalSearchBar />
                  <Link to="/wishlist"><Heart size={20} /></Link>
                  <Link to="/cart"><ShoppingCart size={20} /></Link>
                  <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
                    {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                  </button>
                  <Link
                    to="/login"
                    className="px-4 py-1.5 rounded-full ring-2 ring-black dark:ring-white"
                  >
                    Login
                  </Link>
                </>
              )}

              {/* MOBILE LOGIN (OUTSIDE DROPDOWN) */}
              {!isDesktop && (
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
                >
                  Login
                </Link>
              )}

              {/* MOBILE MENU TOGGLE */}
              {!isDesktop && (
                <button
                  onClick={() => setMobileMenu(!mobileMenu)}
                  className="p-2"
                >
                  {mobileMenu ? <X size={26} /> : <Menu size={26} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE DROPDOWN ================= */}
      {!isDesktop && mobileMenu && (
        <div className="fixed top-[96px] left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t shadow-lg">
          <div className="flex flex-col p-4 space-y-4 text-gray-800 dark:text-gray-200">

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

            <Link to="/wishlist" className="flex items-center gap-2">
              <Heart size={18} /> Wishlist ({wishlist.length})
            </Link>

            <Link to="/cart" className="flex items-center gap-2">
              <ShoppingCart size={18} /> Cart ({cart.length})
            </Link>

            <button
              onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
              className="flex items-center gap-2"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              Toggle Theme
            </button>

          </div>
        </div>
      )}
    </>
  );
}
