/**
 * Ponto único de acoplamento com o HTML da listagem de sugestões da Alura.
 * Se a Alura mudar o layout, é aqui que se ajusta primeiro — ver README
 * para o passo a passo de recalibração usando o DevTools.
 *
 * Estrutura DOM confirmada via HTML real (cursos.alura.com.br/suggestions):
 *
 * li.suggestions-item
 * ├── div.suggestions-requestInfo
 * │   └── a.suggestions-requestInfo-link
 * │       ├── img.suggestions-avatar
 * │       └── div.suggestions-requestInfo-user
 * │           ├── p.suggestions-requestInfo-user-name
 * │           └── p > time.suggestions-requestInfo-user-requestDate
 * ├── div.suggestions-requestSubject
 * │   └── a.suggestions-requestSubject-link (href="/suggestions/{id}?backToPage={page}&kind=")
 * │       ├── p.suggestions-requestSubject-title > strong
 * │       ├── p.suggestions-requestSubject-description
 * │       └── p.suggestions-kind
 * ├── div.suggestions-requestDiff
 * │   └── ul.suggestions-requestDiff-list
 * │       └── li.suggestions-requestDiff-item[.suggestions-requestDiff-item-red|.suggestions-requestDiff-item-green]
 * └── input.suggestion-discarded-checkbox[data-suggestion-id="{id}"]
 */
const AluraSelectors = (() => {
  function textOf(el) {
    return (el && (el.textContent || "")).trim();
  }

  function findSuggestionRows() {
    return Array.from(document.querySelectorAll("li.suggestions-item"));
  }

  /**
   * ID numérico da sugestão, extraído de data-suggestion-id no checkbox.
   * Preferencial para deduplicação — mais confiável que hash de texto.
   */
  function getRowSourceId(row) {
    const checkbox = row.querySelector("input.suggestion-discarded-checkbox[data-suggestion-id]");
    if (checkbox) {
      const id = checkbox.getAttribute("data-suggestion-id");
      if (id) return id;
    }
    const link = row.querySelector("a.suggestions-requestSubject-link");
    if (link) {
      const href = link.getAttribute("href") || "";
      const match = href.match(/\/suggestions\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  }

  /** URL absoluta da sugestão (para abrir na Alura). */
  function getRowLinkHref(row) {
    const link = row.querySelector("a.suggestions-requestSubject-link");
    if (!link) return window.location.href;
    return link.href;
  }

  function getRowDescription(row) {
    const el = row.querySelector(".suggestions-requestSubject-description");
    if (!el) return "";
    return textOf(el).replace(/^Descrição:\s*/, "");
  }

  /** Título do curso + atividade (ex.: "Enunciado da atividade do curso Java: ..."). */
  function getRowTitle(row) {
    const el = row.querySelector(".suggestions-requestSubject-title");
    return el ? textOf(el) : "";
  }

  function getRowCategory(row) {
    const el = row.querySelector(".suggestions-kind");
    return el ? textOf(el) : null;
  }

  /** Nome do autor da sugestão (pode ser null se a conta for privada). */
  function getRowAuthor(row) {
    const el = row.querySelector(".suggestions-requestInfo-user-name");
    return el ? textOf(el) : null;
  }

  /**
   * Informações de diff da listagem (visível na listagem, sem abrir detalhe).
   * Retorna { total: number, additions: number, deletions: number } ou null.
   * Ex.: "-55" → { total: -55, additions: 0, deletions: 55 }
   *      "+11" → { total: 11, additions: 11, deletions: 0 }
   */
  function getRowDiffInfo(row) {
    const items = row.querySelectorAll(".suggestions-requestDiff-item");
    if (!items.length) return null;
    let total = 0;
    let additions = 0;
    let deletions = 0;
    items.forEach((item) => {
      const num = parseInt(textOf(item), 10);
      if (Number.isNaN(num)) return;
      total += num;
      if (item.classList.contains("suggestions-requestDiff-item-green")) {
        additions += Math.abs(num);
      } else if (item.classList.contains("suggestions-requestDiff-item-red")) {
        deletions += Math.abs(num);
      }
    });
    return { total, additions, deletions };
  }

  const RELATIVE_UNIT_MS = {
    minuto: 60 * 1000,
    minutos: 60 * 1000,
    hora: 60 * 60 * 1000,
    horas: 60 * 60 * 1000,
    dia: 24 * 60 * 60 * 1000,
    dias: 24 * 60 * 60 * 1000,
    semana: 7 * 24 * 60 * 60 * 1000,
    semanas: 7 * 24 * 60 * 60 * 1000,
    mês: 30 * 24 * 60 * 60 * 1000,
    meses: 30 * 24 * 60 * 60 * 1000,
  };

  function parseRelativeAgeToMs(text) {
    const match = (text || "").match(
      /criad[oa]\s+(\d+)\s+(minutos?|horas?|dias?|semanas?|m[eê]s(?:es)?)\s+atr[áa]s/i
    );
    if (!match) return null;
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase().replace("mes", "mês");
    const unitMs = RELATIVE_UNIT_MS[unit];
    return unitMs ? amount * unitMs : null;
  }

  /** Epoch em ms de quando a sugestão foi criada; null se não conseguir determinar. */
  function getRowTimestamp(row) {
    const timeEl = row.querySelector("time.suggestions-requestInfo-user-requestDate, time");
    if (timeEl) {
      const datetimeAttr = timeEl.getAttribute("datetime");
      if (datetimeAttr) {
        const parsed = Date.parse(datetimeAttr);
        if (!Number.isNaN(parsed)) return parsed;
      }
      const relativeMs = parseRelativeAgeToMs(textOf(timeEl));
      if (relativeMs != null) return Date.now() - relativeMs;
    }
    const relativeMs = parseRelativeAgeToMs(textOf(row));
    return relativeMs != null ? Date.now() - relativeMs : null;
  }

  /** Número da página atual, extraído do parâmetro backToPage na URL. */
  function getPageNumber() {
    const match = window.location.search.match(/backToPage=(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  return {
    findSuggestionRows,
    getRowSourceId,
    getRowLinkHref,
    getRowDescription,
    getRowTitle,
    getRowCategory,
    getRowAuthor,
    getRowDiffInfo,
    getRowTimestamp,
    getPageNumber,
  };
})();
