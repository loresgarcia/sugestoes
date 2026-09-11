# Alura Sugestoes Helper

Extensao Chrome (Manifest V3) para a area de suporte educacional identificar mais rapido spam, categorias possivelmente erradas, texto repetido e sugestoes antigas na pagina de sugestoes da Alura (`cursos.alura.com.br/suggestions/...`). A extensao apenas sinaliza — nao aprova, nao reprova e nao descarta nada automaticamente. As acoes continuam manuais usando os controles da Alura (Aprovar/Reprovar na pagina de detalhe, Descartar em lote na listagem).

## O que a extensao faz

A extensao observa a listagem de sugestoes e insere badges informativos ao lado de cada card, alem de um resumo geral no topo da lista. Passe o mouse sobre qualquer selo para ver o motivo da sinalizacao.

- **Selo "Possivel spam"**: Analisa a descricao visivel do card e marca quando o texto combina com padroes suspeitos: texto muito curto, frases genericas conhecidas ("teste", "kkkk"), padroes de teclado repetidos ("asdasdasd"), poucas letras distintas para o tamanho do texto, sequencias longas de consoantes, baixa proporcao de vogais, ou uma "palavra" isolada sem sentido no meio de uma frase normal.

- **Selo "Categoria pode estar errada"**: Quando a descricao aponta fortemente para um tipo diferente da categoria marcada pelo aluno. No momento, cobre apenas dois padroes de vocabulario distintivos: "Link quebrado" e "Problema com audio ou video".

- **Selo "Texto repetido"**: Quando a descricao e quase identica a de outra sugestao na mesma pagina. Essa regra captura spam repetido ou um aluno copiando a mesma reclamacao em mais de uma atividade.

- **Selo "Aguardando ha muito tempo" + destaque na linha**: Sugestoes criadas ha mais de 7 dias (configuravel) ganham uma borda diferenciada e um selo.

- **Resumo no topo da lista**: Exibe uma contagem consolidada, por exemplo: `18 sugestoes nesta pagina · 3 possivel spam · 1 com categoria talvez errada · 2 com texto repetido · 4 aguardando ha mais de 7 dias`.

- **Popup com lista filtrable**: Clique no icone da extensao para ver uma lista consolidada de todas as sugestoes ja processadas, com filtros por label, categoria e flag.

- **Reavaliacao na tela de detalhe**: Ao abrir uma sugestao, a extensao le o texto completo dos textareas (`.original` / `.changed`) e recalcula a triagem com o dado integral, em vez do texto truncado que aparece na listagem.

- **Respostas rapidas**: Na tela de detalhe, um painel injetado acima do editor mostra botoes com respostas padrao (ortografia, tecnico, link quebrado, etc.). Clicar copia o texto pronto para a area de transferencia.

