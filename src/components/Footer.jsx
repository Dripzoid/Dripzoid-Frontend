import { Link } from "react-router-dom";
import {
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaFacebookF,
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-black text-white py-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo & Description */}
        <div>
          <Link to="/">
            <img src="/logo-dark.png" alt="DRIPZOID Logo" className="h-10 mb-4" />
          </Link>
          <p className="text-sm text-gray-400">
            Born to Drip. Built to Stand Out. Explore Gen-Z fashion, redefined.
          </p>
        </div>

        {/* Shop */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Shop</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="/shop" className="hover:text-white">All Products</a></li>
            <li><a href="/new" className="hover:text-white">Featured Products</a></li>
            <li><a href="/trending" className="hover:text-white">Trending</a></li>
            <li><a href="/sale" className="hover:text-white">On Sale</a></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Company</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="/about" className="hover:text-white">About Us</a></li>
            <li><a href="/contact" className="hover:text-white">Contact</a></li>
            <li><a href="/careers" className="hover:text-white">Careers</a></li>
            <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Follow Us</h2>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-center gap-2 hover:text-white">
              <FaInstagram /> <a href="dripzoid.co">Instagram</a>
            </li>
            <li className="flex items-center gap-2 hover:text-white">
              <FaTwitter /> <a href="#">Twitter</a>
            </li>
            <li className="flex items-center gap-2 hover:text-white">
              <FaYoutube /> <a href="#">YouTube</a>
            </li>
            <li className="flex items-center gap-2 hover:text-white">
              <FaFacebookF /> <a href="#">Facebook</a>
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
