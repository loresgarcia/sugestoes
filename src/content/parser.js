/**
 * Extrai dados de uma sugestão a partir de um <li.suggestions-item> do DOM.
 * Retorna um objeto compatível com o modelo Suggestion do contexto.
 * Não tem I/O — apenas leitura do DOM via selectors.
 */
const AluraParser = (() => {
  /**
   * Hash simples (djb2) para dedupHash quando sourceId não está disponível.
   * Não é criptográfico — só serve para comparar strings curtas.
   */
  function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return (hash >>> 0).toString(36);
  }

  /**
   * Parse de uma única row <li> em objeto Suggestion.
   * @param {HTMLLIElement} row
   * @returns {Object} Suggestion record
   */
  function parseRow(row) {
    const sourceId = AluraSelectors.getRowSourceId(row);
    const description = AluraSelectors.getRowDescription(row);
    const title = AluraSelectors.getRowTitle(row);
    const category = AluraSelectors.getRowCategory(row);
    const author = AluraSelectors.getRowAuthor(row);
    const timestamp = AluraSelectors.getRowTimestamp(row);
    const linkHref = AluraSelectors.getRowLinkHref(row);
    const diffInfo = AluraSelectors.getRowDiffInfo(row);
    const pageNumber = AluraSelectors.getPageNumber();
    const collectedAt = new Date().toISOString();

    const textForHash = `${title}||${description}`;
    const dedupHash = simpleHash(textForHash);

    return {
      sourceId,
      dedupHash,
      tipoNativo: category,
      titulo: title,
      descricao: description,
      criadoPor: author,
      urlOrigem: linkHref,
      createdAt: timestamp ? new Date(timestamp).toISOString() : null,
      collectedAt,
      pageNumber,
      diffInfo,
      triageScore: 0,
      triageLabel: "normal",
      flags: [],
      tagged: false,
    };
  }

  /**
   * Parse de múltiplas rows.
   * @param {HTMLLIElement[]} rows
   * @returns {Object[]} Array de Suggestion records
   */
  function parseRows(rows) {
    return rows.map(parseRow);
  }

  return { parseRow, parseRows, simpleHash };
})();
