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

  const handleGoToSection = (id) => {
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  };

  const sections = [
    {
      title: "Shop",
      items: [
        <Link key="all" to="/shop">All Products</Link>,
        <button key="featured" onClick={() => handleGoToSection("featured")}>Featured</button>,
        <button key="trending" onClick={() => handleGoToSection("trending")}>Trending</button>,
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
        <a key="email" href="mailto:support@dripzoid.com">support@dripzoid.com</a>,
        <span key="loc">Pithapuram, Andhra Pradesh</span>,
      ],
    },
    {
      title: "Follow Us",
      items: [
        <a key="ig" href="https://www.instagram.com/dripzoidofficial" target="_blank" rel="noreferrer"><FaInstagram /> Instagram</a>,
        <a key="wa" href="https://wa.me/message/NSIW5WOQRBDFG1" target="_blank" rel="noreferrer"><FaWhatsapp /> WhatsApp</a>,
        <a key="yt" href="https://youtube.com/@dripzoidofficial" target="_blank" rel="noreferrer"><FaYoutube /> YouTube</a>,
        <a key="fb" href="https://www.facebook.com/share/1Begozxt9S/" target="_blank" rel="noreferrer"><FaFacebookF /> Facebook</a>,
      ],
    },
  ];

  return (
    <footer className="bg-black text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {isDesktop ? (
          <div className="grid grid-cols-5 gap-10">
            <div>
              <img src={logoDark} alt="Dripzoid Logo" className="h-10 mb-4" />
              <p className="text-gray-400 text-sm">Wear the Confidence</p>
            </div>

            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <img src={logoDark} alt="Dripzoid Logo" className="h-10 mb-2" />
            <p className="text-gray-400 text-sm mb-6">Wear the Confidence</p>

            {sections.map((section) => (
              <div key={section.title} className="border-t border-gray-800">
                <button
                  onClick={() => handleToggle(section.title)}
                  className="w-full flex justify-between items-center py-4 text-lg font-semibold"
                >
                  {section.title}
                  {openSection === section.title ? <FaChevronUp /> : <FaChevronDown />}
                </button>

                {openSection === section.title && (
                  <ul className="pb-4 pl-2 space-y-3 text-sm text-gray-400">
                    {section.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} DRIPZOID. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
