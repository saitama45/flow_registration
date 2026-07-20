const ALARM_NAME = "refresh-flow-registration";
const TARGET_ORIGIN = "https://flow-registration.onrender.com";
const REFRESH_EVERY_MINUTES = 1;

async function setBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#198754" : "#6c757d",
  });
  await chrome.action.setTitle({
    title: enabled
      ? "Flow auto-refresh is ON (click to stop)"
      : "Flow auto-refresh is OFF (click to start)",
  });
}

async function setEnabled(enabled) {
  await chrome.storage.local.set({ enabled });

  if (enabled) {
    await chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: REFRESH_EVERY_MINUTES,
      periodInMinutes: REFRESH_EVERY_MINUTES,
    });
  } else {
    await chrome.alarms.clear(ALARM_NAME);
  }

  await setBadge(enabled);
}

async function initialize() {
  const stored = await chrome.storage.local.get("enabled");
  const enabled = stored.enabled ?? true;
  await setEnabled(enabled);
}

function isTargetPage(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.origin === TARGET_ORIGIN && (url.pathname === "/" || url.pathname === "");
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const { enabled = true } = await chrome.storage.local.get("enabled");
  if (!enabled) return;

  const tabs = await chrome.tabs.query({
    url: `${TARGET_ORIGIN}/*`,
  });

  for (const tab of tabs) {
    if (tab.id !== undefined && isTargetPage(tab.url)) {
      await chrome.tabs.reload(tab.id);
    }
  }
});

chrome.action.onClicked.addListener(async () => {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  await setEnabled(!enabled);
});
