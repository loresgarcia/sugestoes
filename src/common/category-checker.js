/**
 * Heurística leve pra detectar quando a categoria marcada pelo aluno não
 * bate com o que a descrição sugere. Só cobre "Link quebrado" e "Problema
 * com audio ou vídeo" — são as duas categorias com vocabulário distintivo o
 * bastante pra checar por frase sem gerar muito falso positivo. "Correção
 * técnica" e "Correção ortográfica" são amplas demais (cobrem praticamente
 * qualquer assunto) pra detectar por palavra-chave com confiança.
 *
 * De propósito, só sinaliza quando a descrição aponta fortemente pra uma
 * categoria ESPECÍFICA diferente da marcada — não tenta adivinhar "essa
 * categoria está errada" quando não há nenhum sinal claro de qual seria a
 * certa, porque isso gerou falso positivo demais nos testes.
 */
const AluraCategoryChecker = (() => {
  const LINK_QUEBRADO_LABEL = "Link quebrado";
  const AUDIO_VIDEO_LABEL = "Problema com audio ou vídeo";

  const LINK_QUEBRADO_PHRASES = [
    "link quebrado", "link não funciona", "link nao funciona",
    "não abre o link", "nao abre o link", "link errado", "404",
    "página não encontrada", "pagina nao encontrada",
    "link não abre", "link nao abre", "url quebrada",
    "link inválido", "link invalido", "link não está funcionando",
    "link nao esta funcionando",
  ];

  const AUDIO_VIDEO_PHRASES = [
    "vídeo não", "video nao", "áudio não", "audio nao", "não toca",
    "nao toca", "sem som", "tela preta", "vídeo trava", "video trava",
    "não reproduz", "nao reproduz", "sem legenda", "vídeo quebrado",
    "video quebrado", "áudio quebrado", "audio quebrado",
  ];

  function countMatches(text, phrases) {
    return phrases.filter((p) => text.includes(p)).length;
  }

  /** Retorna { suspectedCategory } se achar sinal forte de outra categoria, senão null. */
  function guessMismatch(description, actualCategory) {
    const text = (description || "").toLowerCase().trim();
    if (!text) return null;

    if (actualCategory !== LINK_QUEBRADO_LABEL && countMatches(text, LINK_QUEBRADO_PHRASES) >= 1) {
      return { suspectedCategory: LINK_QUEBRADO_LABEL };
    }

    if (actualCategory !== AUDIO_VIDEO_LABEL && countMatches(text, AUDIO_VIDEO_PHRASES) >= 1) {
      return { suspectedCategory: AUDIO_VIDEO_LABEL };
    }

    return null;
  }

  return { guessMismatch };
})();
