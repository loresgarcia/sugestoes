/**
 * Orquestrador da página de detalhe de uma sugestão.
 * Roda uma vez na carga da página — sem MutationObserver, sem injeção de badges.
 * Extrai o texto completo dos textareas, recalcula a triagem e atualiza o storage.
 *
 * Módulos utilizados:
 *   - AluraSelectors    (src/common/selectors.js)
 *   - AluraSpamDetector (src/common/spam-detector.js)
 *   - AluraTriage       (src/common/triage.js)
 *   - AluraStorage      (src/common/storage.js)
 *   - AluraDetailParser (src/content/detail-parser.js)
 *   - AluraIdentity     (src/common/identity.js)
 *   - AluraPresence     (src/common/presence.js)
 */
(function () {
  function showOccupiedBanner(viewer) {
    const wrapper = document.querySelector(".editorWrapper");
    if (!wrapper) return;

    const banner = document.createElement("div");
    banner.className = "alura-presence-banner";
    banner.textContent = `⚠️ ${viewer.nome} já está revisando esta sugestão agora.`;
    wrapper.insertBefore(banner, wrapper.firstChild);
  }

  async function setupPresence(sourceId) {
    const [nome, clientId] = await Promise.all([
      AluraIdentity.getName(),
      AluraIdentity.getClientId(),
    ]);

    const viewer = await AluraPresence.checkViewer(sourceId, clientId);
    if (viewer) showOccupiedBanner(viewer);

    AluraPresence.announce(sourceId, nome, clientId);
  }

  async function processDetailPage() {
    const data = AluraDetailParser.parse();
    if (!data || !data.sourceId) return;

    setupPresence(data.sourceId);

    const existing = await AluraStorage.getBySourceId(data.sourceId);

    const triageResult = AluraTriage.triage({
      description: data.changedText,
      category: data.category,
      timestamp: existing
        ? new Date(existing.createdAt).getTime()
        : null,
      duplicateCount: existing ? (existing.duplicateCount || 0) : 0,
      diffInfo: data.diffInfo,
    });

    const suggestion = Object.assign({}, existing || {}, {
      sourceId: data.sourceId,
      descricao: data.changedText,
      trechoOriginal: data.originalText,
      trechoSugerido: data.changedText,
      diffInfo: data.diffInfo,
      tipoNativo: data.category || (existing && existing.tipoNativo) || null,
      criadoPor: data.author || (existing && existing.criadoPor) || null,
      triageScore: triageResult.score,
      triageLabel: triageResult.label,
      flags: triageResult.flags,
      breakdown: Object.assign({}, triageResult.breakdown, {
        description: data.changedText,
      }),
    });

    await AluraStorage.upsert(suggestion);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processDetailPage);
  } else {
    processDetailPage();
  }
})();
