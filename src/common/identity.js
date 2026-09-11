/**
 * Identifica o revisor atual, usado nos avisos de presença ("Fulano está
 * revisando"). Pergunta o nome uma única vez (prompt) e guarda em
 * chrome.storage.local; um clientId aleatório identifica esta instalação
 * da extensão para distinguir "eu mesma em outra aba" de "outra pessoa".
 */
const AluraIdentity = (() => {
  const NAME_KEY = "alura_reviewer_name";
  const CLIENT_ID_KEY = "alura_reviewer_client_id";

  function getRaw(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => resolve(result[key] || null));
    });
  }

  function setRaw(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  /** Nome do revisor; pergunta via prompt() na primeira vez. */
  async function getName() {
    const stored = await getRaw(NAME_KEY);
    if (stored) return stored;

    const typed = window.prompt("Presença de revisores: como podemos te chamar?");
    const name = (typed || "").trim() || "Anônimo";
    await setRaw(NAME_KEY, name);
    return name;
  }

  /** ID estável desta instalação da extensão (não é o nome). */
  async function getClientId() {
    const stored = await getRaw(CLIENT_ID_KEY);
    if (stored) return stored;

    const id = `c${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    await setRaw(CLIENT_ID_KEY, id);
    return id;
  }

  return { getName, getClientId };
})();
