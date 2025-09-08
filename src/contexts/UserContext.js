// src/contexts/UserContext.jsx
import React, { createContext, useEffect, useState, useCallback } from "react";

export const UserContext = createContext();

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

function buildUrl(path) {
  const base = API_BASE.replace(/\/+$/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  return base ? `${base}${path}` : `${path}`;
}

const normalizeUser = (user) => {
  if (!user) return null;
  const isAdmin =
    user.is_admin === true ||
    user.is_admin === "true" ||
    Number(user.is_admin) === 1;
  return { ...user, is_admin: Boolean(isAdmin) };
};

function stripOAuthParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "1") {
      params.delete("oauth");
      const clean =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "") +
        window.location.hash;
      window.history.replaceState({}, document.title, clean);
      return true;
    }
  } catch (err) {
    console.warn("stripOAuthParam failed", err);
  }
  return false;
}

export function UserProvider({ children }) {
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

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw && raw !== "null" ? normalizeUser(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState(null);
  const [forceLoggedOut, setForceLoggedOut] = useState(false);

  const isAuthenticated = !!user && !!token;

  const refresh = useCallback(
    async () => {
      if (forceLoggedOut) {
        console.debug("UserContext.refresh skipped (forceLoggedOut)");
        return null;
      }
      if (!token) {
        setLoading(false);
        return null;
      }

      setLoading(true);
      setLastError(null);

      try {
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(buildUrl("/api/auth/me"), {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setUser(null);
            setToken(null);
            setSessionId(null);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("sessionId");
          }
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

        if (data?.sessionId != null) {
          const s = String(data.sessionId);
          setSessionId(s);
          localStorage.setItem("sessionId", s);
        }

        setLoading(false);
        return normalized;
      } catch (err) {
        console.error("UserContext.refresh error", err);
        setLastError(err.message || String(err));
        setUser(null);
        setToken(null);
        setSessionId(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("sessionId");
        setLoading(false);
        return null;
      }
    },
    [token, forceLoggedOut]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (stripOAuthParam() && !forceLoggedOut) {
      refresh().catch(() => {});
    }
  }, []); // once on mount

  const login = async (userData, jwtToken = null, newSessionId = null) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    if (normalized) {
      localStorage.setItem("user", JSON.stringify(normalized));
    }

    if (jwtToken) {
      setToken(jwtToken);
      localStorage.setItem("token", jwtToken);
    } else {
      setTimeout(() => {
        if (!forceLoggedOut) refresh().catch(() => {});
      }, 50);
    }

    if (newSessionId != null) {
      const s = String(newSessionId);
      setSessionId(s);
      localStorage.setItem("sessionId", s);
    }

    setForceLoggedOut(false);
    console.log("UserContext.login saved", { user: normalized });
  };

  const logout = async (skipServer = false) => {
    setForceLoggedOut(true);

    const prevToken = token;
    const prevSessionId = sessionId;

    if (!skipServer && API_BASE) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (prevToken) headers["Authorization"] = `Bearer ${prevToken}`;

        await fetch(buildUrl("/api/account/signout-session"), {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ sessionId: prevSessionId ?? null }),
        }).catch(() => {});
      } catch (err) {
        console.warn("UserContext.logout: server signout failed", err);
      }
    }

    setUser(null);
    setToken(null);
    setSessionId(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");

    console.log("✅ UserContext: logout completed");
  };

  const updateUser = async (updatedData) => {
    if (!user) throw new Error("User not authenticated");

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(buildUrl(`/api/users/${user.id}`), {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify(updatedData),
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        throw new Error("Failed to update user");
      }
      throw new Error(errorData.message || "Failed to update user");
    }

    const updatedUserRaw = await res.json();
    const updatedUser = normalizeUser(updatedUserRaw);

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));

    return updatedUser;
  };

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        sessionId,
        loading,
        lastError,
        isAuthenticated,
        login,
        logout,
        refresh,
        updateUser,
        setUser,
        setToken,
        setSessionId,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
