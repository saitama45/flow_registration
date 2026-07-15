/**
 * services/googleSheets.js
 * ------------------------------------------------------------------
 * The ONLY module allowed to talk to Google Sheets.
 * The frontend never sees these credentials — everything is
 * authorized server-side with a Service Account (JWT).
 */
const { google } = require('googleapis');

const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

// Column layout (A → J) — must match the header row in the spreadsheet:
// Timestamp | Employee ID | Full Name | Nickname | Venue |
// Provided Birthdate | Provided Address | Provided Contact |
// Vulnerable | Asked About Fields
const HEADER_ROW = [
  'Timestamp',
  'Employee ID',
  'Full Name',
  'Nickname',
  'Venue',
  'Provided Birthdate',
  'Provided Address',
  'Provided Contact',
  'Vulnerable',
  'Asked About Fields',
];

// Zero-based column indexes into a data row (keep in sync with HEADER_ROW).
const COL = {
  timestamp: 0,
  employeeId: 1,
  fullName: 2,
  nickname: 3,
  venue: 4,
  providedBirthdate: 5,
  providedAddress: 6,
  providedContact: 7,
  vulnerable: 8,
  asked: 9,
};

// JWT auth using the Service Account. The private key is stored in .env
// with escaped "\n" sequences, so we convert them back to real newlines.
const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = () => process.env.GOOGLE_SPREADSHEET_ID;

const isYes = (v) => (v || '').trim().toLowerCase() === 'yes';

/**
 * Human-readable timestamp for the spreadsheet, e.g. "Jul 15, 2026, 3:21 PM".
 * Fixed to Asia/Manila and en-US formatting so every row reads the same
 * regardless of the server's own locale/timezone settings.
 */
function formatTimestamp(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(date);
}

/**
 * Ensure the header row matches the current schema. If row 1 is empty or
 * differs from HEADER_ROW (e.g. after a schema change), it is (re)written.
 */
async function ensureHeaderRow() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${SHEET_NAME}!A1:J1`,
  });

  const current = (res.data.values && res.data.values[0]) || [];
  const matches = HEADER_ROW.every((h, i) => (current[i] || '') === h);

  if (!matches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${SHEET_NAME}!A1:J1`,
      valueInputOption: 'RAW',
      resource: { values: [HEADER_ROW] },
    });
  }
}

/**
 * Append one registration row.
 *
 * SECURITY: valueInputOption is 'RAW' (not 'USER_ENTERED') so Sheets
 * stores every cell as a literal string. A malicious payload such as
 * "=IMPORTRANGE(...)" can therefore never execute as a formula
 * (spreadsheet formula-injection protection).
 */
async function appendRegistrationRow(dataRow) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${SHEET_NAME}!A:J`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [dataRow] },
  });
  invalidateRowsCache();
}

// Short-lived cache of the data rows. Realtime dashboards poll every few
// seconds and several viewers may watch at once; caching for a couple of
// seconds keeps things feeling live while protecting the Google Sheets API
// read quota (~60 reads/min per service account). Writes invalidate it so
// new data appears on the very next poll.
const ROWS_TTL_MS = 2000;
let rowsCache = { at: 0, data: null };

function invalidateRowsCache() {
  rowsCache = { at: 0, data: null };
}

/** Read all data rows (skipping the header), served from a 2s cache. */
async function getRows() {
  const now = Date.now();
  if (rowsCache.data && now - rowsCache.at < ROWS_TTL_MS) {
    return rowsCache.data;
  }
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${SHEET_NAME}!A2:J`,
  });
  const rows = res.data.values || [];
  rowsCache = { at: now, data: rows };
  return rows;
}

/**
 * Compute dashboard stats on the fly. Returns aggregates only — never the
 * underlying rows.
 */
async function getStats() {
  const rows = await getRows();
  const totalEmployees = rows.length;

  const vulnerableEmployees = rows.filter((r) => isYes(r[COL.vulnerable])).length;
  const askedEmployees = rows.filter((r) => isYes(r[COL.asked])).length;

  const pct = (n) =>
    totalEmployees === 0 ? 0 : Math.round((n / totalEmployees) * 1000) / 10;

  return {
    totalEmployees,
    vulnerableEmployees,
    vulnerablePercentage: pct(vulnerableEmployees),
    askedEmployees,
    askedPercentage: pct(askedEmployees),
  };
}

/**
 * List registered employees for the /employee_list view. Returns the saved
 * identity fields plus the Yes/No flags and each row's spreadsheet row
 * number (needed to toggle the "asked" flag). The vulnerable-PII values are
 * never in the sheet, so they can't leak here.
 */
async function listEmployees() {
  const rows = await getRows();
  return rows.map((r, i) => ({
    row: i + 2, // sheet row number (row 1 is the header)
    timestamp: r[COL.timestamp] || '',
    employeeId: r[COL.employeeId] || '',
    fullName: r[COL.fullName] || '',
    nickname: r[COL.nickname] || '',
    venue: r[COL.venue] || '',
    vulnerable: isYes(r[COL.vulnerable]),
    asked: isYes(r[COL.asked]),
  }));
}

/**
 * Toggle the "Asked About Fields" flag (column J) for a single row.
 * `rowNumber` is the 1-based spreadsheet row (>= 2; row 1 is the header).
 */
async function setAskedFlag(rowNumber, asked) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${SHEET_NAME}!J${rowNumber}`,
    valueInputOption: 'RAW',
    resource: { values: [[asked ? 'Yes' : 'No']] },
  });
  invalidateRowsCache();
}

module.exports = {
  ensureHeaderRow,
  appendRegistrationRow,
  getStats,
  listEmployees,
  setAskedFlag,
  formatTimestamp,
};
