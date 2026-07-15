/**
 * middleware/validation.js
 * ------------------------------------------------------------------
 * Input sanitization + field-level validation for /api/register.
 *
 * Privacy rule enforced here: the "vulnerable" fields (birthdate, address,
 * contactNumber) are reduced to boolean "was it provided?" flags and the
 * raw values are DELETED from the request before any handler can see them.
 *
 * Saved fields:  Employee ID, Full Name, Nickname, Venue
 * Flag-only:     Birthdate, Address, Contact Number  (values never stored)
 */
const { VENUES } = require('../config');

// Matches ASCII control characters (0x00-0x1F and DEL 0x7F).
// Built from char codes so no raw control bytes live in this source file.
const CONTROL_CHARS_REGEX = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']',
  'g'
);

/**
 * Basic sanitizer: coerce to string, strip control characters, trim,
 * and hard-cap the length so oversized payloads can't reach Sheets.
 */
function sanitize(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS_REGEX, '').trim().slice(0, maxLen);
}

// Employee ID: 3-20 alphanumeric characters, optional hyphens, e.g. "TGI012345".
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9-]{3,20}$/;
// Full name "Surname, Firstname": letters plus spaces, commas, periods, apostrophes, hyphens.
const FULL_NAME_REGEX = /^[\p{L}][\p{L}\s,.'-]{1,99}$/u;
// Nickname: a single word/name, letters plus spaces/apostrophes/hyphens.
const NICKNAME_REGEX = /^[\p{L}][\p{L}\s'.-]{0,49}$/u;

function validateRegistration(req, res, next) {
  const body = req.body || {};

  // ---- Honeypot check (bot trap) --------------------------------
  // The React form renders an invisible "website" field that humans
  // never fill in. If it arrives with content, silently accept the
  // request (HTTP 200) WITHOUT saving, so the bot learns nothing.
  if (sanitize(body.website) !== '') {
    return res.status(200).json({ success: true, message: 'Registration received.' });
  }

  // ---- Required (saved) fields ----------------------------------
  const employeeId = sanitize(body.employeeId, 20).toUpperCase();
  const fullName = sanitize(body.fullName, 100);
  const nickname = sanitize(body.nickname, 50);
  const venue = sanitize(body.venue, 100);

  const errors = {};
  if (!EMPLOYEE_ID_REGEX.test(employeeId)) {
    errors.employeeId = '3-20 letters/numbers, e.g. TGI012345.';
  }
  if (!fullName || !FULL_NAME_REGEX.test(fullName)) {
    errors.fullName = 'Enter as "Surname, Firstname", e.g. Dela Cruz, Juan.';
  }
  if (!nickname || !NICKNAME_REGEX.test(nickname)) {
    errors.nickname = 'Letters, spaces and hyphens only (max 50 characters).';
  }
  if (!VENUES.includes(venue)) {
    errors.venue = 'Please choose a valid venue.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // ---- Vulnerable fields -> presence flags ONLY ------------------
  // We check whether a non-empty value was submitted, then discard the
  // actual value immediately. The raw PII never leaves this function.
  const providedBirthdate = sanitize(body.birthdate, 30) !== '' ? 'Yes' : 'No';
  const providedAddress = sanitize(body.address, 500) !== '' ? 'Yes' : 'No';
  const providedContact = sanitize(body.contactNumber, 30) !== '' ? 'Yes' : 'No';

  const vulnerable =
    providedBirthdate === 'Yes' || providedAddress === 'Yes' || providedContact === 'Yes'
      ? 'Yes'
      : 'No';

  // Replace the request body: downstream code can only ever see the
  // sanitized saved fields and the Yes/No flags - never the PII.
  req.registration = {
    employeeId,
    fullName,
    nickname,
    venue,
    providedBirthdate,
    providedAddress,
    providedContact,
    vulnerable,
  };
  delete req.body; // hard-drop the original payload (defense in depth)

  next();
}

module.exports = { validateRegistration };
