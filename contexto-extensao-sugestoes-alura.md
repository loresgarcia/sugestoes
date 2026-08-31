# Contexto do Projeto: Extensão de Navegador — Tags de Triagem para Sugestões Alura

> Este documento serve como **base de contexto** para um agente de codificação (ex.: Claude Code) implementar o projeto. Contém objetivo, arquitetura, modelo de dados, backlog e decisões pendentes. Use-o como referência única antes de gerar código.

---

## 1. Objetivo

Criar uma **extensão de navegador (Manifest V3)** que, ao ser executada na página de **Sugestões da Alura** (Ortografia/Link/Técnico/Vídeo), lê os cards já renderizados no DOM, aplica uma **triagem automática (anti-spam/qualidade)** e injeta uma **tag/badge visual** em cada card indicando prioridade de revisão — tudo client-side, sem backend, sem scraping HTTP, sem banco de dados externo.

A extensão herda a sessão já autenticada do usuário na aba (não faz login, não faz requisições autenticadas — só lê o que já está na tela).

---

## 2. Contexto anterior (para entendimento do agente)

Existia uma spec anterior para um **dashboard interno server-side**: scraper autenticado → parser de HTML → banco de dados → API → dashboard web separado, com link para "abrir na Alura".

**Essa abordagem foi descartada.** O projeto agora é 100% client-side, dentro da própria página da Alura. A tabela abaixo mapeia conceitos antigos → novos, caso apareçam referências residuais em qualquer material de apoio:

| Conceito antigo (descartado) | Equivalente atual (extensão) |
|---|---|
| Scraper Worker (HTTP + auth) | Content Script injetado na página |
| Parsear HTML baixado | Parsear o DOM já renderizado (`querySelector`) |
| Paginação via requests | `MutationObserver` / listener de scroll infinito |
| Banco de dados (`suggestions`) | `chrome.storage.local` |
| API `GET /suggestions` | `chrome.runtime.sendMessage` (content script ↔ background ↔ popup) |
| Dashboard web separado | Badge inline no card + popup/side panel |
| Job agendado (cron) | Listener de navegação + botão "reprocessar" no popup |
| Link "abrir na Alura" | Não aplicável — a extensão já está na Alura |

**Regra para o agente:** ao gerar qualquer artefato (código, schema, endpoint), ignorar completamente auth/scraping/backend/banco relacional. Se algo pedir isso, tratar como resquício da spec antiga e adaptar para o modelo client-side.

---

## 3. Dados a extrair de cada card (modelo mínimo)

```ts
interface Suggestion {
  sourceId: string | null;      // extraído de data-id, href, ou similar, se existir
  dedupHash: string;            // fallback: hash(titulo + descricao) se sourceId ausente
  tipoNativo: "Ortografia" | "Link" | "Técnico" | "Vídeo";
  titulo: string;
  descricao: string;
  criadoPor: string | null;     // null se conta privada
  urlOrigem: string;            // URL da página/card de origem
  createdAt: string | null;     // se existir no DOM
  collectedAt: string;          // timestamp de quando a extensão leu o card
  triageScore: number;          // 0–100
  triageLabel: string;          // ex.: "alta prioridade" | "revisar" | "provável spam"
  flags: string[];              // motivos que geraram o score (ex.: "texto_curto", "link_externo")
  tagged: boolean;              // já recebeu badge injetado nesta sessão

  // Campos específicos para tipoNativo === "Ortografia" (extraídos da visão de detalhe/diff)
  trechoOriginal?: string;      // linha(s) destacada(s) no bloco esquerdo do diff
  trechoSugerido?: string;      // linha(s) destacada(s) no bloco direito do diff
  cursoRelacionado?: string;    // nome do curso extraído do cabeçalho ("Enunciado da atividade do curso ...")
}
```

Chave de deduplicação: `sourceId` (preferencial) → `dedupHash` (fallback).

---

## 4. Arquitetura / Fluxo

```
[Página Alura - Sugestões]
        │
        ▼
[Content Script: observer.js] ── MutationObserver detecta novos cards
        │
        ▼
[Content Script: parser.js] ── extrai campos mínimos do card (DOM)
        │
        ▼
[shared/triage.js] ── calcula triageScore, triageLabel, flags (lógica pura, sem I/O)
        │
        ▼
[chrome.storage.local] ── upsert por dedupHash/sourceId (evita retriagem)
        │
        ▼
[Content Script: injector.js] ── injeta badge/tag no DOM ao lado do card
        │
        ▼
[Popup] ── lê chrome.storage.local, exibe lista filtrável/ordenável
        │
[Background/service-worker] ── mensageria, contadores, cálculo pesado (dedup por similaridade, se aplicável)
```

Fluxo de decisão ao processar um card:
1. Card novo detectado pelo `MutationObserver`.
2. Extrai campos → calcula `dedupHash`/`sourceId`.
3. Consulta `chrome.storage.local`: já existe?
   - **Sim** → reaplica a tag já salva (sem recalcular).
   - **Não** → roda `triage.js`, persiste, injeta badge.

---

## 5. Estrutura real da página (confirmado via prints)

