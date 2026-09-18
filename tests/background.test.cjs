const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function setup() {
  const state = {};
  const calls = [];
  const listeners = {};
  let fail = false;
  const event = (name) => ({ addListener: (fn) => { listeners[name] = fn; } });
  const chrome = {
    action: {
      onClicked: event("click"),
      setBadgeText: async (args) => calls.push(["badge", args]),
      setBadgeBackgroundColor: async () => {},
      setTitle: async () => {},
    },
    tabs: { onUpdated: event("update"), onRemoved: event("remove") },
    storage: { session: {
      get: async (key) => ({ [key]: state[key] }),
      set: async (value) => Object.assign(state, value),
      remove: async (key) => { delete state[key]; },
    } },
    scripting: {
      insertCSS: async (args) => { if (fail) throw Error("Protected page"); calls.push(["insert", args]); },
      removeCSS: async (args) => calls.push(["remove", args]),
    },
  };
  const restart = () => vm.runInNewContext(fs.readFileSync(require.resolve("../background.js"), "utf8"), { chrome });
  restart();
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  return { state, calls, listeners, settle, restart, fail: () => { fail = true; } };
}

test("toggle survives worker restart and removes exactly the inserted stylesheet", async () => {
  const app = setup();
  app.listeners.click({ id: 7 });
  await app.settle();
  assert.equal(app.state["enabled:7"], true);
  app.restart();
  app.listeners.click({ id: 7 });
  await app.settle();
  assert.equal(app.state["enabled:7"], false);
  const operations = app.calls.filter(([name]) => name === "insert" || name === "remove");
  assert.deepEqual(operations.map(([name]) => name), ["insert", "remove"]);
  assert.equal(JSON.stringify(operations[0][1]), JSON.stringify(operations[1][1]));
});

test("rapid clicks are serialized and tab state stays independent", async () => {
  const app = setup();
  app.listeners.click({ id: 1 });
  app.listeners.click({ id: 1 });
  app.listeners.click({ id: 2 });
  await app.settle();
  assert.equal(app.state["enabled:1"], false);
  assert.equal(app.state["enabled:2"], true);
  app.listeners.update(2, { status: "loading" });
  await app.settle();
  assert.equal(app.state["enabled:2"], undefined);
  assert.ok(app.calls.some(([name, args]) => name === "badge" && args.tabId === 2 && args.text === ""));
  app.listeners.remove(1);
  await app.settle();
  assert.equal(app.state["enabled:1"], undefined);
});

test("restricted pages do not get marked enabled", async () => {
  const app = setup();
  app.fail();
  app.listeners.click({ id: 1 });
  await app.settle();
  assert.equal(app.state["enabled:1"], undefined);
  assert.ok(app.calls.some(([name, args]) => name === "badge" && args.text === "!"));
});
