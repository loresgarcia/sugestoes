# Política de Privacidade — Alura Sugestões Helper

_Última atualização: agosto de 2026_

## 1. O que é esta extensão

Alura Sugestões Helper é uma extensão para o navegador Chrome (Manifest V3)
desenvolvida para apoiar a área de suporte educacional da Alura a identificar
mais rápido, na página de moderação de sugestões
(`cursos.alura.com.br/suggestions/...`), possível spam, categoria divergente,
texto repetido e sugestões esquecidas. A extensão apenas sinaliza itens com
selos visuais — ela não aprova, não reprova e não descarta nada
automaticamente. Todas as ações continuam manuais, feitas pela pessoa
moderadora usando os próprios controles da Alura.

## 2. Quais dados são utilizados

A extensão lê, localmente no navegador, o conteúdo que já está visível na
página de sugestões carregada (descrição da sugestão, categoria marcada e
data de criação), para calcular os selos exibidos. Nenhum outro dado é lido:
a extensão não acessa cookies, não lê campos de login, não acessa outras
abas nem outros sites.

## 3. Como os dados são usados

Os dados lidos da página são processados inteiramente dentro do navegador de
quem está usando a extensão, apenas para decidir quais selos exibir
(spam, categoria, texto repetido, sugestão antiga) e montar o resumo no topo
da lista. Esse processamento acontece a cada carregamento da página e não
gera nenhum registro persistente: nada é salvo, nada fica armazenado depois
que a aba é fechada ou a página é recarregada.

## 4. Compartilhamento com terceiros

Nenhum. A extensão não faz nenhuma chamada de rede — não existe requisição a
servidores da Alura, da Anthropic ou de qualquer outro serviço. Todo o
processamento é feito localmente, com JavaScript rodando na própria página,
sem se comunicar com nada fora do navegador.

## 5. Dados que não coletamos

- Não coletamos nome, e-mail, CPF ou qualquer dado de identificação pessoal.
- Não coletamos dados de login, senha ou token de sessão.
- Não coletamos localização.
- Não coletamos histórico de navegação ou dados de outras abas/sites.
- Não armazenamos nada em disco, em `localStorage`, em `chrome.storage` ou
  em qualquer banco de dados, local ou remoto.
- Não transmitimos nenhum dado para servidores próprios ou de terceiros.
- A extensão não solicita nenhuma permissão especial no `manifest.json` —
  ela só é ativada dentro da própria página de sugestões da Alura
  (`cursos.alura.com.br/suggestions*`) e não tem acesso a mais nada no
  navegador.

## 6. Contato

Dúvidas sobre esta política ou sobre a extensão podem ser enviadas para
**se.conteudo@alura.com.br**.
