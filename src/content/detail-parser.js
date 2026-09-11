/**
 * Extrai dados completos de uma sugestão a partir da página de detalhe.
 * Diferente do parser da listagem (que lê cards <li>), este lê os textareas
 * .changed e .original que contêm o texto integral da sugestão.
 * Só retorna dados se estivermos efetivamente numa página de detalhe.
 */
const AluraDetailParser = (() => {
  /**
   * Extrai todos os dados disponíveis na página de detalhe.
   * @returns {Object|null} Objeto com os campos extraídos, ou null se não
   *   estivermos numa página de detalhe.
   */
  function parse() {
    if (!AluraSelectors.isDetailPage()) return null;

    const sourceId = AluraSelectors.getDetailSourceId();
    const changedText = AluraSelectors.getDetailChangedText();
    const originalText = AluraSelectors.getDetailOriginalText();
    const category = AluraSelectors.getDetailCategory();
    const author = AluraSelectors.getDetailAuthor();

    if (!sourceId) return null;

    return {
      sourceId,
      changedText,
      originalText,
      category,
      author,
    };
  }

  return { parse };
})();
