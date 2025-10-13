// src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.js";

// Context Providers
import { UserProvider } from "./contexts/UserContext.js";
import { CartProvider } from "./contexts/CartContext.jsx";
import { WishlistProvider } from "./contexts/WishlistContext.jsx";

// SEO & Metadata
import { HelmetProvider } from  "@react-helmet-async/react-helmet-async";

// PWA & Performance
import * as serviceWorkerRegistration from "./serviceWorkerRegistration.js";
import reportWebVitals from "./reportWebVitals.js";

// Root render
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <UserProvider>
        <CartProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </CartProvider>
      </UserProvider>
    </HelmetProvider>
  </React.StrictMode>
);

// PWA setup
serviceWorkerRegistration.unregister();

// Performance metrics
reportWebVitals();
