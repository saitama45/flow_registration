# Team Members Attendance Registration (React + Node.js + Google Sheets)

A privacy-first event registration app.

- **Saved to Google Sheets:** Employee ID, Full Name, Nickname, Venue.
- **Never saved (vulnerable fields):** Birthdate, Address, Contact Number —
  the backend discards the raw values and stores only `Yes`/`No` flags
  indicating whether each was provided. Anyone who provided at least one of
  those fields is flagged as a **Vulnerable** employee.
- **Dashboard** (`/dashboard`): realtime, animated — a full-width speedometer
  gauge for the vulnerable percentage, a count-up total, a donut for the
  vulnerable count, and a bar for the "asked if fields are required" share.
  Aggregate counts only, no login step.
- **Employee list** (`/employee_list`): realtime table of registrations with
  a per-row checkbox to flag anyone who asked whether the fields are required;
  that count feeds the dashboard.

```
nodejs/
├── server/   Express API                  (port 5000)
└── client/   React (Vite + Tailwind CSS)  (port 5174)
```

## Routes (client)

| Path | View |
|---|---|
| `/` | Registration form |
| `/dashboard` | Realtime animated stats |
| `/employee_list` | Realtime employee table + "asked" checkboxes |

## 1. Google Cloud setup (one time)

1. Go to https://console.cloud.google.com and create (or pick) a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **IAM & Admin → Service Accounts** → create a service account.
4. Open the account → **Keys → Add key → JSON**. Download the key file.
5. Create a Google Sheet, copy its ID from the URL
   (`https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`).
6. **Share the sheet** with the service account's email address
   (`...@...iam.gserviceaccount.com`) as **Editor**.

The server writes (and keeps in sync) the header row automatically on start:

| Timestamp | Employee ID | Full Name | Nickname | Venue | Provided Birthdate | Provided Address | Provided Contact | Vulnerable | Asked About Fields |
|---|---|---|---|---|---|---|---|---|---|

Timestamps are written in a readable form (e.g. `Jul 15, 2026, 3:21 PM`,
Asia/Manila time) rather than raw ISO strings.

> **Schema note:** columns changed from the original layout. If your sheet
> still has rows written under the old layout, clear the data rows (row 2
> down) so old and new rows don't mix — the header is rewritten automatically,
> but old rows won't line up with the new columns.

## 2. Backend

```bash
cd server
npm install
copy .env.example .env      # then edit .env
npm run dev
```

Fill `.env` with:

- `GOOGLE_SPREADSHEET_ID` — from step 5 above
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` — from the JSON key
  file's `client_email` and `private_key` fields. **Copy the entire
  `private_key` value** — it is ~1,700 characters, starts with
  `-----BEGIN PRIVATE KEY-----\nMIIEv...` and ends with
  `...\n-----END PRIVATE KEY-----\n`. Keep it in double quotes on one line
  with the `\n` sequences intact. (Do NOT use `private_key_id` — that short
  hex string is a different field.)
- `REACT_APP_URL` — the frontend origin (default `http://localhost:5174`)

Venues are defined in `server/config.js` (and mirrored in
`client/src/constants.js`). Update both if they change.

## 3. Frontend

```bash
cd client
npm install
copy .env.example .env      # optional; defaults to http://localhost:5000
npm run dev
```

Open http://localhost:5174. The dashboard and employee list update
automatically (poll every 4s) — no manual refresh.

