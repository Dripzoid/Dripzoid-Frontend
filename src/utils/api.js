const API_BASE = process.env.REACT_APP_API_BASE;

// Get token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

async function request(path, opts = {}, auth = false) {
  const headers = { ...(opts.headers || {}) };

  // Attach token if auth = true
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Only set Content-Type if body is not FormData
  if (!(opts.body instanceof FormData) && opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      err = { message: res.statusText };
    }
    throw err;
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default {
  get: (path, { params = {}, signal } = {}, auth = false) => {
    const qs = new URLSearchParams(params).toString();
    return request(
      `${path}${qs ? `?${qs}` : ""}`,
      { method: "GET", signal },
      auth
    );
  },
  post: (path, body, auth = false) =>
    request(path, { method: "POST", body: JSON.stringify(body) }, auth),
  put: (path, body, auth = false) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }, auth),
  delete: (path, auth = false) =>
    request(path, { method: "DELETE" }, auth),
  formPost: (path, formData, auth = false) =>
    request(path, { method: "POST", body: formData }, auth),
};
