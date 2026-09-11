/**
 * Presença "quem está revisando o quê" via REST API do Firebase Realtime
 * Database (sem SDK, sem bundling — só fetch()).
 *
 * Modelo: quem abre uma sugestão manda um sinal de vida a cada HEARTBEAT_MS
 * em presence/{sourceId}. Um registro mais velho que STALE_AFTER_MS é
 * ignorado — cobre o caso de a aba fechar sem avisar (sem depender de
 * onDisconnect, que só existe no SDK com conexão persistente).
 */
const AluraPresence = (() => {
  const HEARTBEAT_MS = 10000;
  const STALE_AFTER_MS = 25000;

  let heartbeatTimer = null;
  let activeSourceId = null;
  let activeClientId = null;

  function presenceUrl(sourceId) {
    return `${AluraFirebaseConfig.databaseURL}/presence/${sourceId}.json`;
  }

  function isFresh(data) {
    return !!data && Date.now() - data.timestamp <= STALE_AFTER_MS;
  }

  async function writePresence(sourceId, nome, clientId) {
    try {
      await fetch(presenceUrl(sourceId), {
        method: "PUT",
        body: JSON.stringify({ nome, clientId, timestamp: Date.now() }),
      });
    } catch (e) {
      // sem rede ou backend fora do ar — falha silenciosa, não bloqueia o revisor
    }
  }

  async function removePresence(sourceId, clientId) {
    try {
      const res = await fetch(presenceUrl(sourceId));
      const current = await res.json();
      if (current && current.clientId === clientId) {
        await fetch(presenceUrl(sourceId), { method: "DELETE" });
      }
    } catch (e) {
      // ignora — pior caso o registro expira sozinho (STALE_AFTER_MS)
    }
  }

  /** Quem está vendo esta sugestão agora, ou null. */
  async function checkViewer(sourceId, excludeClientId) {
    try {
      const res = await fetch(presenceUrl(sourceId));
      const data = await res.json();
      if (!data || data.clientId === excludeClientId || !isFresh(data)) return null;
      return { nome: data.nome, timestamp: data.timestamp };
    } catch (e) {
      return null;
    }
  }

  /** Consulta em lote (uma request só) — usado na listagem. */
  async function checkViewers(sourceIds, excludeClientId) {
    const ids = sourceIds.filter(Boolean);
    if (ids.length === 0) return {};
    try {
      const res = await fetch(`${AluraFirebaseConfig.databaseURL}/presence.json`);
      const all = (await res.json()) || {};
      const result = {};
      ids.forEach((id) => {
        const data = all[id];
        if (data && data.clientId !== excludeClientId && isFresh(data)) {
          result[id] = { nome: data.nome, timestamp: data.timestamp };
        }
      });
      return result;
    } catch (e) {
      return {};
    }
  }

  /** Começa a anunciar presença nesta sugestão (chamar na página de detalhe). */
  function announce(sourceId, nome, clientId) {
    activeSourceId = sourceId;
    activeClientId = clientId;
    writePresence(sourceId, nome, clientId);
    heartbeatTimer = setInterval(() => writePresence(sourceId, nome, clientId), HEARTBEAT_MS);

    window.addEventListener("pagehide", stop);
    window.addEventListener("beforeunload", stop);
  }

  /** Para de anunciar e remove o próprio registro de presença. */
  function stop() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    if (activeSourceId && activeClientId) {
      removePresence(activeSourceId, activeClientId);
    }
    activeSourceId = null;
    activeClientId = null;
  }

  return { announce, stop, checkViewer, checkViewers, STALE_AFTER_MS };
})();
