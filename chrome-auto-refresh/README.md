# Flow Registration Auto Refresh

This Chrome extension refreshes only this page every 60 seconds:

`https://flow-registration.onrender.com/`

## Install in Chrome

1. Open `chrome://extensions/` in Chrome.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select this `chrome-auto-refresh` folder.

It starts automatically. Keep the target page open; it does not have to remain
the active tab. Pinning the extension is optional.

Click the extension's toolbar icon to pause or resume it. Its badge displays
`ON` while refreshing and `OFF` while paused.

Chrome must remain running. The extension continues working after Chrome is
restarted, but Chrome may suspend or discard an inactive tab under memory
pressure.
