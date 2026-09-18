// Only CSS is injected into the page. No page JavaScript, DOM inspection,
// network requests, content scripts, or persistent website permissions.
const queues = new Map();
const key = (tabId) => `enabled:${tabId}`;
const target = (tabId) => ({
  target: { tabId },
  files: ["dark.css"],
  origin: "USER",
});

function enqueue(tabId, task) {
  const previous = queues.get(tabId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  queues.set(tabId, next);
  void next.catch(() => {}).finally(() => {
    if (queues.get(tabId) === next) queues.delete(tabId);
  });
  return next;
}

async function badge(tabId, enabled) {
  await chrome.action.setBadgeText({ tabId, text: enabled ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#385b52" });
  await chrome.action.setTitle({
    tabId,
    title: `Nightfall — click to turn ${enabled ? "off" : "on"}`,
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  void enqueue(tab.id, async () => {
    const stateKey = key(tab.id);
    const enabled = Boolean((await chrome.storage.session.get(stateKey))[stateKey]);
    try {
      if (enabled) {
        await chrome.scripting.removeCSS(target(tab.id));
      } else {
        await chrome.scripting.insertCSS(target(tab.id));
      }
      await chrome.storage.session.set({ [stateKey]: !enabled });
      await badge(tab.id, !enabled);
    } catch {
      // Chrome protects internal pages, its web store, and some viewers.
      // Leave the previous state intact when injection/removal fails.
      await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
      await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#965333" });
      await chrome.action.setTitle({
        tabId: tab.id,
        title: "Nightfall — unable to change this page. Try a regular website tab.",
      });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status !== "loading") return;
  void enqueue(tabId, async () => {
    // Navigation normally removes injected CSS. Explicit removal also covers
    // loading events where Chrome retains the document.
    try { await chrome.scripting.removeCSS(target(tabId)); } catch {}
    await chrome.storage.session.remove(key(tabId));
    await badge(tabId, false);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void enqueue(tabId, () => chrome.storage.session.remove(key(tabId)));
});
