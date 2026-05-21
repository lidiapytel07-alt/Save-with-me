const STORAGE_KEY = "savings-app-state-v1";
const SYNC_INTERVAL_MS = 30000;

const state = loadState();
let editingId = null;
let syncTimer = null;
let syncSaveTimer = null;

const form = document.querySelector("#savingForm");
const goalForm = document.querySelector("#goalForm");
const list = document.querySelector("#savingsList");
const template = document.querySelector("#savingTemplate");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const submitButton = document.querySelector("#submitButton");
const cancelEdit = document.querySelector("#cancelEdit");
const nameInput = document.querySelector("#nameInput");
const amountInput = document.querySelector("#amountInput");
const placeInput = document.querySelector("#placeInput");
const categoryInput = document.querySelector("#categoryInput");
const syncForm = document.querySelector("#syncForm");
const syncStatus = document.querySelector("#syncStatus");
const syncUrlInput = document.querySelector("#syncUrlInput");
const syncKeyInput = document.querySelector("#syncKeyInput");
const syncVaultInput = document.querySelector("#syncVaultInput");

const formatMoney = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

applyTheme();
document.querySelector("#goalInput").value = state.goal ? String(state.goal).replace(".", ",") : "";
syncUrlInput.value = state.sync.url;
syncKeyInput.value = state.sync.anonKey;
syncVaultInput.value = state.sync.vaultId;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const amount = parseAmount(data.get("amount"));
  const name = String(data.get("name") || "").trim();

  if (!name || amount <= 0) {
    showFormHint();
    return;
  }

  const item = {
    id: editingId || crypto.randomUUID(),
    name,
    amount,
    place: String(data.get("place") || "Bez miejsca").trim() || "Bez miejsca",
    category: String(data.get("category") || "Inne"),
    updatedAt: new Date().toISOString(),
  };

  if (editingId) {
    state.items = state.items.map((current) => (current.id === editingId ? item : current));
  } else {
    state.items.unshift(item);
  }

  resetForm();
  persistAndRender({ sync: true });
});

document.querySelector("#goalSubmit").addEventListener("click", () => {
  state.goal = Math.max(0, parseAmount(document.querySelector("#goalInput").value));
  persistAndRender({ sync: true });
});

searchInput.addEventListener("input", render);

cancelEdit.addEventListener("click", resetForm);

document.querySelector("#themeToggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  persistAndRender({ sync: true });
});

syncForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await synchronize();
});

document.querySelector("#exportButton").addEventListener("click", () => {
  const payload = JSON.stringify(exportSharedData(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "moje-oszczednosci.json";
  anchor.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#importInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    state.items = Array.isArray(imported.items) ? imported.items.filter(isValidItem) : state.items;
    state.goal = Number(imported.goal) || 0;
    state.theme = imported.theme === "dark" ? "dark" : "light";
    applyTheme();
    document.querySelector("#goalInput").value = state.goal ? String(state.goal).replace(".", ",") : "";
    persistAndRender({ sync: true });
  } catch {
    alert("Nie udalo sie wczytac pliku. Sprawdz, czy to poprawny eksport JSON.");
  } finally {
    event.target.value = "";
  }
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = state.items.find((current) => current.id === button.closest(".saving-item").dataset.id);
  if (!item) return;

  if (button.dataset.action === "delete") {
    state.items = state.items.filter((current) => current.id !== item.id);
    persistAndRender({ sync: true });
    return;
  }

  editingId = item.id;
  nameInput.value = item.name;
  amountInput.value = String(item.amount).replace(".", ",");
  placeInput.value = item.place;
  categoryInput.value = item.category;
  submitButton.textContent = "Zapisz zmiany";
  cancelEdit.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

render();
startSyncTimer();
if (hasSyncConfig()) {
  synchronize({ quiet: true });
}

function render() {
  const filteredItems = getFilteredItems();
  const total = state.items.reduce((sum, item) => sum + item.amount, 0);
  const biggest = state.items.reduce((max, item) => (item.amount > (max?.amount || 0) ? item : max), null);
  const average = state.items.length ? total / state.items.length : 0;

  document.querySelector("#totalSavings").textContent = formatMoney.format(total);
  document.querySelector("#itemsCount").textContent = pluralize(state.items.length);
  document.querySelector("#biggestItem").textContent = biggest ? `${biggest.name}: ${formatMoney.format(biggest.amount)}` : "-";
  document.querySelector("#averageItem").textContent = formatMoney.format(average);

  renderGoal(total);
  renderCategories();
  renderList(filteredItems);
}

function renderGoal(total) {
  const goal = Number(state.goal) || 0;
  const percent = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;

  document.querySelector("#goalLabel").textContent = goal
    ? `${formatMoney.format(total)} z ${formatMoney.format(goal)}`
    : "Cel nieustawiony";
  document.querySelector("#goalPercent").textContent = `${percent}%`;
  document.querySelector("#goalProgress").style.width = `${percent}%`;
}

function renderCategories() {
  const container = document.querySelector("#categoryStrip");
  const totals = state.items.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + item.amount;
    return result;
  }, {});

  container.innerHTML = "";
  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount]) => {
      const pill = document.createElement("div");
      pill.className = "category-pill";
      pill.innerHTML = `<span>${escapeHtml(category)}</span><strong>${formatMoney.format(amount)}</strong>`;
      container.append(pill);
    });
}

