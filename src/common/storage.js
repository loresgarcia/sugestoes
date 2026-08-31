/**
 * Wrapper para chrome.storage.local — persiste sugestões triadas entre sessões.
 * Cada sugestão é salva com chave "suggestion_{sourceId}" para deduplicação robusta.
 * Fallback: "suggestion_hash_{dedupHash}" quando sourceId não está disponível.
 *
 * Requer permission "storage" no manifest.json.
 */
const AluraStorage = (() => {
  const STORAGE_PREFIX = "suggestion_";
  const STATS_KEY = "alura_helper_stats";

  function isAvailable() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  function storageKey(sourceId, dedupHash) {
    if (sourceId) return `${STORAGE_PREFIX}${sourceId}`;
    return `${STORAGE_PREFIX}hash_${dedupHash}`;
  }

  /**
   * Upsert de uma sugestão no storage.
   * Se já existe (mesmo sourceId ou hash), sobrescreve com dados atualizados.
   * Retorna Promise<void>.
   */
  async function upsert(suggestion) {
    if (!isAvailable()) return;
    const key = storageKey(suggestion.sourceId, suggestion.dedupHash);
    const existing = await getRaw(key);
    const record = {
      ...suggestion,
      firstSeenAt: existing ? existing.firstSeenAt : suggestion.collectedAt,
      updatedAt: suggestion.collectedAt,
    };
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: record }, resolve);
    });
  }

  /**
   * Busca sugestão por sourceId (preferencial) ou dedupHash.
   * Retorna Promise<Suggestion|null>.
   */
  async function getBySourceId(sourceId) {
    if (!isAvailable() || !sourceId) return null;
    return getRaw(`${STORAGE_PREFIX}${sourceId}`);
  }

  async function getByHash(dedupHash) {
    if (!isAvailable() || !dedupHash) return null;
    return getRaw(`${STORAGE_PREFIX}hash_${dedupHash}`);
  }

  async function getRaw(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null);
      });
    });
  }

  /**
   * Retorna todas as sugestões salvas (para popup / listagem consolidada).
   * Retorna Promise<Suggestion[]>.
   */
  async function getAll() {
    if (!isAvailable()) return [];
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const suggestions = Object.keys(items)
          .filter((k) => k.startsWith(STORAGE_PREFIX) && k !== STATS_KEY)
          .map((k) => items[k]);
        suggestions.sort((a, b) => {
          const scoreA = (a.triageScore || 0);
          const scoreB = (b.triageScore || 0);
          return scoreB - scoreA;
        });
        resolve(suggestions);
      });
    });
  }

  /**
   * Retorna sugestões filtradas.
   * @param {Object} filters - { triageLabel, tipoNativo, minScore, maxScore }
   */
  async function getFiltered(filters = {}) {
    const all = await getAll();
    return all.filter((s) => {
      if (filters.triageLabel && s.triageLabel !== filters.triageLabel) return false;
      if (filters.tipoNativo && s.tipoNativo !== filters.tipoNativo) return false;
      if (filters.minScore != null && (s.triageScore || 0) < filters.minScore) return false;
      if (filters.maxScore != null && (s.triageScore || 0) > filters.maxScore) return false;
      return true;
    });
  }

  /**
   * Contadores agregados (para popup e badge do ícone).
   * Retorna Promise<{ total, spam, categoryMismatch, duplicate, old }>.
   */
  async function getStats() {
    const all = await getAll();
    return {
      total: all.length,
      spam: all.filter((s) => (s.flags || []).includes("spam")).length,
      categoryMismatch: all.filter((s) => (s.flags || []).includes("category_mismatch")).length,
      duplicate: all.filter((s) => (s.flags || []).includes("duplicate")).length,
      old: all.filter((s) => (s.flags || []).includes("old")).length,
    };
  }

  /**
   * Limpa todas as sugestões salvas (útil para debug).
   */
  async function clearAll() {
    if (!isAvailable()) return;
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const keysToRemove = Object.keys(items).filter(
          (k) => k.startsWith(STORAGE_PREFIX)
        );
        chrome.storage.local.remove(keysToRemove, resolve);
      });
    });
  }

  return {
    isAvailable,
    upsert,
    getBySourceId,
    getByHash,
    getAll,
    getFiltered,
    getStats,
    clearAll,
  };
})();