> Port note: 5174 is used (not Vite's default 5173) so this app can run
> alongside the ghelpdesk project's Vite dev server without a port clash.

## Deploy to a public URL (one service, free)

In production the Express server also serves the built React app, so the whole
thing lives behind **one URL** — no separate frontend host, no CORS to set up.

**Render.com (recommended, free, uses `render.yaml`):**

1. Push to GitHub (done: `github.com/saitama45/flow_registration`).
2. https://render.com → sign in with GitHub → **New → Blueprint** → pick this repo.
3. Render reads `render.yaml`. Add the three secret env vars when prompted (from
   your `server/.env`): `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   and `GOOGLE_PRIVATE_KEY` (paste the full key, keeping the `\n` sequences).
4. Deploy. Public URL: `https://flow-registration.onrender.com` (name may vary).

Build = `npm install --prefix client && npm run build --prefix client && npm install --prefix server`;
start = `node server/server.js`. The same setup works on Railway or Fly.io.

> Free Render web services sleep after ~15 min idle and cold-start in ~30–60s
> on the next visit — fine for a demo, worth the paid tier for event day.

> **Before going public, read the auth note below.** The employee list is
> currently open to anyone with the URL.

## Security measures

| Layer | Where | What it does |
|---|---|---|
| PII discard | `server/middleware/validation.js` | Vulnerable field values (birthdate/address/contact) converted to Yes/No flags and deleted before any handler or log can see them |
| Honeypot | `client/.../RegistrationForm.jsx` + validation middleware | Hidden `website` field; bots that fill it get a fake success and nothing is saved |
| Validation & sanitization | `server/middleware/validation.js` | Control-char stripping, length caps, regex checks, venue allowlist |
| Formula-injection defense | `server/services/googleSheets.js` | Rows written with `valueInputOption: 'RAW'` so `=...` payloads are stored as inert text |
| CORS | `server/server.js` | Only the configured frontend origin; GET/POST/PATCH |
| Rate limiting | `server/server.js` | Generous global backstop (3000/15 min); stricter on writes — 20 registrations and 200 flag-updates /15 min per IP |
| Read caching | `server/services/googleSheets.js` | 2s cache of sheet rows so realtime polling / many viewers don't exhaust the Sheets read quota |
| Helmet | `server/server.js` | Hardened HTTP response headers |
| Credential isolation | architecture | Google credentials live only in `server/.env`; the browser never talks to Google Sheets |

`/api/stats` and `/api/employees` are intentionally open (no auth). `/api/stats`
returns aggregate counts only. `/api/employees` returns the saved identity
fields (Employee ID, Full Name, Nickname, Venue) plus Yes/No flags — never the
vulnerable PII values, which are never stored. If you need to restrict who can
see the employee list, add auth in front of these routes.

## API

### `POST /api/register`

```json
{
  "employeeId": "TGI012345",
  "fullName": "Dela Cruz, Juan",
  "nickname": "John",
  "venue": "Victory Quezon Avenue (ETON Centris, Quezon City)",
  "birthdate": "11/01/2000",
  "address": "123 Bagumbayan, Quezon City",
  "contactNumber": "09171234567",
  "website": ""
}
```

`201` on success. `400` with a field-keyed `errors` object on validation
failure. The three vulnerable values are discarded server-side.

### `GET /api/stats`

```json
{
  "success": true,
  "totalEmployees": 42,
  "vulnerableEmployees": 10,
  "vulnerablePercentage": 23.8,
  "notVulnerableEmployees": 32,
  "notVulnerablePercentage": 76.2,
  "askedEmployees": 6,
  "askedPercentage": 14.3,
  "contactEmployees": 9,
  "contactPercentage": 21.4,
  "birthdateEmployees": 5,
  "birthdatePercentage": 11.9,
  "addressEmployees": 3,
  "addressPercentage": 7.1
}
```

The `contact` / `birthdate` / `address` counts are per-field breakdowns of who
chose to share each optional detail (from the Yes/No flags — the values
themselves are never stored). The dashboard renders them as bar graphs.

### `GET /api/employees`

```json
{
  "success": true,
  "employees": [
    {
      "row": 2,
      "timestamp": "Jul 20, 2026, 1:05 PM",
      "employeeId": "TGI012345",
      "fullName": "Dela Cruz, Juan",
      "nickname": "John",
      "venue": "Victory Quezon Avenue (ETON Centris, Quezon City)",
      "vulnerable": true,
      "asked": false
    }
  ]
}
```

### `PATCH /api/employees/:row/asked`

Body: `{ "asked": true }`. Toggles the "Asked About Fields" flag for that
spreadsheet row (`:row` is the 1-based row number; row 1 is the header).
