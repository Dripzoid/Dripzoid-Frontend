import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
  FaFacebookF,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openSection, setOpenSection] = useState(null); // track which accordion section is open on mobile

  const handleToggle = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  // Navigate to home and scroll to section
  const handleGoToSection = (sectionId) => {
    if (location.pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate("/", { replace: false });
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  return (
    <footer className="bg-black text-white py-10 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Grid for md+ */}
        <div className="hidden md:grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="flex flex-col items-start">
            <Link to="/" aria-label="Dripzoid home">
              <img src="/logo-dark.png" alt="DRIPZOID Logo" className="h-10 mb-4" />
            </Link>
            <p className="text-sm text-gray-400">Wear the Confidence</p>
          </div>

          {/* Shop */}
          <div className="flex flex-col">
            <h2 className="font-semibold text-lg mb-4">Shop</h2>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/shop" className="hover:text-white">All Products</Link>
              </li>
              <li>
                <button
                  onClick={() => handleGoToSection("featured")}
                  className="hover:text-white text-left w-full"
                  aria-label="Go to Featured Products on home"
                >
                  Featured Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleGoToSection("trending")}
                  className="hover:text-white text-left w-full"
                  aria-label="Go to Trending on home"
                >
                  Trending
                </button>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="flex flex-col">
            <h2 className="font-semibold text-lg mb-4">Company</h2>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/about-us" className="hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="flex flex-col">
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

        {/* Mobile Accordion */}
        <div className="md:hidden space-y-4">
          {/* Logo */}
          <div className="flex flex-col items-start">
            <Link to="/" aria-label="Dripzoid home">
              <img src="/logo-dark.png" alt="DRIPZOID Logo" className="h-10 mb-2" />
            </Link>
            <p className="text-sm text-gray-400 mb-4">Wear the Confidence</p>
          </div>

          {/* Accordion Sections */}
          {[
            {
              title: "Shop",
              items: [
                <Link key="all" to="/shop" className="hover:text-white">All Products</Link>,
                <button key="featured" onClick={() => handleGoToSection("featured")} className="hover:text-white text-left w-full">Featured Products</button>,
                <button key="trending" onClick={() => handleGoToSection("trending")} className="hover:text-white text-left w-full">Trending</button>,
              ],
            },
            {
              title: "Company",
              items: [
                <Link key="about" to="/about-us" className="hover:text-white">About Us</Link>,
                <Link key="contact" to="/contact" className="hover:text-white">Contact</Link>,
                <Link key="privacy" to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>,
              ],
            },
            {
              title: "Follow Us",
              items: [
                <a key="insta" href="https://www.instagram.com/dripzoidofficial?igsh=MWZzbzltczdnNzh2aw==" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-3"><FaInstagram /> Instagram</a>,
                <a key="wa" href="https://wa.me/message/NSIW5WOQRBDFG1" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-3"><FaWhatsapp /> WhatsApp</a>,
                <a key="yt" href="https://youtube.com/@dripzoidofficial?si=z_oN9DBw7X-YzPGp" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-3"><FaYoutube /> YouTube</a>,
                <a key="fb" href="https://www.facebook.com/share/1Begozxt9S/" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-3"><FaFacebookF /> Facebook</a>,
              ],
            },
          ].map((section) => (
            <div key={section.title} className="border-t border-gray-800">
              <button
                onClick={() => handleToggle(section.title)}
                className="w-full flex justify-between items-center py-3 text-left font-semibold text-white"
              >
                {section.title}
                {openSection === section.title ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              {openSection === section.title && (
                <ul className="pl-2 pb-2 space-y-2 text-gray-400 text-sm">
                  {section.items.map((item) => (
                    <li key={item.key || Math.random()}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
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
