/**
 * Detecta descrições QUASE IDÊNTICAS entre sugestões da MESMA página (não dá
 * pra comparar com outras páginas — cada carregamento só tem acesso ao HTML
 * que está na tela). Pega texto repetido / copiado e colado — ex.: o mesmo
 * spam enviado várias vezes, ou um aluno copiando a mesma reclamação em
 * mais de uma atividade.
 *
 * NÃO tenta detectar "mesmo problema com palavras diferentes" (paráfrase):
 * testei usando similaridade de Jaccard sobre palavras e, mesmo removendo
 * palavras funcionais, duas frases sobre assuntos DIFERENTES mas com a
 * mesma estrutura (ex.: "o exercício pede Django mas cita Flask" vs "...
 * React... Angular") ficavam mais parecidas que paráfrases genuínas do
 * mesmo problema. Sem algo mais sofisticado que uma heurística leve, isso
 * gerava falso positivo — por isso o threshold aqui é alto (só pega texto
 * praticamente igual), não uma detecção ampla de duplicidade de assunto.
 */
const AluraDuplicateChecker = (() => {
  const SIMILARITY_THRESHOLD = 0.75;
  const MIN_NORMALIZED_LENGTH = 10;

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function wordSet(normalizedText) {
    return new Set(normalizedText.split(" ").filter(Boolean));
  }

  function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    setA.forEach((word) => {
      if (setB.has(word)) intersection += 1;
    });
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Recebe uma lista de descrições (mesma ordem das linhas da página) e
   * devolve um array paralelo com quantas outras descrições da lista são
   * quase idênticas a cada uma (0 quando nenhuma é).
   */
  function countSimilarMatches(descriptions) {
    const normalized = descriptions.map(normalize);
    const sets = normalized.map(wordSet);
    const counts = descriptions.map(() => 0);

    for (let i = 0; i < descriptions.length; i += 1) {
      if (normalized[i].length < MIN_NORMALIZED_LENGTH) continue;
      for (let j = i + 1; j < descriptions.length; j += 1) {
        if (normalized[j].length < MIN_NORMALIZED_LENGTH) continue;
        if (jaccardSimilarity(sets[i], sets[j]) >= SIMILARITY_THRESHOLD) {
          counts[i] += 1;
          counts[j] += 1;
        }
      }
    }

    return counts;
  }

  return { countSimilarMatches, SIMILARITY_THRESHOLD };
})();
