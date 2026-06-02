export const API_BASE = "http://localhost:5180/api";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("padel_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const msg =
      (typeof data === "object" && (data?.message || data?.title || JSON.stringify(data))) ||
      data ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}
