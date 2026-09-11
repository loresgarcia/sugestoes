/**
 * Mostra, na listagem, um aviso quando outra pessoa já está revisando uma
 * sugestão — para evitar que duas pessoas entrem na mesma ao mesmo tempo.
 * Não tem lógica de rede própria; delega a consulta ao AluraPresence.
 */
const AluraPresenceBadge = (() => {
  function injectViewingBadge(row, viewer) {
    if (row.querySelector(".alura-presence-badge")) return;
    const target = row.querySelector(".suggestions-requestSubject") || row;

    const badge = document.createElement("span");
    badge.className = "alura-helper-badge alura-presence-badge";
    badge.textContent = `🔒 ${viewer.nome} está revisando`;
    badge.title = "Outra pessoa abriu esta sugestão recentemente";
    target.appendChild(badge);
  }

  /**
   * @param {HTMLLIElement[]} rows
   * @param {(string|null)[]} sourceIds - paralelo a rows
   * @param {string} myClientId
   */
  async function annotateRows(rows, sourceIds, myClientId) {
    const viewers = await AluraPresence.checkViewers(sourceIds, myClientId);
    rows.forEach((row, i) => {
      const sourceId = sourceIds[i];
      if (sourceId && viewers[sourceId]) {
        injectViewingBadge(row, viewers[sourceId]);
      }
    });
  }

  return { annotateRows };
})();
