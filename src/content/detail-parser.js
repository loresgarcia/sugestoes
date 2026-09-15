/**
 * Extrai dados completos de uma sugestão a partir da página de detalhe.
 * Diferente do parser da listagem (que lê cards <li>), este lê os textareas
 * .changed e .original que contêm o texto integral da sugestão.
 * Só retorna dados se estivermos efetivamente numa página de detalhe.
 */
const AluraDetailParser = (() => {
  /**
   * Estima as informações de diff entre dois textos completos usando o
   * prefixo e sufixo comuns (sem custo de Levenshtein). Ignora a "massa
   * inalterada" no meio e conta apenas o que foi removido/adicionado na
   * região alterada. Suficiente para detectar o padrão de spam em que o
   * aluno apaga quase todo o texto.
   * @param {string} original
   * @param {string} changed
   * @returns {{ total: number, additions: number, deletions: number }}
   */
  function estimateDiffInfo(original, changed) {
    const o = original || "";
    const c = changed || "";
    let prefix = 0;
    while (prefix < o.length && prefix < c.length && o[prefix] === c[prefix]) {
      prefix++;
    }
    let suffix = 0;
    while (
      suffix < o.length - prefix &&
      suffix < c.length - prefix &&
      o[o.length - 1 - suffix] === c[c.length - 1 - suffix]
    ) {
      suffix++;
    }
    const deletions = o.length - prefix - suffix;
    const additions = c.length - prefix - suffix;
    return { total: additions - deletions, additions, deletions };
  }

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
      diffInfo: estimateDiffInfo(originalText, changedText),
    };
  }

  return { parse, estimateDiffInfo };
})();
