const API_BASE =
  process.env.REACT_APP_API_BASE;

/* =====================================================
   GET TOKEN
===================================================== */

function getToken() {
  return localStorage.getItem(
    "token"
  );
}

/* =====================================================
   MAIN REQUEST FUNCTION
===================================================== */

async function request(
  path,
  opts = {},
  auth = false
) {
  const headers = {
    ...(opts.headers || {}),
  };

  /* =========================
     ATTACH JWT TOKEN
  ========================= */

  if (auth) {
    const token = getToken();

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }
  }

  /* =========================
     CONTENT TYPE
  ========================= */

  if (
    !(
      opts.body instanceof FormData
    ) &&
    opts.body !== undefined
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  /* =========================
     FETCH REQUEST
  ========================= */

  const res = await fetch(
    `${API_BASE}${path}`,
    {
      ...opts,
      headers,

      // Important for cookies/sessions
      credentials: "include",
    }
  );

  /* =========================
     ERROR HANDLING
  ========================= */

  if (!res.ok) {
    let err;

    try {
      err = await res.json();
    } catch {
      err = {
        message:
          res.statusText,
      };
    }

    throw err;
  }

  /* =========================
     BLOB RESPONSE
  ========================= */

  if (opts.isBlob) {
    return await res.blob();
  }

  /* =========================
     JSON RESPONSE
  ========================= */

  try {
    return await res.json();
  } catch {
    return {};
  }
}

/* =====================================================
   API METHODS
===================================================== */

const api = {
  /* =========================
     GET
  ========================= */

  get: (
    path,
    {
      params = {},
      signal,
    } = {},
    auth = false,
    isBlob = false
  ) => {
    const qs =
      new URLSearchParams(
        params
      ).toString();

    return request(
      `${path}${
        qs ? `?${qs}` : ""
      }`,
      {
        method: "GET",
        signal,
        isBlob,
      },
      auth
    );
  },

  /* =========================
     POST
  ========================= */

  post: (
    path,
    body,
    auth = false,
    extraHeaders = {}
  ) =>
    request(
      path,
      {
        method: "POST",

        body: JSON.stringify(
          body
        ),

        headers: extraHeaders,
      },
      auth
    ),

  /* =========================
     PUT
  ========================= */

  put: (
    path,
    body,
    auth = false,
    extraHeaders = {}
  ) =>
    request(
      path,
      {
        method: "PUT",

        body: JSON.stringify(
          body
        ),

        headers: extraHeaders,
      },
      auth
    ),

  /* =========================
     DELETE
  ========================= */

  delete: (
    path,
    auth = false,
    extraHeaders = {}
  ) =>
    request(
      path,
      {
        method: "DELETE",

        headers: extraHeaders,
      },
      auth
    ),

  /* =========================
     FORM POST
  ========================= */

  formPost: (
    path,
    formData,
    auth = false,
    extraHeaders = {}
  ) =>
    request(
      path,
      {
        method: "POST",

        body: formData,

        headers: extraHeaders,
      },
      auth
    ),
};

export default api;
