/**
 * Popup script — lista consolidada e filtrável de sugestões processadas.
 * Lê dados do chrome.storage.local (mesmo storage usado pelo content script).
 */
(function () {
  const STORAGE_PREFIX = "suggestion_";
  const COUNTERS_KEY = "alura_helper_counters";

  const els = {
    list: document.getElementById("suggestion-list"),
    statsBar: document.getElementById("stats-bar"),
    statTotal: document.getElementById("stat-total"),
    statSpam: document.getElementById("stat-spam"),
    statCategory: document.getElementById("stat-category"),
    statDuplicate: document.getElementById("stat-duplicate"),
    statOld: document.getElementById("stat-old"),
    filterLabel: document.getElementById("filter-label"),
    filterCategory: document.getElementById("filter-category"),
    filterFlag: document.getElementById("filter-flag"),
    filteredCount: document.getElementById("filtered-count"),
    btnReprocess: document.getElementById("btn-reprocess"),
    btnClear: document.getElementById("btn-clear"),
  };

  let allSuggestions = [];

  function storageAvailable() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  async function loadSuggestions() {
    if (!storageAvailable()) return [];
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const suggestions = Object.keys(items)
          .filter((k) => k.startsWith(STORAGE_PREFIX) && k !== COUNTERS_KEY)
          .map((k) => items[k]);
        suggestions.sort((a, b) => (b.triageScore || 0) - (a.triageScore || 0));
        resolve(suggestions);
      });
    });
  }

  function updateStats(suggestions) {
    const total = suggestions.length;
    const spam = suggestions.filter((s) => (s.flags || []).includes("spam")).length;
    const categoryMismatch = suggestions.filter((s) =>
      (s.flags || []).includes("category_mismatch")
    ).length;
    const duplicate = suggestions.filter((s) => (s.flags || []).includes("duplicate")).length;
    const old = suggestions.filter((s) => (s.flags || []).includes("old")).length;

    const word = total === 1 ? "sugestao" : "sugestoes";
    els.statTotal.textContent = `${total} ${word}`;
    els.statSpam.textContent = `${spam} spam`;
    els.statCategory.textContent = `${categoryMismatch} categoria`;
    els.statDuplicate.textContent = `${duplicate} repetido`;
    els.statOld.textContent = `${old} antiga`;
  }

  function applyFilters(suggestions) {
    const labelFilter = els.filterLabel.value;
    const categoryFilter = els.filterCategory.value;
    const flagFilter = els.filterFlag.value;

    return suggestions.filter((s) => {
      if (labelFilter && s.triageLabel !== labelFilter) return false;
      if (categoryFilter && s.tipoNativo !== categoryFilter) return false;
      if (flagFilter && !(s.flags || []).includes(flagFilter)) return false;
      return true;
    });
  }

  function renderSuggestions(suggestions) {
    if (suggestions.length === 0) {
      els.list.innerHTML = '<p class="empty-state">Nenhuma sugestao encontrada com esses filtros.</p>';
      els.filteredCount.textContent = "0 resultados";
      return;
    }

    els.list.innerHTML = "";
    els.filteredCount.textContent = `${suggestions.length} resultado${suggestions.length !== 1 ? "s" : ""}`;

    suggestions.forEach((s) => {
      const card = document.createElement("div");
      card.className = "suggestion-card";

      const score = s.triageScore || 0;
      if (score >= 70) card.classList.add("suggestion-card--high");
      else if (score >= 40) card.classList.add("suggestion-card--medium");
      else card.classList.add("suggestion-card--low");

      const title = s.titulo || s.descricao || "Sem titulo";
      const desc = s.descricao || "";
      const author = s.criadoPor || "Desconhecido";
      const category = s.tipoNativo || "";

      let badgesHtml = "";
      (s.flags || []).forEach((flag) => {
        const labels = {
          spam: "Spam",
          category_mismatch: "Categoria",
          duplicate: "Repetido",
          old: "Antiga",
        };
        badgesHtml += `<span class="suggestion-card-badge suggestion-card-badge--${flag}">${labels[flag] || flag}</span>`;
      });

      card.innerHTML = `
        <div class="suggestion-card-header">
          <span class="suggestion-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
          <span class="suggestion-card-score">${score}/100</span>
        </div>
        <div class="suggestion-card-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div>
        <div class="suggestion-card-meta">
          ${badgesHtml}
          <span class="suggestion-card-badge" style="background:#f1f5f9;color:#475569">${escapeHtml(category)}</span>
          <span class="suggestion-card-badge" style="background:#f1f5f9;color:#64748b">${escapeHtml(author)}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        if (s.urlOrigem) {
          chrome.tabs.create({ url: s.urlOrigem });
        }
      });

      els.list.appendChild(card);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function refresh() {
    allSuggestions = await loadSuggestions();
    updateStats(allSuggestions);
    const filtered = applyFilters(allSuggestions);
    renderSuggestions(filtered);
  }

  els.filterLabel.addEventListener("change", refresh);
  els.filterCategory.addEventListener("change", refresh);
  els.filterFlag.addEventListener("change", refresh);

  els.btnReprocess.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "REPROCESS" });
    setTimeout(refresh, 500);
  });

  els.btnClear.addEventListener("click", async () => {
    if (!storageAvailable()) return;
    chrome.storage.local.get(null, (items) => {
      const keys = Object.keys(items).filter(
        (k) => k.startsWith(STORAGE_PREFIX) || k === COUNTERS_KEY
      );
      chrome.storage.local.remove(keys, () => {
        refresh();
      });
    });
  });

  refresh();
})();
