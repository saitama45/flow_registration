// Venue options. Keep in sync with server/config.js (a browser can't import
// server code). The first entry is the default selection.
export const VENUES = [
  'Victory Quezon Avenue (ETON Centris, Quezon City)',
  'Victory Pasig (Estancia Mall, Pasig City)',
];

// At/above this exposure share (%) the dashboard raises the alarm: the gauge
// readout blinks and a warning callout appears. It is deliberately the exact
// lower edge of the "Moderate" risk band, so the wording and the blink always
// agree instead of telling different stories.
export const RISK_ALERT_THRESHOLD = 33.3;
