(() => {
  if (globalThis.nightfallAttached) return;
  globalThis.nightfallAttached = true;
  let revision = 0;
  let observer;

  async function refresh() {
    const current = ++revision;
    const settings = await chrome.storage.local.get([
      "mode", "globalEnabled", "background", "text", Nightfall.siteKey(location.href),
    ]);
    if (current !== revision) return;
    const apply = () => {
      const root = document.documentElement;
      if (!root) return false;
      if (Nightfall.enabled(settings, location.href)) {
        root.style.setProperty("--nightfall-filter", Nightfall.appearance(settings).filter);
        root.setAttribute("data-nightfall", "on");
      } else {
        root.removeAttribute("data-nightfall");
        root.style.removeProperty("--nightfall-filter");
      }
      return true;
    };
    observer?.disconnect();
    if (!apply()) {
      observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
      observer.observe(document, { childList: true });
    }
  }
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") void refresh();
  });
  void refresh();
})();
