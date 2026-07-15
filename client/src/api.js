/**
 * api.js — the only place the frontend talks to the backend.
 * The browser never touches Google Sheets or any credential.
 *
 * URL resolution:
 *   - VITE_API_URL set  → use it (for a separate-host backend deploy).
 *   - production build   → '' (relative, same origin: the Express server
 *                          serves this built app, so /api/... works directly).
 *   - dev                → http://localhost:5000 (Vite on 5174, API on 5000).
 */
const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5000');

/** Submit a registration. Returns the parsed JSON response. */
export async function submitRegistration(formData) {
  const res = await fetch(`${API_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Fetch aggregate stats (counts only, no personal data) for the dashboard. */
export async function fetchStats() {
  const res = await fetch(`${API_URL}/api/stats`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Fetch the registered-employee list for /employee_list. */
export async function fetchEmployees() {
  const res = await fetch(`${API_URL}/api/employees`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Toggle the "asked about fields" flag for one employee row. */
export async function setEmployeeAsked(row, asked) {
  const res = await fetch(`${API_URL}/api/employees/${row}/asked`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asked }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