Esta seção documenta a estrutura visual observada na página de Sugestões da Alura, servindo de base para o mapeamento dos seletores CSS (`selectors.js`).

### 5.1 Visão de lista (card de sugestão)

Cada item da lista de sugestões contém, visualmente:

- **Bloco do autor** (canto esquerdo): foto/avatar do aluno, nome, tempo relativo de criação (ex.: "criado 11 minutos atrás").
- **Bloco de texto** (centro), de cima para baixo:
  1. **Curso relacionado** — texto em negrito, formato observado: `"Enunciado da atividade do curso <Nome do Curso>: <título da atividade>"`.
  2. **Descrição** — truncada com limite de caracteres (aparece cortada com "..." na listagem).
  3. **Classificação/tipo** já atribuído — ex.: "Problema com áudio ou vídeo", "Correção ortográfica" — aparece como um link/label clicável abaixo da descrição.
- **Bloco à direita**: um contador numérico (provavelmente votos/relevância, ex.: "0") e um checkbox (provavelmente para seleção/ação em lote — a confirmar utilidade).

> Nota: o rótulo de tipo aparente na listagem ("Problema com áudio ou vídeo") pode não corresponder 1:1 aos 4 tipos nativos originalmente listados (Ortografia/Link/Técnico/Vídeo) — parece haver subcategorias dentro de "Técnico" ou similar. **Confirmar o dicionário completo de rótulos possíveis antes de fixar o enum de `tipoNativo`.**

### 5.2 Visão de detalhe (ao clicar em uma sugestão)

Ao abrir o item, a página muda para uma visão de detalhe com:

- **Descrição completa** (sem truncamento) — label `Descrição:`.
- **Tipo da sugestão** — label `Tipo da sugestão:` (ex.: "Correção ortográfica").
- **Autor e data completa** — label no formato `Criado por <Nome> em <DD/MM/AAAA>`.
- Botão **"Ver Enunciado da Atividade"** (abre/mostra o enunciado do curso relacionado).
- **Caso o tipo seja "Correção ortográfica"**: um diff lado a lado (dois blocos de código/texto numerados por linha):
  - Bloco esquerdo = texto original, com o trecho a corrigir destacado em vermelho/riscado.
  - Bloco direito = texto sugerido, com a correção destacada em verde.
  - Ambos os blocos têm numeração de linha (formato de editor de código/enunciado da atividade).

> Esse diff é um dado valioso para a triagem: para sugestões de tipo "Correção ortográfica", dá pra extrair especificamente **o trecho alterado** (não só a descrição genérica), o que pode gerar um `flag` mais preciso (ex.: `alteracao_trivial` vs. `alteracao_relevante`) comparando tamanho/natureza da mudança.

### 5.3 Implicações para o parser

- O parser precisa lidar com **duas visões diferentes do mesmo dado**: card resumido (lista) e detalhe completo (ao abrir). Decidir se a extensão:
  - (a) processa a triagem já na listagem, usando só os campos truncados disponíveis ali, ou
  - (b) espera o usuário abrir o item para então capturar dados completos (mais preciso, mas exige interação).
  - **Recomendação:** rodar triagem "leve" na listagem (com o que está disponível) e permitir reprocessamento/refinamento quando o item é aberto (o parser de detalhe sobrescreve o registro no storage com dados mais completos, incluindo o diff quando aplicável).
- Para sugestões do tipo ortográfico, extrair também `trechoOriginal` e `trechoSugerido` (do diff) como campos adicionais no schema (ver seção 3), úteis tanto para exibição no popup quanto para regras de triagem mais finas.

---

## 6. Estrutura de arquivos sugerida

```
extensao-sugestoes/
├── manifest.json          # permissions: storage, scripting; content_scripts em domínio da Alura
├── content/
│   ├── selectors.js        # seletores CSS do card de sugestão (PENDENTE DE MAPEAMENTO — ver seção 7)
│   ├── parser.js           # extrai campos do card
│   ├── observer.js         # detecta novos cards (MutationObserver / scroll infinito)
│   ├── injector.js         # injeta badge/tag no DOM
│   └── index.js            # orquestra: observer -> parser -> triage -> storage -> injector
├── shared/
│   └── triage.js           # regras de score/label/flags (lógica pura, testável isoladamente)
├── background/
│   └── service-worker.js   # mensageria, contadores, cálculo pesado opcional
└── popup/
    ├── popup.html
    └── popup.js             # lista filtrável lendo do chrome.storage.local
```

---

## 7. Backlog adaptado (User Stories)

### EPIC 1 — Leitura e persistência local

**US 1.1 — Detectar e ler cards de sugestão**
Como extensão, quero identificar e extrair dados dos cards renderizados na página, para triá-los sem depender de scraping HTTP.
**Aceite:**
- Seletores CSS mapeados e validados contra a página real.
- `MutationObserver` reprocessa apenas nós novos (evita reprocessar tudo a cada mutação).
- Se a lista pagina/scrolla, a extensão continua capturando itens além da primeira leva.

**US 1.2 — Sessão do usuário (sem autenticação própria)**
Como extensão, não preciso autenticar — dependo da sessão já ativa da aba.
**Aceite:**
- Se o usuário não estiver logado/o card não existir, a extensão simplesmente não injeta nada (sem erro visível).

