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

// ✅ cache-safe logo import
import logoDark from "/logo-dark.png";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openSection, setOpenSection] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggle = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

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

  // sections array unchanged …

  return (
    <footer className="bg-black text-white px-6 py-12 text-base">
      <div className="max-w-7xl mx-auto">

        {isDesktop ? (
          <div className="grid grid-cols-5 gap-10">
            {/* Brand */}
            <div>
              <Link to="/">
                <img src={logoDark} alt="Dripzoid Logo" className="h-10 mb-4" />
              </Link>
              <p className="text-gray-400 text-sm">
                Wear the Confidence
              </p>
            </div>

            {/* sections unchanged */}
