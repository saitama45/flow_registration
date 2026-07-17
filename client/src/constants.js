// Venue options. Keep in sync with server/config.js (a browser can't import
// server code). The first entry is the default selection.
export const VENUES = [
  'Victory Quezon Avenue (ETON Centris, Quezon City)',
  'Victory Pasig (Estancia Mall, Pasig City)',
];

// Where the registration QR code sends people. Hard-coded to the deployed URL
// rather than window.location.origin, so the QR still works when generated
// from a localhost dev session. Override with VITE_PUBLIC_URL if the host
// changes.
export const PUBLIC_REGISTRATION_URL =
  import.meta.env.VITE_PUBLIC_URL || 'https://flow-registration.onrender.com/';

// At/above this exposure share (%) the dashboard raises the alarm: the gauge
// readout blinks and a warning callout appears. It is deliberately the exact
// lower edge of the "Moderate" risk band, so the wording and the blink always
// agree instead of telling different stories.
export const RISK_ALERT_THRESHOLD = 33.3;
