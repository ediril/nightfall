// Shared pure helpers. Only preferences and hostname keys are stored locally.
globalThis.Nightfall = {
  defaults: { mode: "site", globalEnabled: false, background: 27, text: 199 },
  siteKey(url) {
    try {
      const parsed = new URL(url);
      return /^https?:$/.test(parsed.protocol) ? `site:${parsed.hostname}` : null;
    } catch { return null; }
  },
  enabled(settings, url) {
    const key = this.siteKey(url);
    if (!key) return false;
    return settings.mode === "global" ? Boolean(settings.globalEnabled) : Boolean(settings[key]);
  },
  appearance(settings) {
    const clamp = (value, min, max, fallback) =>
      typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const background = clamp(settings.background, 10, 60, this.defaults.background);
    const text = clamp(settings.text, 150, 240, this.defaults.text);
    // Map white -> background and black -> text independently.
    const brightness = (background + text) / 255;
    const contrast = (text - background) / (text + background);
    return { background, text, filter: `invert(1) hue-rotate(180deg) contrast(${contrast}) brightness(${brightness})` };
  },
};
