import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export const UserContext =
  createContext();

const API_BASE = (
  process.env
    .REACT_APP_API_BASE || ""
).replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${API_BASE}${path}`;
}

/* ======================================================
   NORMALIZE USER
====================================================== */

const normalizeUser = (
  user
) => {
  if (!user) return null;

  const isAdmin =
    user.is_admin === true ||
    user.isAdmin === true ||
    Number(
      user.is_admin
    ) === 1;

  let displayName =
    user.name ||
    user.displayName ||
    user.display_name;

  if (
    !displayName &&
    user.email
  ) {
    displayName =
      String(
        user.email
      ).split("@")[0];
  }

  return {
    ...user,

    isAdmin:
      Boolean(isAdmin),

    name:
      displayName ||
      "User",
  };
};

/* ======================================================
   PROVIDER
====================================================== */

export function UserProvider({
  children,
}) {
  /* ======================================================
     USER STATE
  ====================================================== */

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    forceLoggedOut,
    setForceLoggedOut,
  ] = useState(false);

  /* ======================================================
     AUTH STATE
  ====================================================== */

  const isAuthenticated =
    !!user;

  /* ======================================================
     REFRESH USER
  ====================================================== */

  const refresh =
    useCallback(async () => {
      if (forceLoggedOut) {
        setLoading(false);

        return null;
      }

      try {
        const res =
          await fetch(
            buildUrl(
              "/api/auth/me"
            ),
            {
              method: "GET",

              credentials:
                "include",

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        /* =========================
           NOT AUTHENTICATED
        ========================= */

        if (!res.ok) {
          setUser(null);

          return null;
        }

        /* =========================
           RESPONSE
        ========================= */

        const data =
          await res.json();

        const normalized =
          normalizeUser(
            data?.user
          );

        /* =========================
           INSTANT STATE UPDATE
        ========================= */

        setUser(normalized);

        return {
          user: normalized,
        };
      } catch (err) {
        console.error(
          "Refresh Error:",
          err
        );

        setUser(null);

        return null;
      } finally {
        setLoading(false);
      }
    }, [forceLoggedOut]);

  /* ======================================================
     LOGIN
  ====================================================== */

  const login =
    async (userData = null) => {
      setForceLoggedOut(false);

      /* =========================
         INSTANT LOGIN UPDATE
      ========================= */

      if (userData) {
        const normalized =
          normalizeUser(
            userData
          );

        setUser(normalized);

        setLoading(false);

        return {
          user: normalized,
        };
      }

      /* =========================
         FALLBACK REFRESH
      ========================= */

      return refresh();
    };

  /* ======================================================
     LOGOUT
  ====================================================== */

  const logout =
    async () => {
      try {
        await fetch(
          buildUrl(
            "/api/auth/logout"
          ),
          {
            method: "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      } catch (err) {
        console.error(
          "Logout Error:",
          err
        );
      }

      setForceLoggedOut(true);

      setUser(null);
    };

  /* ======================================================
     INITIAL AUTH CHECK
  ====================================================== */

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ======================================================
     PROVIDER
  ====================================================== */

  return (
    <UserContext.Provider
      value={{
        user,

        setUser,

        loading,

        isAuthenticated,

        login,

        logout,

        refresh,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
