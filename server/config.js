/**
 * config.js
 * ------------------------------------------------------------------
 * Shared constants used across the backend. The frontend keeps its own
 * copy of the venue list (a browser can't import from the server), so if
 * you change the venues here, update client/src/constants.js too.
 */

// The only venues a registration may be tied to. The first is the default.
const VENUES = [
  'Victory Quezon Avenue (ETON Centris, Quezon City)',
  'Victory Pasig (Estancia Mall, Pasig City)',
];

module.exports = { VENUES };
