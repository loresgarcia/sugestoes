/**
 * Injeta badges visuais no DOM ao lado de cada card de sugestão.
 * Baseado nos resultados do triage (score, label, flags).
 * Não tem I/O — apenas manipulação do DOM.
 */
const AluraInjector = (() => {
  const BADGE_VARIANTS = {
    spam: { icon: "\uD83D\uDEA9", text: "Poss\u00edvel spam", cssClass: "spam" },
    category_mismatch: { icon: "\uD83C\uDFF7\uFE0F", text: "Categoria pode estar errada", cssClass: "category" },
    duplicate: { icon: "\uD83D\uDD01", text: "Texto repetido", cssClass: "duplicate" },
    old: { icon: "\u23F3", text: "Aguardando h\u00E1 muito tempo", cssClass: "old" },
  };

  function createBadge(flag, tooltip) {
    const variant = BADGE_VARIANTS[flag];
    if (!variant) return null;

    const badge = document.createElement("span");
    badge.className = `alura-helper-badge alura-helper-badge--${variant.cssClass}`;
    badge.textContent = `${variant.icon} ${variant.text}`;
    badge.title = tooltip;
    return badge;
  }

  function buildTooltip(flag, breakdown) {
    switch (flag) {
      case "spam": {
        const reasons = AluraSpamDetector.scoreSpam(breakdown.description || "").reasons;
        return reasons.length > 0
          ? reasons.join("; ")
          : "Texto at\u00E9nde padr\u00F5es de spam";
      }
      case "category_mismatch":
        return `Descri\u00E7\u00E3o parece mais com "${breakdown.suspectedCategory}" do que com "${breakdown.actualCategory}"`;
      case "duplicate":
        return `Descri\u00E7\u00E3o quase id\u00EAntica a outra${breakdown.count > 1 ? "s " + breakdown.count : ""} sugest\u00E3o${breakdown.count > 1 ? "\u00F5es" : ""} nesta p\u00E1gina`;
      case "old":
        return `Criada h\u00E1 aproximadamente ${breakdown.ageDays} dias`;
      default:
        return "";
    }
  }

  /**
   * Injeta badges em uma row baseado nos dados de triagem.
   * @param {HTMLLIElement} row
   * @param {Object} suggestion - Objeto com flags e breakdown
   */
  function injectBadges(row, suggestion) {
    if (row.dataset.aluraTagged) return;
    row.dataset.aluraTagged = "1";

    if (!suggestion.flags || suggestion.flags.length === 0) return;

    const target = row.querySelector(".suggestions-requestSubject") || row;

    suggestion.flags.forEach((flag) => {
      const tooltip = buildTooltip(flag, suggestion.breakdown || {});
      const badge = createBadge(flag, tooltip);
      if (badge) {
        target.appendChild(badge);
      }
    });

    if (suggestion.flags.includes("old")) {
      row.classList.add("alura-helper-row--old");
    }
  }

  /**
   * Injeta/atualiza resumo no topo da listagem.
   * @param {HTMLLIElement[]} rows
   * @param {Object} stats - { total, spam, categoryMismatch, duplicate, old }
   */
  function injectSummary(rows, stats) {
    if (!rows.length) return;

    let summaryEl = document.querySelector(".alura-helper-summary");
    if (!summaryEl) {
      summaryEl = document.createElement("div");
      summaryEl.className = "alura-helper-summary";
      rows[0].parentElement.insertBefore(summaryEl, rows[0]);
    }

    const parts = [];
    const suggestionWord = stats.total === 1 ? "sugest\u00E3o" : "sugest\u00F5es";
    parts.push(`${stats.total} ${suggestionWord} nesta p\u00E1gina`);

    if (stats.spam > 0) {
      const possibleWord = stats.spam === 1 ? "poss\u00EDvel" : "poss\u00EDveis";
      parts.push(`${stats.spam} ${possibleWord} spam`);
    }
    if (stats.categoryMismatch > 0) {
      parts.push(`${stats.categoryMismatch} com categoria talvez errada`);
    }
    if (stats.duplicate > 0) {
      parts.push(`${stats.duplicate} com texto repetido`);
    }
    if (stats.old > 0) {
      parts.push(`${stats.old} aguardando h\u00E1 mais de ${AluraTriage.OLD_THRESHOLD_DAYS} dias`);
    }

    summaryEl.textContent = parts.join(" \u00B7 ");
  }

  /**
   * Remove todos os badges e resumo injetados (para reprocessamento limpo).
   */
  function clearInjected() {
    document.querySelectorAll(".alura-helper-badge").forEach((el) => el.remove());
    document.querySelectorAll(".alura-helper-row--old").forEach((el) => {
      el.classList.remove("alura-helper-row--old");
    });
    document.querySelectorAll("[data-alura-tagged]").forEach((el) => {
      delete el.dataset.aluraTagged;
    });
    const summary = document.querySelector(".alura-helper-summary");
    if (summary) summary.remove();
  }

  return { injectBadges, injectSummary, clearInjected, createBadge };
})();
