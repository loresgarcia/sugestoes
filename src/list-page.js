/**
 * Orquestrador principal — roda na página de listagem de sugestões.
 * Fluxo: observer detecta cards → parser extrai dados → triage calcula score →
 *        storage persiste → injector injeta badges + resumo.
 *
 * Módulos utilizados:
 *   - AluraSelectors   (src/common/selectors.js)
 *   - AluraSpamDetector (src/common/spam-detector.js)
 *   - AluraCategoryChecker (src/common/category-checker.js)
 *   - AluraDuplicateChecker (src/common/duplicate-checker.js)
 *   - AluraTriage       (src/common/triage.js)
 *   - AluraStorage      (src/common/storage.js)
 *   - AluraObserver     (src/content/observer.js)
 *   - AluraParser       (src/content/parser.js)
 *   - AluraInjector     (src/content/injector.js)
 */
(function () {
  /**
   * Processa um batch de rows: parse → duplicate count → triage → inject.
   */
  async function processRows(rows) {
    const suggestions = AluraParser.parseRows(rows);

    const descriptions = suggestions.map((s) => s.descricao);
    const duplicateCounts = AluraDuplicateChecker.countSimilarMatches(descriptions);

    const stats = { total: 0, spam: 0, categoryMismatch: 0, duplicate: 0, old: 0 };

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      s.duplicateCount = duplicateCounts[i];

      const result = AluraTriage.triage({
        description: s.descricao,
        category: s.tipoNativo,
        timestamp: s.createdAt ? new Date(s.createdAt).getTime() : null,
        duplicateCount: duplicateCounts[i],
      });

      s.triageScore = result.score;
      s.triageLabel = result.label;
      s.flags = result.flags;
      s.breakdown = result.breakdown;
      s.breakdown.description = s.descricao;

      await AluraStorage.upsert(s);

      AluraInjector.injectBadges(rows[i], s);

      stats.total++;
      if (result.flags.includes("spam")) stats.spam++;
      if (result.flags.includes("category_mismatch")) stats.categoryMismatch++;
      if (result.flags.includes("duplicate")) stats.duplicate++;
      if (result.flags.includes("old")) stats.old++;
    }

    AluraInjector.injectSummary(rows, stats);
  }

  function start() {
    AluraObserver.start(processRows, { debounceMs: 200 });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
