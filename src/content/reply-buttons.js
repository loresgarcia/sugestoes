const AluraReplyButtons = (() => {
  const REPLIES = [
    {
      id: "ortografia",
      label: "Ortografia",
      text:
        "Agradeço a sugestão, no entanto, não aplicaremos estas mudanças devido às mesmas modificarem o objetivo original do texto, seja no sentido, ambiguidade, gramática, dentre outros. Continue ajudando a comunidade Alura. Bons estudos!",
    },
    {
      id: "tecnico-nao-se-aplica",
      label: "Técnico (Não se Aplica)",
      text:
        "Agradeço a sugestão, no entanto, não aplicaremos as mudanças propostas devido à sua sugestão alterar o objetivo de aprendizagem técnica da atividade e/ou devido às formatações do texto enviado. Continue ajudando a comunidade Alura. Bons estudos!",
    },
    {
      id: "tecnico-erro",
      label: "Técnico (Erro na sugestão)",
      text:
        "Agradeço a sugestão, no entanto, não aplicaremos as mudanças propostas devido à natureza da atividade atual. Continue ajudando a comunidade Alura. Bons estudos!",
    },
    {
      id: "correcao-sera-feita",
      label: "Correção será feita",
      text:
        "Agradecemos a sugestão! Será aplicada o quanto antes.",
    },
    {
      id: "ortografico-tecnico-spans",
      label: "Ortográfico/Técnico (Spans)",
      text: "Agradecemos o feedback.",
    },
    {
      id: "audio-video",
      label: "Áudio/Vídeo",
      text:
        "Agradeço a sugestão, no entanto, não aplicaremos as mudanças propostas devido a limitações técnicas referentes ao áudio/vídeo. Continue ajudando a comunidade Alura. Bons estudos!",
    },
    {
      id: "link-quebrado",
      label: "Link quebrado",
      text:
        "Agradeço a sugestão! O link foi verificado e corrigido. Continue ajudando a comunidade Alura. Bons estudos!",
    },
  ];

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function showToast(message) {
    const existing = document.querySelector(".alura-reply-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "alura-reply-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("alura-reply-toast--visible"));

    setTimeout(() => {
      toast.classList.remove("alura-reply-toast--visible");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  function injectPanel() {
    if (document.querySelector(".alura-reply-panel")) return;

    const wrapper = document.querySelector(".editorWrapper");
    if (!wrapper) return;

    const panel = document.createElement("div");
    panel.className = "alura-reply-panel";

    const header = document.createElement("div");
    header.className = "alura-reply-panel-header";
    header.textContent = "Respostas Rápidas";
    panel.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "alura-reply-grid";

    REPLIES.forEach((reply) => {
      const btn = document.createElement("button");
      btn.className = "alura-reply-btn";
      btn.textContent = reply.label;
      btn.title = reply.text;
      btn.addEventListener("click", () => {
        copyToClipboard(reply.text).then(() => {
          showToast(`Copiado: ${reply.label}`);
          btn.classList.add("alura-reply-btn--copied");
          setTimeout(() => btn.classList.remove("alura-reply-btn--copied"), 1500);
        });
      });
      grid.appendChild(btn);
    });

    panel.appendChild(grid);
    wrapper.insertBefore(panel, wrapper.firstChild);
  }

  function init() {
    if (AluraSelectors && AluraSelectors.isDetailPage()) {
      injectPanel();
    }
  }

  return { init, injectPanel };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", AluraReplyButtons.init);
} else {
  AluraReplyButtons.init();
}
