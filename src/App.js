import React from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProductDetailsPage from "./components/ProductDetailsPage.jsx"; // 
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Footer from "./components/Footer.jsx";
import Shop from "./pages/Shop.jsx";
import MenPage from "./pages/Men.jsx";
import WomenPage from "./pages/Women.jsx";
import KidsPage from "./pages/Kids.jsx";
import Auth from "./pages/Auth.jsx";
import { UserProvider, UserContext } from "./contexts/UserContext.js";
import ProfileOverview from "./pages/account/ProfileOverview.jsx";
import OrdersHistory from "./pages/account/OrdersHistory.jsx";
import Wishlist from "./pages/account/Wishlist.jsx";
import AddressBook from "./pages/account/AddressBook.jsx";
import PaymentMethods from "./pages/account/PaymentMethods.jsx";
import AccountSettings from "./pages/account/AccountSettings.jsx";
import DashboardLayout from "./pages/account/DashboardLayout.jsx";
import AdminLayout from "./admin/AdminLayout.jsx";
import ProductsAdmin from "./admin/ProductsAdmin.jsx";
import BulkUpload from "./admin/BulkUpload.jsx";
import Dashboard from "./admin/Dashboard.jsx";
import AdminOrdersDashboard from "./admin/OrderManagement.jsx";
import UserManagement from "./admin/UserManagement.jsx"; 
import LabelsManager from './admin/LabelsDownload.jsx';

// 🛒 Cart imports
import { CartProvider } from "./contexts/CartContext.jsx";
import CartSidebar from "./components/CartSidebar.jsx";
import CartPage from "./pages/Cart.jsx"; // full cart page
import CheckoutPage from "./pages/CheckoutPage.jsx"; // 🆕 Checkout page import
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import ImageUpload from "./pages/ImageUpload.jsx";


function App() {
  return (
    <UserProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/men" element={<MenPage />} />
              <Route path="/women" element={<WomenPage />} />
              <Route path="/kids" element={<KidsPage />} />
              <Route path="/cart" element={<CartPage />} /> {/* Full cart page */}
              <Route path="/product/:id" element={<ProductDetailsPage />} />
              <Route path="/checkout" element={<CheckoutPage />} /> {/* 🆕 Checkout route */}
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/account" element={<DashboardLayout />}>
                <Route index element={<ProfileOverview />} />
                <Route path="profile" element={<ProfileOverview />} />
                <Route path="orders" element={<OrdersHistory />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="addresses" element={<AddressBook />} />
                <Route path="payment-methods" element={<PaymentMethods />} />
                <Route path="settings" element={<AccountSettings />} />
              </Route>
              <Route
                path="/login"
                element={<AuthWrapper defaultForm="login" />}
              />
              <Route
                path="/register"
                element={<AuthWrapper defaultForm="register" />}
              />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="products" element={<ProductsAdmin />} />
                <Route path="bulk-upload" element={<BulkUpload />} />
                <Route path="upload" element={<ImageUpload />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="orders" element={<AdminOrdersDashboard />} />
                <Route path="labels" element={<LabelsManager />} />
                <Route path="coupons" element={<div className="p-6">Coupons Management Coming Soon...</div>} />
                <Route path="ads" element={<div className="p-6">Ads Management Coming Soon...</div>} />
              </Route>
            </Routes>
            <Footer />

            {/* 🛒 Quick Cart Sidebar always available */}
            <CartSidebar />
          </div>
        </Router>
      </CartProvider>
    </UserProvider>
  );
}

function AuthWrapper({ defaultForm }) {
  const { login } = React.useContext(UserContext);

  return (
    <Auth
      defaultForm={defaultForm}
      onLoginSuccess={(userData, token) => {
        console.log("✅ AuthWrapper saving user:", userData);
        login(userData, token); // This is now the only place that calls login
      }}
    />
  );
}

export default App;
