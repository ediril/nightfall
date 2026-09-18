importScripts("settings.js");

// Serialize clicks so quick toggles cannot overwrite each other.
let pending = Promise.resolve();
function enqueue(task) {
  pending = pending.catch(() => {}).then(task);
  void pending.catch(() => {});
  return pending;
}

async function updateBadge(tab) {
  if (tab.id == null) return;
  const settings = await chrome.storage.local.get(null);
  const enabled = Nightfall.enabled(settings, tab.url);
  await chrome.action.setBadgeText({ tabId: tab.id, text: enabled ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#385b52" });
  await chrome.action.setTitle({
    tabId: tab.id,
    title: `Nightfall — turn ${enabled ? "off" : "on"} ${settings.mode === "global" ? "globally" : "for this site"}. Right-click for Options.`,
  });
}

async function refreshBadges() {
  await Promise.allSettled((await chrome.tabs.query({})).map(updateBadge));
}

async function attach(tab) {
  if (tab.id == null || !Nightfall.siteKey(tab.url)) return;
  // Bring already-open tabs into the new version. content.js is idempotent.
  await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["dark.css"] });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id }, files: ["settings.js", "content.js"],
  });
}

chrome.action.onClicked.addListener((tab) => {
  void enqueue(async () => {
    const settings = await chrome.storage.local.get(null);
    const siteKey = Nightfall.siteKey(tab.url);
    if (settings.mode !== "global" && !siteKey) {
      await chrome.action.setTitle({ tabId: tab.id, title: "Nightfall — open a website to toggle it. Right-click for Options." });
      return;
    }
    const key = settings.mode === "global" ? "globalEnabled" : siteKey;
    try {
      if (settings.mode !== "global") await attach(tab);
      await chrome.storage.local.set({ [key]: !Boolean(settings[key]) });
      await refreshBadges();
    } catch (error) {
      await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
      await chrome.action.setTitle({ tabId: tab.id, title: `Nightfall — ${error.message}` });
    }
  });
});

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") void enqueue(refreshBadges);
});
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (change.status || change.url) void enqueue(() => updateBadge(tab));
});
chrome.runtime.onInstalled.addListener(() => {
  void enqueue(async () => {
    await Promise.allSettled((await chrome.tabs.query({})).map(attach));
    await refreshBadges();
  });
});
chrome.runtime.onStartup.addListener(() => { void enqueue(refreshBadges); });
