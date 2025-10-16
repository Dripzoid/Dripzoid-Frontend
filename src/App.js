import React, { useContext } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { UserProvider, UserContext } from "./contexts/UserContext.js";
import { CartProvider } from "./contexts/CartContext.jsx";

// 🧱 Layouts & Shared Components
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import CartSidebar from "./components/CartSidebar.jsx";

// 🏠 Public Pages
import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import MenPage from "./pages/Men.jsx";
import WomenPage from "./pages/Women.jsx";
import KidsPage from "./pages/Kids.jsx";
import ProductDetailsPage from "./components/ProductDetailsPage.jsx";
import CartPage from "./pages/Cart.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import OrderDetailsPage from "./pages/OrderDetailsPage.jsx";
import Auth from "./pages/Auth.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import Contact from "./pages/Contact.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";

// 👤 Account Pages
import DashboardLayout from "./pages/account/DashboardLayout.jsx";
import ProfileOverview from "./pages/account/ProfileOverview.jsx";
import OrdersHistory from "./pages/account/OrdersHistory.jsx";
import Wishlist from "./pages/account/Wishlist.jsx";
import AddressBook from "./pages/account/AddressBook.jsx";
import PaymentMethods from "./pages/account/PaymentMethods.jsx";
import AccountSettings from "./pages/account/AccountSettings.jsx";

// 🛠️ Admin Pages
import AdminLayout from "./admin/AdminLayout.jsx";
import Dashboard from "./admin/Dashboard.jsx";
import ProductsAdmin from "./admin/ProductsAdmin.jsx";
import BulkUpload from "./admin/BulkUpload.jsx";
import ImageUpload from "./pages/ImageUpload.jsx";
import AdminOrdersDashboard from "./admin/OrderManagement.jsx";
import UserManagement from "./admin/UserManagement.jsx";
import CouponManagement from "./admin/CouponManagement.jsx";
import LabelsManager from "./admin/LabelsDownload.jsx";
import SlidesAndSalesManagement from "./admin/SlidesAndSalesAdmin.jsx";

function App() {
  return (
    <UserProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
            {/* ✅ Navbar Always Visible */}
            <Navbar />

            {/* ✅ Routes */}
            <main className="flex-grow">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/men" element={<MenPage />} />
                <Route path="/women" element={<WomenPage />} />
                <Route path="/kids" element={<KidsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/product/:id" element={<ProductDetailsPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/order-details/:id" element={<OrderDetailsPage />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />

                {/* Auth */}
                <Route path="/login" element={<AuthWrapper defaultForm="login" />} />
                <Route path="/register" element={<AuthWrapper defaultForm="register" />} />

                {/* Dashboard (Account) Routes */}
                <Route path="/account" element={<DashboardLayout />}>
                  <Route index element={<ProfileOverview />} />
                  <Route path="profile" element={<ProfileOverview />} />
                  <Route path="orders" element={<OrdersHistory />} />
                  <Route path="wishlist" element={<Wishlist />} />
                  <Route path="addresses" element={<AddressBook />} />
                  <Route path="payment-methods" element={<PaymentMethods />} />
                  <Route path="settings" element={<AccountSettings />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="products" element={<ProductsAdmin />} />
                  <Route path="bulk-upload" element={<BulkUpload />} />
                  <Route path="upload" element={<ImageUpload />} />
                  <Route path="users" element={<UserManagement />} />          
                  <Route path="orders" element={<AdminOrdersDashboard />} />
                  <Route path="labels" element={<LabelsManager />} />
                  <Route path="coupons" element={<CouponManagement />} />
                  <Route path="salesandslides" element={<SlidesAndSalesManagement />} />
                  <Route
                    path="ads"
                    element={<div className="p-6">Ads Management Coming Soon...</div>}
                  />
                </Route>
              </Routes>
            </main>

            {/* ✅ Footer Always Visible */}
            <Footer />

            {/* ✅ Cart Sidebar Always Available */}
            <CartSidebar />
          </div>
        </Router>
      </CartProvider>
    </UserProvider>
  );
}

function AuthWrapper({ defaultForm }) {
  const { login } = useContext(UserContext);

  return (
    <Auth
      defaultForm={defaultForm}
      onLoginSuccess={(userData, token) => {
        console.log("✅ AuthWrapper saving user:", userData);
        login(userData, token);
      }}
    />
  );
}

export default App;
