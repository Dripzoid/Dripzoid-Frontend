// src/contexts/UserContext.jsx
import React, { createContext, useEffect, useState, useCallback } from "react";

export const UserContext = createContext();

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

const normalizeUser = (user) => {
  if (!user) return null;
  const isAdmin =
    user.is_admin === true ||
    user.is_admin === "true" ||
    Number(user.is_admin) === 1;
  return { ...user, is_admin: Boolean(isAdmin) };
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw && raw !== "null" ? normalizeUser(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      const raw = localStorage.getItem("token");
      return raw && raw !== "null" ? raw : null;
    } catch {
      return null;
    }
  });
  const [sessionId, setSessionId] = useState(() => {
    try {
      const raw = localStorage.getItem("sessionId");
      return raw && raw !== "null" ? raw : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [forceLoggedOut, setForceLoggedOut] = useState(false);

  const isAuthenticated = !!user && !!token;

  const refresh = useCallback(async () => {
    if (forceLoggedOut) return null;
    setLoading(true);

    try {
      const res = await fetch(buildUrl("/api/auth/me"), {
        method: "GET",
        credentials: "include", // HTTP-only cookie
      });

      if (!res.ok) {
        setUser(null);
        setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setLoading(false);
        return null;
      }

      const data = await res.json().catch(() => ({}));
      const normalized = normalizeUser(data?.user ?? null);

      if (normalized) {
        setUser(normalized);
        localStorage.setItem("user", JSON.stringify(normalized));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }

      if (data?.token) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
      }

      setLoading(false);
      return normalized;
    } catch (err) {
      console.error("UserContext.refresh error", err);
      setUser(null);
      setToken(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setLoading(false);
      return null;
    }
  }, [forceLoggedOut]);

  // LOGIN
  const login = async (userData = null, jwtToken = null, newSessionId = null) => {
    if (userData || jwtToken) {
      // Normal login flow
      const normalized = normalizeUser(userData);
      setUser(normalized);
      if (normalized) localStorage.setItem("user", JSON.stringify(normalized));

      if (jwtToken) {
        setToken(jwtToken);
        localStorage.setItem("token", jwtToken);
      }

      if (newSessionId != null) {
        setSessionId(String(newSessionId));
        localStorage.setItem("sessionId", String(newSessionId));
      }
    } else {
      // OAuth / refresh login
      await refresh();
    }

    setForceLoggedOut(false);
  };

  const logout = async (skipServer = false) => {
    setForceLoggedOut(true);

    if (!skipServer) {
      try {
        await fetch(buildUrl("/api/account/signout-session"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId ?? null }),
        }).catch(() => {});
      } catch {}
    }

    setUser(null);
    setToken(null);
    setSessionId(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        sessionId,
        loading,
        isAuthenticated,
        login,
        logout,
        refresh,
        setUser,
        setToken,
        setSessionId,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
