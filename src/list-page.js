/**
 * Roda na página de listagem de sugestões. Só sinaliza, não muda nada:
 * - selo "🚩 Possível spam" quando a descrição bate com spam-detector.js;
 * - selo "🏷️ Categoria pode estar errada" (category-checker.js);
 * - selo "🔁 Texto repetido" quando a descrição é quase idêntica a outra
 *   nesta mesma página (duplicate-checker.js) — spam repetido ou aluno
 *   copiando a mesma reclamação em mais de uma atividade;
 * - destaque + selo "⏳ Aguardando há muito tempo" pra sugestões antigas,
 *   sem reordenar nada (não dá pra reordenar entre páginas diferentes);
 * - resumo no topo da lista com as contagens, pra visão geral rápida.
 * A decisão de aprovar/reprovar/descartar continua manual, usando os
 * próprios controles da Alura.
 */
(function () {
  const OLD_THRESHOLD_DAYS = 7;

  let summaryEl = null;

  function addBadge(row, variant, text, title) {
    const badge = document.createElement("span");
    badge.className = `alura-helper-badge alura-helper-badge--${variant}`;
    badge.textContent = text;
    badge.title = title;
    row.appendChild(badge);
  }

  function annotateRow(row, duplicateCount) {
    if (row.dataset.aluraChecked) return;
    row.dataset.aluraChecked = "1";

    const description = AluraSelectors.getRowDescription(row);
    const category = AluraSelectors.getRowCategory(row);

    const { score, reasons } = AluraSpamDetector.scoreSpam(description);
    if (score >= AluraSpamDetector.THRESHOLD) {
      row.dataset.aluraSpam = "1";
      addBadge(row, "spam", "🚩 Possível spam", reasons.join(", "));
    }

    const mismatch = AluraCategoryChecker.guessMismatch(description, category);
    if (mismatch) {
      row.dataset.aluraCategoryMismatch = "1";
      addBadge(
        row,
        "category",
        "🏷️ Categoria pode estar errada",
        `Descrição parece mais com "${mismatch.suspectedCategory}" do que com "${category}"`
      );
    }

    if (duplicateCount > 0) {
      row.dataset.aluraDuplicate = "1";
      addBadge(
        row,
        "duplicate",
        "🔁 Texto repetido",
        `Descrição quase idêntica a outra${duplicateCount > 1 ? `s ${duplicateCount}` : ""} sugestão${duplicateCount > 1 ? "ões" : ""} nesta página`
      );
    }

    const timestamp = AluraSelectors.getRowTimestamp(row);
    if (timestamp != null) {
      const ageDays = (Date.now() - timestamp) / (24 * 60 * 60 * 1000);
      if (ageDays >= OLD_THRESHOLD_DAYS) {
        row.dataset.aluraOld = "1";
        row.classList.add("alura-helper-row--old");
        addBadge(
          row,
          "old",
          "⏳ Aguardando há muito tempo",
          `Criada há aproximadamente ${Math.floor(ageDays)} dias`
        );
      }
    }
  }

  function updateSummary(rows) {
    if (rows.length === 0) return;

    if (!summaryEl || !document.body.contains(summaryEl)) {
      summaryEl = document.createElement("div");
      summaryEl.className = "alura-helper-summary";
      rows[0].parentElement.insertBefore(summaryEl, rows[0]);
    }

    const spamCount = rows.filter((row) => row.dataset.aluraSpam === "1").length;
    const mismatchCount = rows.filter((row) => row.dataset.aluraCategoryMismatch === "1").length;
    const duplicateCount = rows.filter((row) => row.dataset.aluraDuplicate === "1").length;
    const oldCount = rows.filter((row) => row.dataset.aluraOld === "1").length;

    const suggestionWord = rows.length === 1 ? "sugestão" : "sugestões";
    const possibleWord = spamCount === 1 ? "possível" : "possíveis";

    const parts = [`${rows.length} ${suggestionWord} nesta página`];
    if (spamCount > 0) parts.push(`${spamCount} ${possibleWord} spam`);
    if (mismatchCount > 0) parts.push(`${mismatchCount} com categoria talvez errada`);
    if (duplicateCount > 0) parts.push(`${duplicateCount} com texto repetido`);
    if (oldCount > 0) parts.push(`${oldCount} aguardando há mais de ${OLD_THRESHOLD_DAYS} dias`);

    summaryEl.textContent = parts.join(" · ");
  }

  function run() {
    const rows = AluraSelectors.findSuggestionRows();
    if (rows.length === 0) return;

    const descriptions = rows.map((row) => AluraSelectors.getRowDescription(row));
    const duplicateCounts = AluraDuplicateChecker.countSimilarMatches(descriptions);

    rows.forEach((row, index) => annotateRow(row, duplicateCounts[index]));
    updateSummary(rows);
  }

  function start() {
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
