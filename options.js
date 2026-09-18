const $ = (id) => document.getElementById(id);
let saveQueue = Promise.resolve();
let readRevision = 0;

function preview() {
  const background = Number($("background").value);
  const text = Number($("text").value);
  $("background-value").textContent = Math.round(background / 255 * 100) + "%";
  $("text-value").textContent = Math.round(text / 255 * 100) + "%";
  $("preview").style.backgroundColor = `rgb(${background}, ${background}, ${background})`;
  $("preview").style.color = `rgb(${text}, ${text}, ${text})`;
}

async function load() {
  const revision = ++readRevision;
  const settings = await chrome.storage.local.get(null);
  if (revision !== readRevision) return;
  const mode = settings.mode === "global" ? "global" : "site";
  document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
  $("global-control").hidden = mode !== "global";
  $("global-enabled").checked = Boolean(settings.globalEnabled);
  $("mode-description").textContent = mode === "global"
    ? "The toolbar button turns Nightfall on or off for all websites. Your per-site choices are kept for later."
    : "The toolbar button remembers your choice for this website across tabs and visits. Each subdomain has its own choice.";
  const appearance = Nightfall.appearance(settings);
  $("background").value = appearance.background;
  $("text").value = appearance.text;
  preview();
}

function save(values) {
  ++readRevision;
  $("status").textContent = "Saving…";
  saveQueue = saveQueue.catch(() => {}).then(() => chrome.storage.local.set(values));
  const current = saveQueue;
  void current.then(async () => {
    if (current !== saveQueue) return;
    $("status").textContent = "Saved";
    await load();
  }).catch(() => { $("status").textContent = "Could not save. Please try again."; });
}

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", () => save({ mode: input.value }));
});
$("global-enabled").addEventListener("change", () => save({ globalEnabled: $("global-enabled").checked }));
for (const id of ["background", "text"]) {
  $(id).addEventListener("input", () => { preview(); save({ [id]: Number($(id).value) }); });
}
$("reset").addEventListener("click", () => save({ background: Nightfall.defaults.background, text: Nightfall.defaults.text }));
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") void saveQueue.catch(() => {}).then(load);
});
void load();
