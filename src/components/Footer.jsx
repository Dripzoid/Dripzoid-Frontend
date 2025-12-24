import React, { useState, useEffect } from "react";
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

  const [openSection, setOpenSection] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // -----------------------------
  // Handle responsive mode
  // -----------------------------
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggle = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  // -----------------------------
  // Smooth scroll helper
  // -----------------------------
  const handleGoToSection = (sectionId) => {
    if (location.pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      return;
    }

    navigate("/");
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  // -----------------------------
  // Footer data (OLD STRUCTURE + NEW ITEMS)
  // -----------------------------
  const sections = [
    {
      title: "Shop",
      items: [
        <Link key="all" to="/shop">All Products</Link>,
        <button key="featured" onClick={() => handleGoToSection("featured")}>
          Featured Products
        </button>,
        <button key="trending" onClick={() => handleGoToSection("trending")}>
          Trending
        </button>,
      ],
    },
    {
      title: "Company",
      items: [
        <Link key="about" to="/about-us">About Us</Link>,
        <Link key="contact" to="/contact">Contact</Link>,
        <Link key="privacy" to="/privacy-policy">Privacy Policy</Link>,
      ],
    },
    {
      title: "Contact",
      items: [
        <a key="email" href="mailto:support@dripzoid.com">
          support@dripzoid.com
        </a>,
        <span key="location">Pithapuram, Andhra Pradesh</span>,
      ],
    },
    {
      title: "Follow Us",
      items: [
        <a key="ig" href="https://www.instagram.com/dripzoidofficial" target="_blank" rel="noreferrer">
          <FaInstagram /> Instagram
        </a>,
        <a key="wa" href="https://wa.me/message/NSIW5WOQRBDFG1" target="_blank" rel="noreferrer">
          <FaWhatsapp /> WhatsApp
        </a>,
        <a key="yt" href="https://youtube.com/@dripzoidofficial" target="_blank" rel="noreferrer">
          <FaYoutube /> YouTube
        </a>,
        <a key="fb" href="https://www.facebook.com/share/1Begozxt9S/" target="_blank" rel="noreferrer">
          <FaFacebookF /> Facebook
        </a>,
      ],
    },
  ];

  return (
    <footer className="bg-black text-white px-6 py-12 text-base">
      <div className="max-w-7xl mx-auto">

        {/* =============================
            DESKTOP FOOTER (OLD STYLE)
        ============================== */}
        {isDesktop ? (
          <div className="grid grid-cols-5 gap-10">
            {/* Brand */}
            <div>
              <Link to="/">
                <img src="/logo-dark.png" alt="Dripzoid Logo" className="h-10 mb-4" />
              </Link>
              <p className="text-gray-400 text-sm">
                Wear the Confidence
              </p>
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <div key={section.title}>
                {/* 🔒 Explicit header size (OLD behavior) */}
                <h3 className="text-lg font-semibold mb-4">
                  {section.title}
                </h3>

                {/* 🔒 Items intentionally smaller */}
                <ul className="space-y-3 text-sm text-gray-400">
                  {section.items.map((item) => (
                    <li key={item.key}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          /* =============================
              MOBILE FOOTER (ACCORDION)
          ============================== */
          <div>
            {/* Brand */}
            <div className="mb-6">
              <Link to="/">
                <img src="/logo-dark.png" alt="Dripzoid Logo" className="h-10 mb-2" />
              </Link>
              <p className="text-gray-400 text-sm">
                Wear the Confidence
              </p>
            </div>

            {sections.map((section) => (
              <div key={section.title} className="border-t border-gray-800">
                {/* 🔒 Header locked to text-lg */}
                <button
                  onClick={() => handleToggle(section.title)}
                  className="w-full flex justify-between items-center py-4 text-lg font-semibold"
                >
                  {section.title}
                  {openSection === section.title ? <FaChevronUp /> : <FaChevronDown />}
                </button>

                {openSection === section.title && (
                  <ul className="pb-4 pl-2 space-y-3 text-sm text-gray-400">
                    {section.items.map((item) => (
                      <li key={item.key}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =============================
          BOTTOM BAR (OLD FORMAT)
      ============================== */}
      <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} DRIPZOID. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
