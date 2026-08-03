/**
 * Heurística de pontuação de spam. Não tem acesso a nenhum backend —
 * roda inteiramente sobre o texto visível na página.
 * Ajuste THRESHOLD e os pesos abaixo conforme o comportamento real observado.
 */
const AluraSpamDetector = (() => {
  const THRESHOLD = 45;

  const KEYBOARD_MASH_PATTERNS = [
    "asdf", "qwer", "zxcv", "qwerty", "asdasd", "jklç", "kdak", "kska",
  ];

  const KNOWN_LOW_VALUE_PHRASES = [
    "teste", "testando", "oi", "kkkk", "kkkkk", ".", "...", "aaaa", "asd",
  ];

  const VOWELS = "aeiouáéíóúãõâêô";

  function vowelRatio(text) {
    const letters = text.toLowerCase().replace(/[^a-záéíóúãõâêôç]/g, "");
    if (letters.length === 0) return 1;
    const vowelCount = letters
      .split("")
      .filter((ch) => VOWELS.includes(ch)).length;
    return vowelCount / letters.length;
  }

  function hasRepeatedChars(text) {
    return /(.)\1{3,}/i.test(text);
  }

  function hasKeyboardMash(text) {
    const lower = text.toLowerCase();
    return KEYBOARD_MASH_PATTERNS.some((p) => lower.includes(p));
  }

  function hasLongConsonantRun(text) {
    return /[bcdfghjklmnpqrstvwxyz]{6,}/i.test(text);
  }

  /**
   * Detecta um trecho curto (2-6 caracteres) que se repete e domina a maior
   * parte do texto — ex.: "asdasdasdasdasdsa", "kdkdkdkdkd". Mais genérico
   * que uma lista fixa de padrões de teclado, pois pega qualquer sequência
   * repetitiva, não só as previstas de antemão.
   */
  function hasDominantRepeatingPattern(text) {
    const match = text.match(/(.{2,6})\1{2,}/i);
    if (!match) return false;
    return match[0].length / text.length >= 0.6;
  }

  /**
   * Textos de teclado aleatório tendem a usar poucas letras distintas
   * repetidas várias vezes (ex.: "kskdaskdkakdskakda" usa só k/s/d/a).
   * Frases reais em português, mesmo curtas, normalmente usam bem mais
   * variedade de letras. Só se aplica a partir de 12 caracteres — abaixo
   * disso a regra de "texto muito curto" já cobre.
   */
  function hasLowLetterDiversity(text) {
    if (text.length < 12) return false;
    const letters = text.toLowerCase().replace(/[^a-záéíóúãõâêôç]/g, "");
    if (letters.length < 12) return false;
    return new Set(letters.split("")).size <= 6;
  }

  /**
   * Procura uma "palavra" isolada (12+ letras, sem espaço) que pareça
   * teclado aleatório, mesmo dentro de uma frase com texto normal ao redor
   * — ex.: "Simplesmente o link é ERRADO! kskdaskdkakdskakda". Estatística
   * do texto inteiro (proporção de vogais, diversidade de letras) é diluída
   * pelo restante da frase legítima, então aqui a checagem é por token.
   * 12 letras (em vez de 10) evita pegar palavras reais longas comuns em
   * feedback técnico (ex.: "referentes", que tem só 6 letras distintas).
   */
  function findGibberishToken(text) {
    const tokens = text.split(/\s+/);
    return tokens.find((rawToken) => {
      const token = rawToken.toLowerCase().replace(/[^a-záéíóúãõâêôç]/g, "");
      if (token.length < 12) return false;
      const diversity = new Set(token.split("")).size;
      return vowelRatio(token) < 0.25 || diversity <= 6;
    });
  }

  function isKnownLowValuePhrase(text) {
    const normalized = text.trim().toLowerCase();
    return KNOWN_LOW_VALUE_PHRASES.includes(normalized);
  }

  function scoreSpam(rawText) {
    const text = (rawText || "").trim();
    const reasons = [];
    let score = 0;

    if (text.length === 0) {
      return { score: 0, reasons: [] };
    }

    if (isKnownLowValuePhrase(text)) {
      score += 40;
      reasons.push("frase genérica conhecida (ex.: 'teste', 'kkkk')");
    }

    if (text.length < 15) {
      score += 25;
      reasons.push("texto muito curto");
    }

    if (text.length >= 6 && vowelRatio(text) < 0.25) {
      score += 20;
      reasons.push("baixa proporção de vogais");
    }

    if (hasRepeatedChars(text)) {
      score += 30;
      reasons.push("caractere repetido em sequência");
    }

    if (hasKeyboardMash(text)) {
      score += 25;
      reasons.push("padrão de teclado (ex.: 'asdf')");
    }

    if (hasLongConsonantRun(text)) {
      score += 20;
      reasons.push("sequência longa de consoantes");
    }

    if (hasDominantRepeatingPattern(text)) {
      score += 30;
      reasons.push("padrão repetitivo dominando o texto (ex.: 'asdasdasd')");
    }

    if (hasLowLetterDiversity(text)) {
      score += 35;
      reasons.push("poucas letras distintas para o tamanho do texto (ex.: 'kskdaskdkakdskakda')");
    }

    const gibberishToken = findGibberishToken(text);
    if (gibberishToken) {
      score += 50;
      reasons.push(`trecho isolado sem sentido: "${gibberishToken}"`);
    }

    if (text.length > 40 && !text.includes(" ")) {
      score += 20;
      reasons.push("texto longo sem espaços");
    }

    return { score: Math.min(score, 100), reasons };
  }

  function isLikelySpam(rawText) {
    return scoreSpam(rawText).score >= THRESHOLD;
  }

  return { scoreSpam, isLikelySpam, THRESHOLD };
})();
