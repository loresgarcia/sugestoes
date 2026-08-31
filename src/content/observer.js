/**
 * MutationObserver isolado para detectar novos cards de sugestão.
 * Emite callback quando novos li.suggestions-item aparecem no DOM.
 * Com debounce para evitar processamento excessivo durante renderização.
 */
const AluraObserver = (() => {
  let observer = null;
  let debounceTimer = null;
  let lastProcessedCount = 0;

  /**
   * Inicia observação do DOM.
   * @param {Function} onNewNodes - Callback chamado com array de novos nodes detectados.
   * @param {Object} [options]
   * @param {number} [options.debounceMs=150] - Delay do debounce em ms.
   */
  function start(onNewNodes, options = {}) {
    const debounceMs = options.debounceMs || 150;

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          hasNewNodes = true;
          break;
        }
      }
      if (!hasNewNodes) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const currentRows = AluraSelectors.findSuggestionRows();
        if (currentRows.length > lastProcessedCount) {
          const newRows = currentRows.slice(lastProcessedCount);
          lastProcessedCount = currentRows.length;
          onNewNodes(newRows);
        }
      }, debounceMs);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const initialRows = AluraSelectors.findSuggestionRows();
    lastProcessedCount = initialRows.length;
    if (initialRows.length > 0) {
      onNewNodes(initialRows);
    }
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearTimeout(debounceTimer);
    lastProcessedCount = 0;
  }

  function reset() {
    lastProcessedCount = 0;
  }

  return { start, stop, reset };
})();
