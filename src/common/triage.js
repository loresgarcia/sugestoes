/**
 * Módulo de triagem unificado — função pura, sem I/O, sem dependência de DOM.
 * Consolida spam, categoria, duplicatas e idade em um único score (0–100),
 * label e array de flags.
 *
 * Pesos dos componentes (ajustáveis):
 *   - Spam:        peso 40 (do score de spam, normalizado 0–100 → contribui até 40 pontos)
 *   - Categoria:   peso 25
 *   - Duplicata:   peso 20
 *   - Antigo:      peso 15
 */
const AluraTriage = (() => {
  const WEIGHTS = {
    spam: 40,
    categoryMismatch: 25,
    duplicate: 20,
    old: 15,
  };

  const OLD_THRESHOLD_DAYS = 7;

  const LABEL_THRESHOLDS = {
    high: 70,
    medium: 40,
    low: 0,
  };

  /**
   * Calcula triagem para uma única sugestão.
   * @param {Object} params
   * @param {string} params.description - Descrição da sugestão
   * @param {string|null} params.category - Categoria marcada pelo aluno
   * @param {number|null} params.timestamp - Epoch ms de criação
   * @param {number} params.duplicateCount - Quantas outras sugestões na mesma página têm descrição quase idêntica
   * @param {number} [params.ageDays] - Idade em dias (opcional, calculado se timestamp disponível)
   * @returns {{ score: number, label: string, flags: string[], breakdown: Object }}
   */
  function triage({ description, category, timestamp, duplicateCount = 0 }) {
    const flags = [];
    const breakdown = {};
    let totalScore = 0;

    // 1. Spam
    const spamResult = AluraSpamDetector.scoreSpam(description);
    const spamContribution = Math.round((spamResult.score / 100) * WEIGHTS.spam);
    if (spamContribution > 0) {
      breakdown.spam = { raw: spamResult.score, weighted: spamContribution };
      totalScore += spamContribution;
      flags.push("spam");
    }

    // 2. Categoria divergente
    const mismatch = AluraCategoryChecker.guessMismatch(description, category);
    if (mismatch) {
      const catContribution = WEIGHTS.categoryMismatch;
      breakdown.categoryMismatch = {
        suspectedCategory: mismatch.suspectedCategory,
        actualCategory: category,
        weighted: catContribution,
      };
      totalScore += catContribution;
      flags.push("category_mismatch");
    }

    // 3. Texto repetido
    if (duplicateCount > 0) {
      const dupContribution = Math.min(duplicateCount * WEIGHTS.duplicate, WEIGHTS.duplicate);
      breakdown.duplicate = { count: duplicateCount, weighted: dupContribution };
      totalScore += dupContribution;
      flags.push("duplicate");
    }

    // 4. Sugestão antiga
    let ageDays = null;
    if (timestamp != null) {
      ageDays = (Date.now() - timestamp) / (24 * 60 * 60 * 1000);
      if (ageDays >= OLD_THRESHOLD_DAYS) {
        const oldContribution = WEIGHTS.old;
        breakdown.old = { ageDays: Math.floor(ageDays), weighted: oldContribution };
        totalScore += oldContribution;
        flags.push("old");
      }
    }

    totalScore = Math.min(totalScore, 100);

    let label;
    if (totalScore >= LABEL_THRESHOLDS.high) {
      label = "alta prioridade";
    } else if (totalScore >= LABEL_THRESHOLDS.medium) {
      label = "revisar";
    } else if (flags.length > 0) {
      label = "atenção";
    } else {
      label = "normal";
    }

    return { score: totalScore, label, flags, breakdown };
  }

  /**
   * Triagem em lote (para processar uma página inteira de uma vez).
   * @param {Array<{description, category, timestamp, duplicateCount}>} suggestions
   * @returns {Array<{score, label, flags, breakdown}>}
   */
  function triageBatch(suggestions) {
    return suggestions.map(triage);
  }

  return { triage, triageBatch, OLD_THRESHOLD_DAYS, WEIGHTS };
})();