- **Presenca de revisor**: Mostra quando outra pessoa ja esta revisando uma sugestao, para evitar que duas pessoas mexam na mesma ao mesmo tempo — um selo "🔒 Fulano esta revisando" na listagem, e um aviso na tela de detalhe. Veja detalhes na secao [Presenca de revisor](#presenca-de-revisor-tempo-real).

## Como funciona (arquitetura)

A extensao roda como um content script injetado automaticamente no dominio da Alura. Fluxo:

1. **Observer** (`src/content/observer.js`) detecta cards renderizados via `MutationObserver` com debounce.
2. **Parser** (`src/content/parser.js`) extrai sourceId, descricao, categoria, autor, diff e timestamp de cada card usando selectors.
3. **Triage** (`src/common/triage.js`) consolida spam, categoria, duplicatas e idade em um score unico (0-100), label e flags.
4. **Storage** (`src/common/storage.js`) persiste cada sugestao em `chrome.storage.local` por sourceId (deduplicacao robusta).
5. **Injector** (`src/content/injector.js`) injeta badges visuais no DOM ao lado de cada card.
6. **Popup** (`popup/`) le o storage e exibe lista filtrable/ordenavel.
7. **Service Worker** (`background/service-worker.js`) mantem contadores e atualiza badge do icone.
8. **Detail parser** (`src/content/detail-parser.js`) le a tela de detalhe (textareas `.original`/`.changed`) para reavaliar a triagem com o texto completo (`src/detail-page.js`).
9. **Respostas rapidas** (`src/content/reply-buttons.js`) injeta o painel de respostas prontas na tela de detalhe.
10. **Presenca** (`src/common/presence.js`) fala com a REST API do Firebase Realtime Database para anunciar e consultar quem esta revisando cada sugestao (ver secao dedicada abaixo).

### Estrutura de arquivos

```
manifest.json                       # Manifest V3, permissions, background, popup
background/
  service-worker.js                 # Mensageria, contadores, badge do icone
popup/
  popup.html                        # Interface do popup
  popup.js                          # Logica do popup (filtros, lista)
  popup.css                         # Estilos do popup
src/
  list-page.js                      # Orquestracao da listagem: observer -> parser -> triage -> storage -> injector -> presence
  detail-page.js                    # Orquestracao da tela de detalhe: parser -> triage -> storage -> presence
  styles.css                        # Estilos dos badges, resumo, respostas rapidas e presenca
  common/
    selectors.js                    # Seletores CSS da listagem e da tela de detalhe (sourceId, autor, diff, etc.)
    spam-detector.js                # Heuristicas de spam (scores, limiares, motivos)
    category-checker.js             # Divergencia entre descricao e categoria
    duplicate-checker.js            # Descricoes identicas (similaridade de Jaccard)
    storage.js                      # Wrapper chrome.storage.local (upsert, getAll, getFiltered)
    triage.js                       # Scoring unificado (pesos: spam 40, categoria 25, duplicata 20, antigo 15)
    firebase-config.js              # databaseURL do Realtime Database usado para presenca
    identity.js                     # Nome do revisor (prompt unico) + clientId, via chrome.storage.local
    presence.js                     # Anuncia/consulta presenca via REST API do Firebase (sem SDK)
  content/
    observer.js                     # MutationObserver isolado com debounce
    parser.js                       # Extrai modelo Suggestion do DOM (listagem)
    detail-parser.js                # Extrai dados completos da tela de detalhe (textareas, autor, categoria)
    injector.js                     # Injeta badges e resumo no DOM
    reply-buttons.js                # Painel de respostas rapidas na tela de detalhe
    presence-badge.js               # Injeta o selo "🔒 Fulano esta revisando" na listagem
```

## Instalar localmente (modo desenvolvedor)

1. Abra `chrome://extensions` no Chrome.
2. Ative **"Modo do desenvolvedor"** (canto superior direito).
3. Clique em **"Carregar sem compactacao"** (Load unpacked) e selecione a pasta raiz do projeto (onde esta o `manifest.json`).
4. Abra a pagina de sugestoes da Alura logado normalmente — os badges devem aparecer ao lado dos cards.
5. Clique no icone da extensao na barra de ferramentas para abrir o popup.

Apos qualquer alteracao nos arquivos, clique no icone de recarregar (⟳) no card da extensao em `chrome://extensions` e recarregue (F5) a pagina de sugestoes.

## Testar

- **Content script**: Abra a pagina de sugestoes, pressione F12, aba Console. Veja logs e erros do content script.
- **Service worker**: Em `chrome://extensions`, clique em "Service Worker" na secao de detalhes da extensao.
- **Popup**: Clique no icone da extensao na barra de ferramentas.
- **Storage**: No Console da pagina de sugestoes, execute `AluraStorage.getStats()` para ver contagem de sugestoes salvas.
- **Triagem**: No Console, execute `AluraTriage.triage({ description: "teste", category: null, timestamp: null, duplicateCount: 0 })` para testar.

## Presenca de revisor (tempo real)

Para evitar que duas pessoas revisem a mesma sugestao ao mesmo tempo, a extensao anuncia presenca num projeto compartilhado do Firebase Realtime Database.

- **Sem SDK**: a comunicacao e feita via REST API pura (`fetch`), contra `{databaseURL}/presence/{sourceId}.json` — sem bundler, sem dependencia nova no projeto.
- **Sinal de vida, nao `onDisconnect`**: quem esta na tela de detalhe grava um timestamp a cada 10s (`HEARTBEAT_MS`). Um registro mais velho que 25s (`STALE_AFTER_MS`) e tratado como se a pessoa tivesse saido — cobre o caso de a aba fechar sem avisar, sem exigir o SDK completo com conexao persistente.
- **Nome do revisor**: perguntado uma unica vez via `prompt()` na primeira sugestao aberta, guardado em `chrome.storage.local` (`AluraIdentity`). Para trocar o nome salvo, rode no Console da pagina: `chrome.storage.local.remove(['alura_reviewer_name'])`.
- **Onde aparece**: selo "🔒 Fulano esta revisando" nos cards da listagem (`AluraPresenceBadge`); aviso "⚠️ Fulano ja esta revisando esta sugestao agora" no topo da tela de detalhe (`src/detail-page.js`).
- **Configuracao do projeto Firebase**: `databaseURL` fica em `src/common/firebase-config.js`. As regras do Realtime Database restringem leitura/escrita ao caminho `presence/`:
  ```json
  { "rules": { "presence": { ".read": true, ".write": true } } }
  ```
- **host_permissions**: o dominio do Firebase precisa estar em `host_permissions` no `manifest.json` para o `fetch` funcionar a partir do content script.

## Ajustar a sensibilidade

| Regra | Constante | Arquivo | Padrao | Observacoes |
|---|---|---|---|---|
| Spam | `THRESHOLD` | `src/common/spam-detector.js` | 45 | Limiar global. Cada heuristica tem peso interno. |
| Spam (triage) | `WEIGHTS.spam` | `src/common/triage.js` | 40 | Peso do spam no score consolidado (0-100). |
| Categoria | `LINK_QUEBRADO_PHRASES` / `AUDIO_VIDEO_PHRASES` | `src/common/category-checker.js` | — | Listas de frases-chave. |
| Categoria (triage) | `WEIGHTS.categoryMismatch` | `src/common/triage.js` | 25 | Peso da categoria no score consolidado. |
| Texto repetido | `SIMILARITY_THRESHOLD` | `src/common/duplicate-checker.js` | 0.75 | Similaridade de Jaccard (alto de proposito). |
| Texto repetido (triage) | `WEIGHTS.duplicate` | `src/common/triage.js` | 20 | Peso da duplicata no score consolidado. |
| Sugestao antiga | `OLD_THRESHOLD_DAYS` | `src/common/triage.js` | 7 | Dias minimos para selo. |
| Sugestao antiga (triage) | `WEIGHTS.old` | `src/common/triage.js` | 15 | Peso de "antigo" no score consolidado. |

### Labels de triagem

| Label | Score minimo | Significado |
|---|---|---|
| alta prioridade | 70+ | Requer atencao imediata |
| revisar | 40-69 | Deve ser revisado em breve |
| atencao | 1-39 | Tem algum indicador, mas nao e critico |
| normal | 0 | Sem problemas detectados |

## Solucao de problemas

Se a Alura redesenhar a pagina e os badges pararem de aparecer, o ponto de ajuste principal sao os seletores CSS em `src/common/selectors.js`. Para diagnosticar:

1. Abra o DevTools (F12) na pagina de sugestoes.
2. Clique com o botao direito em um card de sugestao → **Inspecionar**.
3. No painel do DevTools, botao direito no elemento inspecionado → **Copy** → **Copy outerHTML**.
4. Envie o HTML copiado para que os seletores sejam recalibrados.

Para encontrar o Service Worker: em `chrome://extensions`, clique em **"Service Worker"** na secao de detalhes. Isso abre o DevTools do background.

Para ver logs do content script: F12 → aba Console na pagina de sugestoes.

## Limitacoes

- **Duplicatas somente na mesma pagina**: a comparacao de similaridade e local — nao cruza dados entre diferentes carregamentos ou paginas.
- **Categorias parcialmente mapeadas**: apenas "Link quebrado" e "Problema com audio ou video" tem vocabulario suficientemente distinto para deteccao por palavra-chave segura.
- **Atraso de renderizacao**: como depende de `MutationObserver`, pode haver um breve intervalo entre o carregamento dos cards e a injecao dos badges.
- **Service worker descartavel**: o Chrome descarta o service worker apos ~30s de inatividade. Ele reativa automaticamente ao clicar no popup ou receber uma mensagem.
- **Presenca com atraso de ate ~25s**: como nao usa `onDisconnect` (exigiria o SDK completo do Firebase), o aviso de "Fulano saiu" so desaparece depois do timeout do sinal de vida — nao e instantaneo.
- **Regras do Firebase abertas dentro de `presence/`**: qualquer um com a `databaseURL` consegue ler/escrever nesse caminho (sem autenticacao). Aceitavel pois so guarda nome + timestamp, mas nao guarde nada sensivel ali.
