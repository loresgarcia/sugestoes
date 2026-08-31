/**
 * Background service worker — Manifest V3.
 * Escuta mensagens do content script, mantém contadores,
 * e pode rodar cálculos pesados (dedup entre páginas, etc.).
 *
 * O service worker é descartado pelo Chrome após ~30s de inatividade
 * e reativado automaticamente quando necessário (mensagem, alarme, etc.).
 */

const COUNTERS_KEY = "alura_helper_counters";

/**
 * Contadores persistidos (novos, duplicados, erros de parsing, etc.).
 */
async function getCounters() {
  return new Promise((resolve) => {
    chrome.storage.local.get(COUNTERS_KEY, (result) => {
      resolve(result[COUNTERS_KEY] || { processed: 0, duplicates: 0, errors: 0, lastRun: null });
    });
  });
}

async function updateCounters(patch) {
  const current = await getCounters();
  const updated = { ...current, ...patch, lastRun: new Date().toISOString() };
  return new Promise((resolve) => {
    chrome.storage.local.set({ [COUNTERS_KEY]: updated }, resolve);
  });
}

async function incrementCounter(field, amount = 1) {
  const current = await getCounters();
  current[field] = (current[field] || 0) + amount;
  current.lastRun = new Date().toISOString();
  return new Promise((resolve) => {
    chrome.storage.local.set({ [COUNTERS_KEY]: current }, resolve);
  });
}

/**
 * Mensageria com content scripts e popup.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "COUNTERS_UPDATE") {
    incrementCounter(message.field, message.amount || 1).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "GET_COUNTERS") {
    getCounters().then((counters) => {
      sendResponse({ counters });
    });
    return true;
  }

  if (message.type === "GET_STATS") {
    getCounters().then((counters) => {
      sendResponse({ counters });
    });
    return true;
  }

  if (message.type === "REPROCESS") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "REPROCESS" });
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});

/**
 * Atualiza badge do ícone com contagem de sugestões urgentes.
 */
async function updateBadge() {
  try {
    const items = await new Promise((resolve) => {
      chrome.storage.local.get(null, resolve);
    });

    const suggestions = Object.keys(items)
      .filter((k) => k.startsWith("suggestion_") && k !== "alura_helper_counters")
      .map((k) => items[k]);

    const urgent = suggestions.filter(
      (s) => s.triageScore >= 70 || (s.flags || []).includes("spam")
    ).length;

    if (urgent > 0) {
      chrome.action.setBadgeText({ text: String(urgent) });
      chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (e) {
    // Ignora erros silenciosamente (service worker pode estar sem contexto de aba)
  }
}

chrome.storage.onChanged.addListener((changes) => {
  const hasSuggestionChanges = Object.keys(changes).some((k) => k.startsWith("suggestion_"));
  if (hasSuggestionChanges) {
    updateBadge();
  }
});
