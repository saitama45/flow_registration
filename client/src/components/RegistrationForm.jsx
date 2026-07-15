import { useState } from 'react';
import { submitRegistration } from '../api.js';
import { VENUES } from '../constants.js';
import Toast from './Toast.jsx';

const INITIAL_FORM = {
  employeeId: '',
  contactNumber: '',
  fullName: '',
  birthdate: '',
  nickname: '',
  address: '',
  venue: VENUES[0],
  website: '', // honeypot — humans never see or fill this
};

// Mirror of the backend rules so users get instant feedback.
// The backend re-validates everything; client checks are UX only.
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9-]{3,20}$/;
const FULL_NAME_REGEX = /^[\p{L}][\p{L}\s,.'-]{1,99}$/u;
const NICKNAME_REGEX = /^[\p{L}][\p{L}\s'.-]{0,49}$/u;

// Format a Philippine mobile number as "0912 345 6789" while typing:
// keep digits only (max 11), then group 4-3-4. Max formatted length is 13.
function formatContact(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 7));
  if (digits.length > 7) parts.push(digits.slice(7, 11));
  return parts.join(' ');
}

// Shared Tailwind class strings keep the JSX readable.
const inputClass = (invalid) =>
  `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
    invalid ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-500'
  }`;
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';
const errorClass = 'mt-1.5 text-xs text-red-600';

export default function RegistrationForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [toastMessage, setToastMessage] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    const nextValue = name === 'contactNumber' ? formatContact(value) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (!EMPLOYEE_ID_REGEX.test(form.employeeId.trim())) {
      next.employeeId = '3-20 letters/numbers, e.g. TGI012345.';
    }
    if (!FULL_NAME_REGEX.test(form.fullName.trim())) {
      next.fullName = 'Enter as "Surname, Firstname", e.g. Dela Cruz, Juan.';
    }
    if (!NICKNAME_REGEX.test(form.nickname.trim())) {
      next.nickname = 'Letters, spaces and hyphens only (max 50 characters).';
    }
    // Venue always has a default; only flag a non-empty value that isn't a
    // known venue, so the default selection can never trip a false alarm.
    if (form.venue && !VENUES.includes(form.venue)) {
      next.venue = 'Please choose a venue.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setStatus({ state: 'loading', message: '' });
    try {
      // Guarantee a venue even if state was somehow cleared (e.g. a stale
      // hot-reload) — the dropdown always shows the first venue by default.
      const payload = { ...form, venue: form.venue || VENUES[0] };
      const { ok, data } = await submitRegistration(payload);
      if (ok) {
        setForm(INITIAL_FORM);
        setStatus({ state: 'idle', message: '' });
        setToastMessage('Registration saved.');
      } else if (data.errors) {
        setErrors(data.errors);
        setStatus({ state: 'error', message: 'Please fix the highlighted fields.' });
      } else {
        setStatus({ state: 'error', message: data.message || 'Something went wrong.' });
      }
    } catch {
      setStatus({ state: 'error', message: 'Could not reach the server. Is the API running?' });
    }
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="space-y-4">
        {/* 1. Employee ID */}
        <div>
          <label className={labelClass} htmlFor="employeeId">
            Employee ID
          </label>
          <input
            className={inputClass(!!errors.employeeId)}
            id="employeeId"
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            maxLength={20}
            placeholder="e.g. TGI012345"
            aria-invalid={!!errors.employeeId}
          />
          {errors.employeeId && <p className={errorClass}>{errors.employeeId}</p>}
        </div>

        {/* 2. Contact Number */}
        <div>
          <label className={labelClass} htmlFor="contactNumber">
            Contact Number
          </label>
          <input
            className={inputClass(false)}
            id="contactNumber"
            name="contactNumber"
            type="tel"
            inputMode="numeric"
            value={form.contactNumber}
            onChange={handleChange}
            maxLength={13}
            placeholder="e.g. 0912 345 6789"
          />
        </div>

        {/* 3. Full Name */}
        <div>
          <label className={labelClass} htmlFor="fullName">
            Full Name (Surname, Firstname)
          </label>
          <input
            className={inputClass(!!errors.fullName)}
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            maxLength={100}
            placeholder="e.g. Dela Cruz, Juan"
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
        </div>

        {/* 4. Birthdate */}
        <div>
          <label className={labelClass} htmlFor="birthdate">
            Birthdate
          </label>
          <input
            className={`${inputClass(false)} cursor-pointer`}
            id="birthdate"
            name="birthdate"
            type="date"
            value={form.birthdate}
            onChange={handleChange}
          />
        </div>

        {/* 5. Nickname */}
        <div>
          <label className={labelClass} htmlFor="nickname">
            Nickname
          </label>
          <input
            className={inputClass(!!errors.nickname)}
            id="nickname"
            name="nickname"
            value={form.nickname}
            onChange={handleChange}
            maxLength={50}
            placeholder="e.g. John"
            aria-invalid={!!errors.nickname}
          />
          {errors.nickname && <p className={errorClass}>{errors.nickname}</p>}
        </div>

        {/* 6. Address */}
        <div>
          <label className={labelClass} htmlFor="address">
            Address (Home #, Brgy., City)
          </label>
          <input
            className={inputClass(false)}
            id="address"
            name="address"
            value={form.address}
            onChange={handleChange}
            maxLength={500}
            placeholder="e.g. 123 Bagumbayan, Quezon City"
          />
        </div>

        {/* 7. Venue */}
        <div>
          <label className={labelClass} htmlFor="venue">
            Venue
          </label>
          <select
            className={`${inputClass(!!errors.venue)} cursor-pointer`}
            id="venue"
            name="venue"
            value={form.venue}
            onChange={handleChange}
          >
            {VENUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          {errors.venue && <p className={errorClass}>{errors.venue}</p>}
        </div>
      </div>

      {/*
        Honeypot: clipped to 1x1px in place (NOT display:none/hidden — some
        bots skip those) so naive bots auto-fill it and get silently rejected
        by the backend. aria-hidden + tabIndex=-1 keep it away from screen
        readers and keyboard users too.
      */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          value={form.website}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        className="mt-8 w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status.state === 'loading'}
      >
        {status.state === 'loading' ? 'Submitting…' : 'Submit registration'}
      </button>

      {status.state === 'error' && status.message && (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          role="status"
        >
          {status.message}
        </p>
      )}

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </form>
  );
}