function renderList(items) {
  list.innerHTML = "";
  emptyState.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.id = item.id;
    row.querySelector("h3").textContent = item.name;
    row.querySelector("p").textContent = `${item.place} - ${item.category}`;
    row.querySelector(".amount-pill").textContent = formatMoney.format(item.amount);
    list.append(row);
  });
}

function getFilteredItems() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return state.items;

  return state.items.filter((item) =>
    [item.name, item.place, item.category].some((value) => value.toLowerCase().includes(query)),
  );
}

function parseAmount(value) {
  return Number(String(value || "").replace(/\s/g, "").replace(",", ".")) || 0;
}

function pluralize(count) {
  if (count === 1) return "1 pozycja";
  if (count > 1 && count < 5) return `${count} pozycje`;
  return `${count} pozycji`;
}

function showFormHint() {
  document.querySelector("#amountInput").focus();
  document.querySelector("#amountInput").setCustomValidity("Podaj kwote wieksza od zera.");
  document.querySelector("#amountInput").reportValidity();
  document.querySelector("#amountInput").setCustomValidity("");
}

function resetForm() {
  editingId = null;
  form.reset();
  submitButton.textContent = "Dodaj oszczednosc";
  cancelEdit.hidden = true;
}

function persistAndRender(options = {}) {
  saveState();
  render();
  if (options.sync) {
    scheduleSyncToCloud();
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.items)) {
      return {
        items: saved.items.filter(isValidItem),
        goal: Number(saved.goal) || 0,
        theme: saved.theme === "dark" ? "dark" : "light",
        sync: normalizeSync(saved.sync),
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    goal: 0,
    theme: "light",
    sync: emptySync(),
    items: [
      {
        id: crypto.randomUUID(),
        name: "Konto oszczednosciowe",
        amount: 4200,
        place: "Bank",
        category: "Poduszka finansowa",
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Lokata kwartalna",
        amount: 3000,
        place: "Lokata",
        category: "Lokaty",
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function startSyncTimer() {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  updateSyncStatus(hasSyncConfig() ? "polaczono" : "lokalnie");

  if (hasSyncConfig()) {
    syncTimer = setInterval(() => syncFromCloud({ pushIfEmpty: false, quiet: true }), SYNC_INTERVAL_MS);
  }
}

function scheduleSyncToCloud() {
  if (!hasSyncConfig()) return;
  updateSyncStatus("zapisuje...");
  clearTimeout(syncSaveTimer);
  syncSaveTimer = setTimeout(() => syncToCloud({ quiet: true }), 600);
}

async function synchronize(options = {}) {
  state.sync = {
    url: normalizeUrl(syncUrlInput.value),
    anonKey: syncKeyInput.value.trim(),
    vaultId: syncVaultInput.value.trim(),
  };
  saveState();

  if (!hasSyncConfig()) {
    updateSyncStatus("uzupelnij dane");
    startSyncTimer();
    return;
  }

  await syncFromCloud({ pushIfEmpty: true, quiet: options.quiet });
  startSyncTimer();
}

async function syncFromCloud(options = {}) {
  if (!hasSyncConfig()) {
    updateSyncStatus("brak konfiguracji");
    return;
  }

  try {
    updateSyncStatus(options.quiet ? "polaczono" : "pobieram...");
    const response = await fetch(buildSupabaseUrl("select"), {
      headers: supabaseHeaders(),
    });

    if (!response.ok) throw new Error(await getResponseError(response, "pobieranie"));
    const rows = await response.json();
    const remoteData = rows[0]?.data;

    if (remoteData && Array.isArray(remoteData.items)) {
      applyRemoteData(remoteData);
      saveState();
      render();
      updateSyncStatus("zsynchronizowano");
      return;
    }

    if (options.pushIfEmpty) {
      await syncToCloud();
      return;
    }

    updateSyncStatus("brak danych");
  } catch (error) {
    updateSyncStatus(error.message || "blad sync");
  }
}

async function syncToCloud(options = {}) {
  if (!hasSyncConfig()) {
    updateSyncStatus("brak konfiguracji");
    return;
  }

  try {
    if (!options.quiet) updateSyncStatus("wysylam...");
    const response = await fetch(buildSupabaseUrl("upsert"), {
      method: "POST",
      headers: supabaseHeaders({ write: true }),
      body: JSON.stringify({
        vault_id: state.sync.vaultId,
        data: exportSharedData(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error(await getResponseError(response, "zapis"));
    updateSyncStatus("zsynchronizowano");
  } catch (error) {
    updateSyncStatus(error.message || "blad sync");
  }
}

function applyRemoteData(data) {
  state.items = Array.isArray(data.items) ? data.items.filter(isValidItem) : state.items;
  state.goal = Number(data.goal) || 0;
  state.theme = data.theme === "dark" ? "dark" : "light";
  applyTheme();
  document.querySelector("#goalInput").value = state.goal ? String(state.goal).replace(".", ",") : "";
}

function exportSharedData() {
  return {
    items: state.items,
    goal: state.goal,
    theme: state.theme,
    updatedAt: new Date().toISOString(),
  };
}

function buildSupabaseUrl(mode) {
  const base = normalizeUrl(state.sync.url);
  const table = "savings_states";
  if (mode === "select") {
    return `${base}/rest/v1/${table}?vault_id=eq.${encodeURIComponent(state.sync.vaultId)}&select=data,updated_at&limit=1`;
  }
  return `${base}/rest/v1/${table}?on_conflict=vault_id`;
}

function supabaseHeaders(options = {}) {
  const headers = {
    Accept: "application/json",
    apikey: state.sync.anonKey,
    Authorization: `Bearer ${state.sync.anonKey}`,
  };

  if (options.write) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "resolution=merge-duplicates,return=minimal";
  }

  return headers;
}

async function getResponseError(response, action) {
  let details = "";

  try {
    const text = await response.text();
    details = text ? `: ${text.slice(0, 80)}` : "";
  } catch {
    details = "";
  }

  return `blad ${response.status} ${action}${details}`;
}

function hasSyncConfig() {
  return Boolean(state.sync.url && state.sync.anonKey && state.sync.vaultId);
}

function normalizeSync(sync) {
  return {
    url: normalizeUrl(sync?.url || ""),
    anonKey: String(sync?.anonKey || ""),
    vaultId: String(sync?.vaultId || ""),
  };
}

function emptySync() {
  return {
    url: "",
    anonKey: "",
    vaultId: "",
  };
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function updateSyncStatus(message) {
  syncStatus.textContent = message;
}

function applyTheme() {
  document.body.dataset.theme = state.theme === "dark" ? "dark" : "light";
  document.querySelector("#themeLabel").textContent = state.theme === "dark" ? "Light" : "Dark";
}

function isValidItem(item) {
  return Boolean(item && item.id && item.name && Number(item.amount) >= 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[character];
  });
}