**US 1.3 — Deduplicação e persistência local**
Como extensão, quero salvar o resultado da triagem sem duplicar processamento.
**Aceite:**
- Upsert em `chrome.storage.local` por `sourceId` (preferencial) ou `dedupHash`.
- `criadoPor` pode ser `null` sem quebrar o fluxo.

**US 1.4 — Reprocessamento incremental**
Como extensão, quero evitar recalcular triagem de itens já vistos.
**Aceite:**
- Antes de rodar `triage.js`, verifica se o hash já existe no storage; se sim, reaplica a tag salva.

### EPIC 2 — Triagem (praticamente inalterada da spec anterior)

**US 2.1 — Score + label + motivos**
**Aceite:** toda sugestão processada recebe `triageScore` (0–100), `triageLabel` e `flags` persistidos localmente; regras/limiares configuráveis em um único módulo (`triage.js`).

**US 2.2 — Regras mínimas de spam (MVP)**
**Aceite:** penaliza texto muito curto/muito longo, links externos, repetição excessiva, keywords suspeitas.

**US 2.3 — Duplicidade por similaridade (V2, opcional)**
**Aceite:** se necessário, mover cálculo (TF-IDF/embeddings) para o `background/service-worker.js` para não travar a thread da página.

### EPIC 3 — Interface (badge inline + popup)

**US 3.1 — Badge inline no card**
Como revisor, quero ver a prioridade direto no card, sem abrir nada.
**Aceite:** badge com cor por `triageLabel` e texto com `triageScore`, inserido de forma não-invasiva (não quebra o layout original do card).

**US 3.2 — Popup com lista filtrável**
Como revisor, quero um resumo consolidado fora da página.
**Aceite:** popup lê do `chrome.storage.local`; filtros por `tipoNativo`, `triageLabel`, faixa de score; ordenação por score desc / data desc.

**US 3.3 — Detalhe de motivos**
Como revisor, quero ver por que algo foi marcado.
**Aceite:** tooltip ou expansão no badge/popup mostrando `flags`.

*(A US "abrir na Alura" da spec antiga não se aplica — a extensão já roda na própria página.)*

### EPIC 4 — Operação da extensão

**US 4.1 — Trigger automático + manual**
**Aceite:** content script ativa via `matches` no manifest ao entrar na página de sugestões; botão "reprocessar" no popup força nova varredura.

**US 4.2 — Observabilidade local**
**Aceite:** contadores (novos/duplicados/erros) guardados no storage e exibidos no popup; badge de erro no ícone da extensão em caso de falha de parsing.

**US 4.3 — Retry/backoff**
**Aceite:** só relevante se houver alguma chamada de rede (ex.: buscar metadado extra); não se aplica à leitura pura de DOM.

---

## 8. Decisões pendentes (bloqueiam início da implementação)

Estas confirmações devem ser resolvidas **antes** de o agente gerar `selectors.js` e `parser.js`. Estrutura visual já confirmada via prints (seção 5); os pontos abaixo ainda dependem de inspeção do HTML real (DevTools) ou de mais exemplos:

- [ ] Seletores CSS reais (classes/IDs) do card na listagem e da tela de detalhe — os prints mostram o *layout visual*, mas o agente precisa do HTML/DOM real para escrever `querySelector` confiável.
- [ ] Onde `sourceId` fica disponível (atributo `data-id`, `href` do card/link, parâmetro de URL ao abrir o detalhe, etc.) ou se será só `dedupHash`.
- [ ] Dicionário completo de rótulos de tipo possíveis (confirmado até agora: "Correção ortográfica", "Problema com áudio ou vídeo" — mapear os demais rótulos existentes e como eles se relacionam com o enum original Ortografia/Link/Técnico/Vídeo).
- [ ] Como a lista pagina/scrolla (URL muda ao clicar em uma sugestão? é modal/rota separada? scroll infinito na listagem?) — define se basta `MutationObserver` simples ou se precisa também de listener de clique/navegação.
- [ ] Se o checkbox e o contador numérico visíveis na listagem são relevantes para a triagem (ex.: contador = votos de relevância?) ou podem ser ignorados.
- [ ] Domínio(s) exato(s) onde o content script deve rodar (`matches` no manifest).
- [ ] Visual do badge (cor por label, posição no card, ícone, tooltip) — considerar não sobrepor o contador/checkbox já existentes no layout.
- [ ] Se algum dado sairá do navegador (telemetria) — se sim, volta a discutir backend; se não, tudo fica local.

---

## 9. Instrução para o agente

Ao implementar:
1. Priorizar a estrutura de arquivos da seção 5.
2. Portar a lógica de `triage.js` como função pura (sem dependência de DOM ou storage), para facilitar testes unitários.
3. Não implementar nada relacionado a autenticação, scraping HTTP, banco de dados relacional ou API externa — está fora de escopo.
4. Tratar a seção 7 como checklist de perguntas a fazer ao usuário antes de codar `selectors.js`/`parser.js`, caso as respostas não estejam disponíveis.
