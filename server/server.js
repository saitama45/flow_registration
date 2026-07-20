/**
 * server.js
 * ------------------------------------------------------------------
 * Secure employee registration API.
 *
 * Security layers:
 *   - helmet            : hardened HTTP response headers
 *   - cors              : only the configured React origin may call us
 *   - express-rate-limit: global + stricter per-endpoint throttling
 *   - body size cap     : 10 KB JSON limit (registration is tiny)
 *   - validation.js     : sanitization, regex validation, honeypot,
 *                         and PII discard (optional fields never stored)
 *
 * /api/stats returns aggregate counts only (no row-level / personal data),
 * so it is intentionally open to the dashboard without a login step.
 */
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { validateRegistration } = require('./middleware/validation');
const {
  ensureHeaderRow,
  appendRegistrationRow,
  getStats,
  listEmployees,
  setAskedFlag,
  formatTimestamp,
} = require('./services/googleSheets');

const app = express();
const PORT = process.env.PORT || 5000;

// Render (and most hosts) put the app behind a reverse proxy. Without this,
// req.ip is the PROXY's address for every visitor, so all of them share a
// single rate-limit bucket and real attendees start getting blocked. Trust
// exactly one hop — `true` would let clients spoof X-Forwarded-For.
app.set('trust proxy', 1);

// ---- Global hardening ------------------------------------------------
// CSP tuned for the built React SPA this server also serves: same-origin
// scripts/styles/images only (plus inline styles, which Vite may emit, and
// data: images). Everything stays first-party — no third-party origins.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  })
);
app.disable('x-powered-by');

// CORS: strictly allow only the React frontend origin (no wildcard).
// A callback (instead of a static string) means foreign origins get NO
// Access-Control-Allow-Origin header at all, not even the allowed value.
const ALLOWED_ORIGIN = process.env.REACT_APP_URL || 'http://localhost:5174';
app.use(
  cors({
    origin(origin, callback) {
      // "!origin" covers non-browser tools and same-origin requests.
      if (!origin || origin === ALLOWED_ORIGIN) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type'],
  })
);

// Tiny JSON payloads only — a registration is well under 10 KB.
app.use(express.json({ limit: '10kb' }));

// Generous global backstop against outright abuse. It must sit well above
// what the realtime dashboard/employee-list polling produces: at a 4s poll
// two open tabs make ~450 requests / 15 min, so 3000 leaves ample headroom
// while still capping a hammering client. (The 2s server-side cache means
// these read polls rarely touch Google Sheets anyway.)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Try again later.' },
  })
);

// Registration limit. This must be generous: at a live event everyone on the
// venue WiFi shares ONE public IP (NAT), so a low per-IP cap blocks genuine
// attendees the moment a queue forms. Spam is already handled by the honeypot
// and field validation; this is only a backstop against a runaway script.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registrations from this IP. Try again later.' },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many updates. Try again later.' },
});

// ---- Routes ----------------------------------------------------------

/**
 * POST /api/register
 * validateRegistration has already:
 *   1. blocked bots via the honeypot,
 *   2. sanitized + validated the required fields,
 *   3. converted optional PII into Yes/No flags and DELETED the raw values.
 * All this handler ever sees is req.registration (no PII).
 */
app.post('/api/register', registerLimiter, validateRegistration, async (req, res) => {
  try {
    const r = req.registration;

    await appendRegistrationRow([
      formatTimestamp(new Date()), // Timestamp
      r.employeeId,             // Employee ID
      r.fullName,               // Full Name
      r.nickname,               // Nickname
      r.venue,                  // Venue
      r.providedBirthdate,      // Provided Birthdate (Yes/No)
      r.providedAddress,        // Provided Address  (Yes/No)
      r.providedContact,        // Provided Contact  (Yes/No)
      r.vulnerable,             // Vulnerable (Yes/No)
      'No',                     // Asked About Fields (admin-toggled later)
    ]);

    return res.status(201).json({ success: true, message: 'Registration saved.' });
  } catch (err) {
    // Log server-side only; never leak stack traces / internals to clients.
    console.error('Registration error:', err.message);
    return res
      .status(500)
      .json({ success: false, message: 'Could not save registration. Please try again.' });
  }
});

/**
 * GET /api/stats
 * Returns aggregate numbers for the dashboard — never row-level data.
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    return res.json({ success: true, ...stats });
  } catch (err) {
    console.error('Stats error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load statistics.' });
  }
});

/**
 * GET /api/employees
 * Lists registered employees (saved identity fields + Yes/No flags) for the
 * /employee_list view. The vulnerable PII values are never stored, so they
 * cannot appear here.
 */
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await listEmployees();
    return res.json({ success: true, employees });
  } catch (err) {
    console.error('Employees error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load employees.' });
  }
});

/**
 * PATCH /api/employees/:row/asked
 * Toggles the "Asked About Fields" flag for one row. Body: { asked: boolean }.
 * :row is the 1-based spreadsheet row number (>= 2; row 1 is the header).
 */
app.patch('/api/employees/:row/asked', writeLimiter, async (req, res) => {
  const row = Number(req.params.row);
  const { asked } = req.body || {};

  if (!Number.isInteger(row) || row < 2) {
    return res.status(400).json({ success: false, message: 'Invalid row.' });
  }
  if (typeof asked !== 'boolean') {
    return res.status(400).json({ success: false, message: '"asked" must be true or false.' });
  }

  try {
    await setAskedFlag(row, asked);
    return res.json({ success: true });
  } catch (err) {
    console.error('Set-asked error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not update the record.' });
  }
});

// Simple liveness probe (no auth, no data).
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ---- Serve the built React app (single-service deploy) ---------------
// When a production build exists at client/dist, this server also serves it,
// so the whole app lives behind ONE public URL (API under /api, the SPA
// everywhere else). In dev the frontend is served by Vite instead, so this
// is a no-op until you run `npm run build` in client/.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API GET returns index.html so client-side routes
  // (/dashboard, /employee_list) work on direct load / refresh.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Catch-all 404 for anything unmatched (unknown /api routes, etc.).
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found.' }));

// ---- Startup ---------------------------------------------------------
app.listen(PORT, async () => {
  console.log(`API listening on http://localhost:${PORT}`);
  try {
    await ensureHeaderRow();
    console.log('Google Sheet header row verified.');
  } catch (err) {
    console.error(
      'WARNING: Could not reach Google Sheets. Check your .env credentials.',
      err.message
    );
  }
});
