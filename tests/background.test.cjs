const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function setup(initial = {}) {
  const state = { ...initial };
  const listeners = {};
  const badges = {};
  const tabs = [{ id: 1, url: "https://github.com/a" }, { id: 2, url: "https://github.com/b" }, { id: 3, url: "https://docs.google.com/" }];
  let fail = false;
  const event = (name) => ({ addListener: (fn) => { listeners[name] = fn; } });
  const chrome = {
    action: { onClicked: event("click"), setBadgeText: async ({ tabId, text }) => { badges[tabId] = text; }, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
    tabs: { query: async () => tabs, onUpdated: event("update") },
    runtime: { onInstalled: event("install"), onStartup: event("startup") },
    storage: { local: {
      get: async () => ({ ...state }),
      set: async (values) => { Object.assign(state, values); listeners.storage({}, "local"); },
    }, onChanged: event("storage") },
    scripting: { insertCSS: async () => { if (fail) throw Error("Protected page"); }, executeScript: async () => {} },
  };
  function restart() {
    const context = vm.createContext({ chrome, URL });
    context.importScripts = (file) => vm.runInContext(source(file), context);
    vm.runInContext(source("background.js"), context);
  }
  restart();
  return { state, listeners, badges, tabs, restart, fail: () => { fail = true; }, settle: () => new Promise((r) => setImmediate(r)) };
}

test("per-site defaults persist across navigation and worker restart, updating matching tabs", async () => {
  const app = setup();
  app.listeners.click(app.tabs[0]);
  await app.settle();
  assert.equal(app.state["site:github.com"], true);
  assert.deepEqual(app.badges, { 1: "ON", 2: "ON", 3: "" });
  app.restart();
  app.tabs[0].url = "https://github.com/another/repo";
  app.listeners.update(1, { status: "complete" }, app.tabs[0]);
  await app.settle();
  assert.equal(app.badges[1], "ON");
  app.listeners.click(app.tabs[0]);
  await app.settle();
  assert.equal(app.state["site:github.com"], false);
  assert.equal(app.badges[2], "");
});

test("global toggles all sites without losing per-site preferences", async () => {
  const app = setup({ mode: "global", "site:github.com": true });
  app.listeners.click(app.tabs[0]);
  await app.settle();
  assert.equal(app.state.globalEnabled, true);
  assert.deepEqual(app.badges, { 1: "ON", 2: "ON", 3: "ON" });
  app.state.mode = "site";
  app.listeners.storage({}, "local");
  await app.settle();
  assert.deepEqual(app.badges, { 1: "ON", 2: "ON", 3: "" });
  assert.equal(app.state.globalEnabled, true);
});

test("rapid toggles serialize and protected-page failure does not enable the site", async () => {
  const app = setup();
  app.listeners.click(app.tabs[0]);
  app.listeners.click(app.tabs[0]);
  await app.settle();
  assert.equal(app.state["site:github.com"], false);
  app.fail();
  app.listeners.click(app.tabs[2]);
  await app.settle();
  assert.equal(app.state["site:docs.google.com"], undefined);
  assert.equal(app.badges[3], "!");
});

test("global preferences survive restart and apply to a newly opened site", async () => {
  const app = setup({ mode: "global", globalEnabled: true });
  app.restart();
  const tab = { id: 4, url: "https://jira.example.com/issue/1" };
  app.listeners.update(4, { status: "loading" }, tab);
  await app.settle();
  assert.equal(app.badges[4], "ON");
});

test("brightness endpoints are independently preserved", () => {
  const context = vm.createContext({ URL });
  vm.runInContext(source("settings.js"), context);
  for (const background of [10, 27, 60]) for (const text of [150, 199, 240]) {
    const result = context.Nightfall.appearance({ background, text });
    const [, contrast, brightness] = result.filter.match(/contrast\(([^)]+)\) brightness\(([^)]+)\)/).map(Number);
    assert.ok(Math.abs((0.5 - contrast * 0.5) * brightness * 255 - background) < 1e-9);
    assert.ok(Math.abs((0.5 + contrast * 0.5) * brightness * 255 - text) < 1e-9);
  }
  assert.equal(context.Nightfall.siteKey("chrome://extensions"), null);
  assert.notEqual(context.Nightfall.siteKey("https://docs.google.com"), context.Nightfall.siteKey("https://mail.google.com"));
});

test("content applies saved settings on a new document, updates live, and cleans up when off", async () => {
  const state = { "site:github.com": true, background: 27, text: 199 };
  const attrs = {};
  const styles = {};
  let listener;
  let count = 0;
  const root = {
    setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: (k) => { delete attrs[k]; },
    style: { setProperty: (k, v) => { styles[k] = v; }, removeProperty: (k) => { delete styles[k]; } },
  };
  const context = vm.createContext({ URL, location: { href: "https://github.com/another/page" }, document: { documentElement: root },
    chrome: { storage: { local: { get: async () => ({ ...state }) }, onChanged: { addListener: (fn) => { listener = fn; count++; } } } },
  });
  vm.runInContext(source("settings.js"), context);
  vm.runInContext(source("content.js"), context);
  await new Promise(setImmediate);
  assert.equal(attrs["data-nightfall"], "on");
  const original = styles["--nightfall-filter"];
  state.text = 220;
  listener({}, "local");
  await new Promise(setImmediate);
  assert.notEqual(styles["--nightfall-filter"], original);
  vm.runInContext(source("content.js"), context);
  assert.equal(count, 1);
  state["site:github.com"] = false;
  listener({}, "local");
  await new Promise(setImmediate);
  assert.equal(attrs["data-nightfall"], undefined);
  assert.equal(styles["--nightfall-filter"], undefined);
});
