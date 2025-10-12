import React from "react";
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

  // Navigate to home and scroll to section (expects elements with matching IDs on home)
  const handleGoToSection = (sectionId) => {
    if (location.pathname === "/") {
      // already on home — scroll directly
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    // navigate to home first, then scroll after navigation settles
    navigate("/", { replace: false });
    // small delay to let home render; adjust timeout if needed
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  return (
    <footer className="bg-black text-white py-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo & Description */}
        <div>
          <Link to="/" aria-label="Dripzoid home">
            <img src="/logo-dark.png" alt="DRIPZOID Logo" className="h-10 mb-4" />
          </Link>
          <p className="text-sm text-gray-400">Wear the Confidence</p>
        </div>

        {/* Shop */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Shop</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link to="/shop" className="hover:text-white">All Products</Link>
            </li>
            <li>
              <button
                onClick={() => handleGoToSection("featured")}
                className="hover:text-white text-left"
                aria-label="Go to Featured Products on home"
              >
                Featured Products
              </button>
            </li>
            <li>
              <button
                onClick={() => handleGoToSection("trending")}
                className="hover:text-white text-left"
                aria-label="Go to Trending on home"
              >
                Trending
              </button>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Company</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link to="/about-us" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Follow Us</h2>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-center gap-3">
              <FaInstagram />
              <a
                href="https://www.instagram.com/dripzoidofficial?igsh=MWZzbzltczdnNzh2aw=="
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Instagram
              </a>
            </li>

            <li className="flex items-center gap-3">
              <FaWhatsapp />
              <a
                href="https://wa.me/message/NSIW5WOQRBDFG1"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                WhatsApp
              </a>
            </li>

            <li className="flex items-center gap-3">
              <FaYoutube />
              <a
                href="https://youtube.com/@dripzoidofficial?si=z_oN9DBw7X-YzPGp"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                YouTube
              </a>
            </li>

            <li className="flex items-center gap-3">
              <FaFacebookF />
              <a
                href="https://www.facebook.com/share/1Begozxt9S/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} DRIPZOID. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
