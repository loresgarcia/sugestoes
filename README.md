# Alura Sugestões Helper

Extensão Chrome (Manifest V3) para a área de suporte educacional identificar
mais rápido spam, sugestões mal categorizadas, texto repetido e sugestões
esquecidas na página de sugestões da Alura
(`cursos.alura.com.br/suggestions/...`). Só sinaliza — não aprova, não
reprova, não descarta nada sozinha. As ações continuam manuais, usando os
próprios controles da Alura (Aprovar/Reprovar na página de detalhe,
Descartar em lote na listagem).

## O que ela faz

- **Selo "🚩 Possível spam"**: analisa a descrição de cada sugestão e
  sinaliza quando o texto bate com padrões suspeitos — texto muito curto,
  frases genéricas ("teste", "kkkk"), padrão de teclado repetido
  (`asdasdasd`), poucas letras distintas para o tamanho do texto
  (`kskdaskdkakdskakda`), ou uma "palavra" isolada sem sentido no meio de uma
  frase normal.
- **Selo "🏷️ Categoria pode estar errada"**: quando a descrição menciona
  fortemente link quebrado (ex.: "404", "link não abre") ou problema de
  áudio/vídeo (ex.: "tela preta", "sem som") mas a categoria marcada pelo
  aluno é outra. Cobre só essas duas categorias — "Correção técnica" e
  "Correção ortográfica" são amplas demais pra detectar por palavra-chave
  sem gerar falso positivo (ver
  [src/common/category-checker.js](src/common/category-checker.js)).
- **Selo "🔁 Texto repetido"**: quando a descrição é quase idêntica à de
  outra sugestão **nesta mesma página** — pega spam repetido ou um aluno
  copiando a mesma reclamação em mais de uma atividade. Não tenta detectar
  "mesmo problema com palavras diferentes" (ver limitações abaixo).
- **Selo "⏳ Aguardando há muito tempo" + destaque na linha**: sugestões
  criadas há mais de 7 dias (ajustável) ganham uma borda colorida e um selo,
  sem mudar a posição delas na lista.
- **Resumo no topo da lista**: contagem rápida tipo "18 sugestões nesta
  página · 3 possível spam · 1 com categoria talvez errada · 2 com texto
  repetido · 4 aguardando há mais de 7 dias", pra ter uma visão geral antes
  de entrar item por item.
- Passe o mouse sobre qualquer selo pra ver o motivo da sinalização.

## Instalar localmente (modo desenvolvedor)

1. Abra `chrome://extensions` no Chrome.
2. Ative "Modo do desenvolvedor" (canto superior direito).
3. Clique em "Carregar sem compactação" (Load unpacked) e selecione a pasta
   `sugestoes` (a que tem o `manifest.json`).
4. Abra a página de sugestões logado normalmente — os selos devem aparecer
   nas sugestões suspeitas.

Depois de qualquer mudança nos arquivos, clique no ícone de recarregar (⟳)
no card da extensão em `chrome://extensions` e dê F5 na página.

## Seletores

Os seletores em [src/common/selectors.js](src/common/selectors.js) usam as
classes reais da listagem, confirmadas por inspeção manual. Se a Alura
redesenhar a tela e os selos pararem de aparecer, abra o DevTools (F12),
clique com o botão direito no elemento em questão → **Inspecionar**, e me
mande o HTML (botão direito no elemento no painel do DevTools → Copy → Copy
outerHTML). Ajusto o `selectors.js` com base nisso.

## Ajustar a sensibilidade

- Spam: constante `THRESHOLD` no topo de
  [src/common/spam-detector.js](src/common/spam-detector.js) (padrão: 45) —
  se estiver sinalizando demais ou de menos, é só esse número que muda o
  comportamento. Cada heurística individual também tem seu próprio peso.
- Categoria: as listas `LINK_QUEBRADO_PHRASES` e `AUDIO_VIDEO_PHRASES` em
  [src/common/category-checker.js](src/common/category-checker.js) — dá pra
  adicionar frases novas se perceber um padrão comum passando batido.
- Texto repetido: constante `SIMILARITY_THRESHOLD` em
  [src/common/duplicate-checker.js](src/common/duplicate-checker.js)
  (padrão: 0.75 — bem alto de propósito, ver limitações abaixo).
- Sugestão antiga: constante `OLD_THRESHOLD_DAYS` no topo de
  [src/list-page.js](src/list-page.js) (padrão: 7 dias).

## Limitações conhecidas

- É heurística, não é perfeita: pode deixar passar casos reais, e pode
  sinalizar algo legítimo por engano (raro, mas possível). São só selos de
  apoio — a decisão final continua sua.
- O selo de categoria só pega quando a descrição aponta claramente pra
  "Link quebrado" ou "Problema com audio ou vídeo" sendo outra a categoria
  marcada. Não tenta adivinhar quando a categoria está errada sem nenhum
  sinal claro de qual seria a certa (isso gerava falso positivo demais nos
  testes).
- O selo de "texto repetido" só pega texto **quase idêntico** (cópia/colada
  ou pouquíssima diferença). Tentei ampliar pra pegar reclamações
  reformuladas com outras palavras sobre o mesmo problema, mas duas
  descrições sobre assuntos **diferentes** e com a mesma estrutura de frase
  (ex.: "o exercício pede Django mas cita Flask" vs "...React... Angular")
  ficavam mais parecidas do que reformulações genuínas — sem algo mais
  sofisticado que uma heurística leve, isso vira falso positivo. Por
  segurança, o threshold ficou alto e o alcance menor.
- O selo de "texto repetido" só compara sugestões que estão **na mesma
  página carregada** — mesma limitação da paginação já mencionada.
- "Aguardando há muito tempo" também não cruza páginas — só o que está
  visível na página atual pode ser destacado.
- Depende da estrutura da página (classes CSS). Se a Alura redesenhar a
  tela, os seletores podem precisar de ajuste (ver acima).

## Publicar como "não listada" na Chrome Web Store

Mesmo modelo usado na `forum-seo-helper`:

1. Gere o pacote: compacte a pasta `sugestoes` em `.zip` (deixe o
   `manifest.json` na raiz do zip, não dentro de uma subpasta).
2. Acesse o [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   com a conta Google que você já usa para publicar extensões.
3. "Novo item" → envie o `.zip`.
4. Preencha nome, descrição curta e os ícones (já incluídos em `icons/`).
5. Em **Visibilidade da listagem**, escolha **Não listada** (Unlisted) —
   assim só quem tiver o link direto consegue instalar.
6. Envie para revisão. Como a extensão não pede nenhuma permissão especial
   (só lê a própria página), a revisão tende a ser rápida.
