/**
 * Ponto único de acoplamento com o HTML da listagem de sugestões da Alura.
 * Se a Alura mudar o layout, é aqui que se ajusta primeiro — ver README
 * para o passo a passo de recalibração usando o DevTools.
 *
 * Confirmado via inspeção manual da página real:
 *
 * li.suggestions-item
 * ├── div.suggestions-requestInfo
 * │   └── a.suggestions-requestInfo-link
 * │       └── div.suggestions-requestInfo-user
 * │           └── p > time.suggestions-requestInfo-user-requestDate
 * └── div.suggestions-requestSubject
 *     └── a.suggestions-requestSubject-link
 *         ├── p.suggestions-requestSubject-title
 *         ├── p.suggestions-requestSubject-description
 *         └── p.suggestions-kind
 */
const AluraSelectors = (() => {
  function textOf(el) {
    return (el && (el.textContent || "")).trim();
  }

  function findSuggestionRows() {
    return Array.from(document.querySelectorAll("li.suggestions-item"));
  }

  function getRowDescription(row) {
    const el = row.querySelector(".suggestions-requestSubject-description");
    if (!el) return "";
    return textOf(el).replace(/^Descrição:\s*/, "");
  }

  function getRowCategory(row) {
    const el = row.querySelector(".suggestions-kind");
    return el ? textOf(el) : null;
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

  return { findSuggestionRows, getRowDescription, getRowCategory, getRowTimestamp };
})();
