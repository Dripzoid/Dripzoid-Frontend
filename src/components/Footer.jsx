// src/components/Footer.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
  FaFacebookF,
} from "react-icons/fa";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleGoToSection = (id) => {
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 250);
    }
  };

  return (
    <footer className="bg-black text-white px-6 py-14">
      <div className="max-w-7xl mx-auto">
        {/* DESKTOP / TABLET */}
        {isDesktop ? (
          <div className="grid grid-cols-4 gap-10 items-start">
            {/* LOGO — LARGE */}
            <div className="col-span-1 flex items-start">
              <img
                src="/logo-dark.png"
                alt="Dripzoid"
                className="h-28 w-auto object-contain"
              />
            </div>

            {/* SHOP */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Shop</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link to="/shop" className="hover:text-white">
                    All Products
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => handleGoToSection("featured")}
                    className="hover:text-white text-left"
                  >
                    Featured
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleGoToSection("trending")}
                    className="hover:text-white text-left"
                  >
                    Trending
                  </button>
                </li>
              </ul>
            </div>

            {/* COMPANY */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link to="/about-us" className="hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* FOLLOW US (icons + names aligned) */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="https://www.instagram.com/dripzoidofficial"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaInstagram className="w-5 h-5" />
                    <span>Instagram</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/message/NSIW5WOQRBDFG1"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaWhatsapp className="w-5 h-5" />
                    <span>WhatsApp</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://youtube.com/@dripzoidofficial"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaYoutube className="w-5 h-5" />
                    <span>YouTube</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/share/1Begozxt9S/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaFacebookF className="w-5 h-5" />
                    <span>Facebook</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* MOBILE: only logo + three links (About, Contact, Privacy) */
          <div className="flex flex-col items-center">
            <div className="flex justify-center mb-6">
              <img
                src="/logo-dark.png"
                alt="Dripzoid"
                className="h-28 w-auto object-contain"
              />
            </div>

            <div className="w-full max-w-xs">
              <ul className="flex flex-col divide-y divide-gray-800 rounded-lg overflow-hidden bg-gray-900/40">
                <li>
                  <Link
                    to="/about-us"
                    className="block w-full px-4 py-4 text-center text-sm text-white hover:bg-gray-800"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="block w-full px-4 py-4 text-center text-sm text-white hover:bg-gray-800"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy-policy"
                    className="block w-full px-4 py-4 text-center text-sm text-white hover:bg-gray-800"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM COPYRIGHT */}
      <div className="mt-12 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} DRIPZOID. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
