/**
 * PlanoMEC — UI do plano de aula semanal (formato model.docx)
 */

const state = {
  step: 1,
  totalSteps: 4,
  form: {
    escola: "",
    professor: "",
    turma: "",
    quantidadeCriancas: "",
    dataInicio: "",
    dataFim: "",
    faixaEtaria: "EI03",
    tema: "",
    campos: [],
    objetivosManuais: [],
    materiais: "",
    observacoes: "",
    inclusao: "",
    usarGrokSemana: false,
  },
  plano: null,
};

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

/** Lê .value com segurança (nunca lança se o elemento não existir) */
function val(sel, fallback) {
  const el = typeof sel === "string" ? $(sel) : sel;
  if (!el) return fallback != null ? fallback : "";
  if (el.value == null) return fallback != null ? fallback : "";
  return String(el.value);
}

function valTrim(sel, fallback) {
  return val(sel, fallback != null ? fallback : "").trim();
}

function toast(msg, ms) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () {
    el.classList.remove("show");
  }, ms || 3500);
}

/** Data local no formato YYYY-MM-DD (sem surpresas de fuso do toISOString) */
function isoLocal(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

async function init() {
  // Período padrão: segunda a sexta da semana atual (próxima semana no fim de semana)
  const hoje = new Date();
  const segunda = new Date(hoje);
  const diaSemana = hoje.getDay(); // 0=dom … 6=sáb
  if (diaSemana === 0) segunda.setDate(hoje.getDate() + 1);
  else if (diaSemana === 6) segunda.setDate(hoje.getDate() + 2);
  else segunda.setDate(hoje.getDate() - (diaSemana - 1));
  const sexta = new Date(segunda);
  sexta.setDate(segunda.getDate() + 4);
  state.form.dataInicio = isoLocal(segunda);
  state.form.dataFim = isoLocal(sexta);

  renderFaixas();
  renderCampos();
  renderTemas();
  bindNav();
  bindForms();
  bindGrokUI();
  goStep(1);
  updateStepsUI();

  await bootstrapKeyFromServer();
  // Sem créditos no Grok: se não houver Gemini, preferir gemini na UI
  const cfg = getLlmConfig();
  if (cfg.provider === "grok" && !cfg.geminiKey) {
    // mantém grok se usuário quiser, mas status avisa
  }
  updateAiStatus();
}

function renderFaixas() {
  const grid = $("#faixa-grid");
  grid.innerHTML = Object.values(FAIXAS_ETARIAS)
    .map(function (f) {
      const sel = state.form.faixaEtaria === f.id;
      return (
        '<button type="button" class="faixa-card ' +
        (sel ? "selected" : "") +
        '" data-faixa="' +
        f.id +
        '" aria-pressed="' +
        sel +
        '"><div class="code">' +
        f.id +
        "</div><strong>" +
        f.nome +
        "</strong><span>" +
        f.faixa +
        "<br>" +
        f.descricao +
        "</span></button>"
      );
    })
    .join("");

  grid.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-faixa]");
    if (!btn) return;
    state.form.faixaEtaria = btn.dataset.faixa;
    state.form.objetivosManuais = [];
    $$(".faixa-card").forEach(function (c) {
      const sel = c.dataset.faixa === state.form.faixaEtaria;
      c.classList.toggle("selected", sel);
      c.setAttribute("aria-pressed", sel);
    });
    renderObjetivos();
  });
}

function renderCampos() {
  const grid = $("#campo-grid");
  grid.innerHTML = CAMPOS_EXPERIENCIA.map(function (c) {
    return (
      '<button type="button" class="campo-card" data-campo="' +
      c.id +
      '" aria-pressed="false"><div class="campo-head"><span class="campo-dot ' +
      c.cor +
      '" aria-hidden="true"></span><strong>' +
      c.nome +
      "</strong></div><p>" +
      c.descricao +
      "</p></button>"
    );
  }).join("");

  grid.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-campo]");
    if (!btn) return;
    const id = btn.dataset.campo;
    const idx = state.form.campos.indexOf(id);
    if (idx >= 0) state.form.campos.splice(idx, 1);
    else state.form.campos.push(id);
    btn.classList.toggle("selected", state.form.campos.includes(id));
    btn.setAttribute("aria-pressed", state.form.campos.includes(id));
    updateDireitosPreview();
    renderObjetivos();
  });
}

function renderTemas() {
  const row = $("#temas-sugeridos");
  row.innerHTML = TEMAS_SUGERIDOS.map(function (t) {
    return '<button type="button" class="tema-chip" data-tema="' + t + '">' + t + "</button>";
  }).join("");

  row.addEventListener("click", function (e) {
    const chip = e.target.closest("[data-tema]");
    if (!chip) return;
    $("#input-tema").value = chip.dataset.tema;
    state.form.tema = chip.dataset.tema;
    aplicarSugestaoCampos(chip.dataset.tema);
  });
}

function aplicarSugestaoCampos(tema) {
  state.form.campos = sugerirCamposPorTema(tema).slice();
  $$(".campo-card").forEach(function (card) {
    const sel = state.form.campos.includes(card.dataset.campo);
    card.classList.toggle("selected", sel);
    card.setAttribute("aria-pressed", sel);
  });
  updateDireitosPreview();
  renderObjetivos();
  toast("Campos BNCC sugeridos a partir do tema");
}

function updateDireitosPreview() {
  const box = $("#direitos-preview");
  if (!state.form.campos.length) {
    box.innerHTML =
      '<span class="hint">Selecione ao menos um campo para ver os direitos relacionados.</span>';
    return;
  }
  const mapa = {
    EO: ["Conviver", "Participar", "Conhecer-se"],
    CG: ["Brincar", "Explorar", "Expressar"],
    TS: ["Explorar", "Expressar", "Brincar"],
    EF: ["Expressar", "Participar", "Explorar"],
    ET: ["Explorar", "Brincar", "Participar"],
  };
  const nomes = new Set(["Brincar"]);
  state.form.campos.forEach(function (c) {
    (mapa[c] || []).forEach(function (n) {
      nomes.add(n);
    });
  });
  box.innerHTML = [...nomes]
    .slice(0, 4)
    .map(function (n) {
      return '<span class="direito-chip">' + n + "</span>";
    })
    .join("");
}

function renderObjetivos() {
  const list = $("#objetivos-list");
  if (!state.form.faixaEtaria || !state.form.campos.length) {
    list.innerHTML =
      '<div class="alert alert-info">Selecione a faixa etária e pelo menos um campo de experiência para listar os OADs da BNCC.</div>';
    return;
  }

  const faixa = OBJETIVOS[state.form.faixaEtaria];
  let html = "";
  state.form.campos.forEach(function (campoId) {
    const campo = CAMPOS_EXPERIENCIA.find(function (c) {
      return c.id === campoId;
    });
    const objs = faixa[campoId] || [];
    html +=
      '<p style="font-size:0.78rem;font-weight:700;color:var(--muted);margin:0.75rem 0 0.35rem;text-transform:uppercase;letter-spacing:0.04em">' +
      (campo ? campo.nome : campoId) +
      "</p>";
    html += objs
      .map(function (o) {
        const checked = state.form.objetivosManuais.includes(o.codigo);
        return (
          '<label class="objetivo-item ' +
          (checked ? "selected" : "") +
          '"><input type="checkbox" value="' +
          o.codigo +
          '" ' +
          (checked ? "checked" : "") +
          '><div><div class="codigo">' +
          o.codigo +
          '</div><div class="texto">' +
          o.texto +
          "</div></div></label>"
        );
      })
      .join("");
  });
  list.innerHTML = html;

  list.querySelectorAll("input[type=checkbox]").forEach(function (input) {
    input.addEventListener("change", function () {
      const cod = input.value;
      if (input.checked) {
        if (!state.form.objetivosManuais.includes(cod))
          state.form.objetivosManuais.push(cod);
      } else {
        state.form.objetivosManuais = state.form.objetivosManuais.filter(
          function (c) {
            return c !== cod;
          }
        );
      }
      input.closest(".objetivo-item").classList.toggle("selected", input.checked);
    });
  });
}

function bindForms() {
  const map = {
    "input-escola": "escola",
    "input-professor": "professor",
    "input-turma": "turma",
    "input-qtd": "quantidadeCriancas",
    "input-data-inicio": "dataInicio",
    "input-data-fim": "dataFim",
    "input-tema": "tema",
    "input-materiais": "materiais",
    "input-observacoes": "observacoes",
    "input-inclusao": "inclusao",
  };

  Object.keys(map).forEach(function (id) {
    const key = map[id];
    const el = $("#" + id);
    if (!el) return;
    if (key === "dataInicio") el.value = state.form.dataInicio;
    if (key === "dataFim") el.value = state.form.dataFim;
    el.addEventListener("input", function () {
      state.form[key] = el.value;
      if (key === "tema" && el.value.length > 3 && !state.form.campos.length) {
        const sug = sugerirCamposPorTema(el.value);
        if (sug.length) {
          state.form.campos = sug;
          $$(".campo-card").forEach(function (card) {
            const sel = state.form.campos.includes(card.dataset.campo);
            card.classList.toggle("selected", sel);
            card.setAttribute("aria-pressed", sel);
          });
          updateDireitosPreview();
          renderObjetivos();
        }
      }
    });
  });

  const btnSug = $("#btn-sugerir-campos");
  if (btnSug) {
    btnSug.addEventListener("click", function () {
      const tema = valTrim("#input-tema");
      if (!tema) return toast("Digite um tema primeiro");
      aplicarSugestaoCampos(tema);
    });
  }
}

function bindNav() {
  // Etapas anteriores viram atalho de navegação (voltar direto)
  $$(".step-item").forEach(function (item) {
    item.addEventListener("click", function () {
      const alvo = Number(item.dataset.step);
      if (alvo < state.step) goStep(alvo);
    });
  });

  $("#btn-next").addEventListener("click", function () {
    if (!validateStep(state.step)) return;
    if (state.step < state.totalSteps) goStep(state.step + 1);
  });
  $("#btn-prev").addEventListener("click", function () {
    if (state.step > 1) goStep(state.step - 1);
  });
  const btnGerar = $("#btn-gerar");
  if (btnGerar) {
    btnGerar.addEventListener("click", function () {
      try {
        if (!validateStep(state.step)) return;
        gerar();
      } catch (e) {
        console.error(e);
        toast("Erro: " + ((e && e.message) || e), 5000);
      }
    });
  }
  if ($("#btn-prompt-externo")) {
    $("#btn-prompt-externo").addEventListener("click", function () {
      syncForm();
      if (!state.form.tema) {
        state.form.tema = valTrim("#input-tema");
      }
      if (!state.form.tema) {
        toast("Informe o tema da semana antes de gerar o prompt");
        goStep(2);
        const el = $("#input-tema");
        if (el) el.focus();
        return;
      }
      abrirModalPrompt({
        motivo:
          "Use este prompt na LLM que preferir (ChatGPT, Gemini, Claude…). Não depende do token do app.",
      });
    });
  }
  if ($("#btn-prompt-resultado")) {
    $("#btn-prompt-resultado").addEventListener("click", function () {
      syncForm();
      abrirModalPrompt({
        incluirPlano: true,
        motivo:
          "Melhore o rascunho do app ou continue o planejamento com mais detalhes na sua IA favorita.",
      });
    });
  }
  $("#btn-novo").addEventListener("click", function () {
    const res = $("#resultado");
    if (res) {
      res.classList.remove("visible");
      res.hidden = true;
    }
    setResultStatus("", "");
    state.plano = null;
    $(".wizard").classList.remove("hidden");
    goStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#btn-imprimir").addEventListener("click", function () {
    if (!state.plano) {
      toast("Gere o relatório antes de imprimir");
      return;
    }
    // Garante que o HTML do relatório está visível
    const res = $("#resultado");
    if (res) {
      res.classList.add("visible");
      res.hidden = false;
    }
    setTimeout(function () {
      window.print();
    }, 100);
  });
  $("#btn-copiar").addEventListener("click", async function () {
    if (!state.plano) return;
    try {
      await navigator.clipboard.writeText(planoParaTexto(state.plano));
      toast("Texto copiado");
    } catch {
      toast("Não foi possível copiar");
    }
  });
  $("#btn-docx").addEventListener("click", baixarDocx);

  // Banner de status no resultado (retry IA / prompt)
  document.addEventListener("click", function (e) {
    const t = e.target;
    if (!t || !t.getAttribute) return;
    const action = t.getAttribute("data-action");
    if (action === "retry-ia") {
      e.preventDefault();
      retryIa();
    } else if (action === "prompt") {
      e.preventDefault();
      abrirModalPrompt({
        incluirPlano: true,
        motivo:
          "Cole na LLM de sua preferência. Já inclui seus dados e o rascunho do plano.",
      });
    }
  });

  if ($("#btn-retry-ia")) {
    $("#btn-retry-ia").addEventListener("click", function () {
      retryIa();
    });
  }
}

function bindGrokUI() {
  const modal = $("#modal-config");
  const select = $("#select-provider");

  function showProviderPanels(provider) {
    ["gemini", "ollama", "grok", "local"].forEach(function (id) {
      const panel = $("#panel-" + id);
      if (panel) panel.hidden = id !== provider;
    });
  }

  $("#btn-config").addEventListener("click", function () {
    const cfg = getLlmConfig();
    select.value = cfg.provider || "gemini";
    $("#input-gemini-key").value = cfg.geminiKey || "";
    $("#input-api-key").value = cfg.grokKey || "";
    $("#input-ollama-url").value = cfg.ollamaUrl || "http://127.0.0.1:11434";
    $("#input-ollama-model").value = cfg.ollamaModel || "llama3.2";
    $("#toggle-show-key").checked = false;
    $("#input-gemini-key").type = "password";
    $("#input-api-key").type = "password";
    showProviderPanels(select.value);
    if (modal.showModal) modal.showModal();
  });

  select.addEventListener("change", function () {
    showProviderPanels(select.value);
  });

  $("#toggle-show-key").addEventListener("change", function () {
    const t = this.checked ? "text" : "password";
    $("#input-gemini-key").type = t;
    $("#input-api-key").type = t;
  });

  $("#btn-salvar-key").addEventListener("click", function () {
    saveLlmConfig({
      provider: select.value,
      geminiKey: $("#input-gemini-key").value,
      grokKey: $("#input-api-key").value,
      ollamaUrl: $("#input-ollama-url").value,
      ollamaModel: $("#input-ollama-model").value,
    });
    updateAiStatus();
    if (modal.close) modal.close();
    toast("IA: " + providerLabel(select.value));
  });

  $("#btn-limpar-key").addEventListener("click", function () {
    saveLlmConfig({ geminiKey: "", grokKey: "" });
    $("#input-gemini-key").value = "";
    $("#input-api-key").value = "";
    updateAiStatus();
    toast("Chaves removidas");
  });

  if ($("#btn-prompt-from-config")) {
    $("#btn-prompt-from-config").addEventListener("click", function () {
      syncForm();
      if (modal && modal.close) modal.close();
      abrirModalPrompt({
        incluirPlano: Boolean(state.plano),
        motivo:
          "Alternativa sem token: cole este prompt na LLM de sua preferência.",
      });
    });
  }

  bindPromptModal();

  $("#btn-gerar-ideias").addEventListener("click", onGerarIdeias);
  const dica = $("#input-dica-ia");
  if (dica) {
    dica.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        onGerarIdeias();
      }
    });
  }
}

function updateAiStatus() {
  const el = $("#ai-status");
  if (!el) return;
  const cfg = getLlmConfig();
  const p = cfg.provider || "gemini";
  if (p === "local") {
    el.textContent = "Sem IA (motor local)";
    el.className = "ai-status";
    return;
  }
  if (p === "ollama") {
    el.textContent = "Ollama local";
    el.className = "ai-status ok";
    return;
  }
  if (p === "gemini" && (cfg.geminiKey || hasLlmReady())) {
    el.textContent = "Gemini OK";
    el.className = "ai-status ok";
    return;
  }
  if (p === "grok" && cfg.grokKey) {
    el.textContent = "Grok (precisa créditos)";
    el.className = "ai-status warn";
    return;
  }
  el.textContent = "Configure ⚙ IA (Gemini grátis)";
  el.className = "ai-status warn";
}

async function onGerarIdeias() {
  const btn = $("#btn-gerar-ideias");
  const box = $("#ideias-resultado");
  const cfg = getLlmConfig();

  if (cfg.provider === "local") {
    toast("Modo sem IA — escolha Gemini ou Ollama em ⚙ IA");
    return;
  }
  if (cfg.provider === "gemini" && !cfg.geminiKey) {
    toast("Cole a chave Gemini em ⚙ IA (é grátis)");
    const modal = $("#modal-config");
    if (modal && modal.showModal) {
      $("#select-provider").value = "gemini";
      modal.showModal();
    }
    return;
  }
  if (cfg.provider === "grok" && !cfg.grokKey) {
    toast("Grok sem chave — prefira Gemini grátis em ⚙ IA");
    return;
  }

  btn.classList.add("loading");
  btn.disabled = true;
  box.hidden = false;
  box.innerHTML =
    '<div class="alert alert-info">Consultando ' +
    escapeHtml(providerLabel(cfg.provider)) +
    "…</div>";
  try {
    const ideias = await gerarIdeiasLlm({
      faixaEtaria: state.form.faixaEtaria,
      campos: state.form.campos,
      dica: ($("#input-dica-ia") && $("#input-dica-ia").value) || "",
    });
    renderIdeias(ideias);
    toast(ideias.length + " ideias — clique para usar");
  } catch (err) {
    box.innerHTML =
      '<div class="alert alert-warn">' +
      escapeHtml((err && err.message) || "Falha") +
      "</div>";
    toast("Falha ao gerar ideias");
  } finally {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

function renderIdeias(ideias) {
  const box = $("#ideias-resultado");
  box.hidden = false;
  box._ideias = ideias;
  box.innerHTML = ideias
    .map(function (ideia, i) {
      return (
        '<button type="button" class="ideia-card" data-ideia-idx="' +
        i +
        '"><strong>' +
        escapeHtml(ideia.titulo) +
        "</strong><p>" +
        escapeHtml(ideia.descricao) +
        '</p><div class="ideia-meta">' +
        (ideia.campos || [])
          .map(function (c) {
            return '<span class="mini-tag">' + escapeHtml(c) + "</span>";
          })
          .join("") +
        '<span class="ideia-action">Usar este tema →</span></div></button>'
      );
    })
    .join("");
  box.querySelectorAll("[data-ideia-idx]").forEach(function (card) {
    card.addEventListener("click", function () {
      aplicarIdeia(box._ideias[Number(card.dataset.ideiaIdx)]);
    });
  });
}

function aplicarIdeia(ideia) {
  if (!ideia) return;
  const temaEl = $("#input-tema");
  if (temaEl) temaEl.value = ideia.titulo;
  state.form.tema = ideia.titulo;
  const camposValidos = (ideia.campos || []).filter(function (c) {
    return CAMPOS_EXPERIENCIA.some(function (x) {
      return x.id === c;
    });
  });
  if (camposValidos.length) {
    state.form.campos = camposValidos;
    $$(".campo-card").forEach(function (card) {
      const sel = state.form.campos.includes(card.dataset.campo);
      card.classList.toggle("selected", sel);
      card.setAttribute("aria-pressed", sel);
    });
    updateDireitosPreview();
    renderObjetivos();
  } else {
    aplicarSugestaoCampos(ideia.titulo);
  }
  toast("Tema aplicado: " + ideia.titulo);
}

function goStep(n) {
  state.step = n;
  $$(".panel").forEach(function (p) {
    p.classList.remove("active");
  });
  const panel = $("#step-" + n);
  if (panel) panel.classList.add("active");
  updateStepsUI();
  const btnPrev = $("#btn-prev");
  if (btnPrev) btnPrev.style.visibility = n === 1 ? "hidden" : "visible";
  const btnNext = $("#btn-next");
  const btnGerar = $("#btn-gerar");
  const btnPrompt = $("#btn-prompt-externo");
  if (n === state.totalSteps) {
    if (btnNext) btnNext.hidden = true;
    if (btnGerar) btnGerar.hidden = false;
    if (btnPrompt) btnPrompt.hidden = false;
  } else {
    if (btnNext) btnNext.hidden = false;
    if (btnGerar) btnGerar.hidden = true;
    if (btnPrompt) btnPrompt.hidden = true;
  }
  if (n === 3) renderObjetivos();
  if (n === 2) updateDireitosPreview();
}

function updateStepsUI() {
  $$(".step-item").forEach(function (item) {
    const s = Number(item.dataset.step);
    item.classList.toggle("active", s === state.step);
    item.classList.toggle("done", s < state.step);
    if (item.tagName === "BUTTON") item.disabled = s >= state.step;
    if (s === state.step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
}

function validateStep(step) {
  if (step === 1) {
    const prof = valTrim("#input-professor");
    if (!prof) {
      toast("Informe o nome do(a) professor(a)");
      const el = $("#input-professor");
      if (el) el.focus();
      return false;
    }
    const ini = val("#input-data-inicio");
    const fim = val("#input-data-fim");
    if (ini && fim && fim < ini) {
      toast("O fim do período não pode ser antes do início");
      const el = $("#input-data-fim");
      if (el) el.focus();
      return false;
    }
  }
  if (step === 2) {
    const tema = valTrim("#input-tema");
    if (!tema) {
      toast("Informe o tema da semana");
      const el = $("#input-tema");
      if (el) el.focus();
      return false;
    }
    state.form.tema = tema;
    if (!state.form.campos || !state.form.campos.length) {
      // não bloqueia: sugere campos automaticamente
      state.form.campos = sugerirCamposPorTema(tema);
      if (!state.form.campos.length) {
        toast("Selecione ao menos um campo de experiência");
        return false;
      }
    }
  }
  return true;
}

function syncForm() {
  try {
    state.form.escola = valTrim("#input-escola");
    state.form.professor = valTrim("#input-professor");
    state.form.turma = valTrim("#input-turma");
    state.form.quantidadeCriancas = valTrim("#input-qtd");
    state.form.dataInicio = val("#input-data-inicio");
    state.form.dataFim = val("#input-data-fim");
    state.form.tema = valTrim("#input-tema");
    state.form.materiais = val("#input-materiais");
    state.form.observacoes = val("#input-observacoes");
    state.form.inclusao = val("#input-inclusao");
  } catch (e) {
    console.warn("syncForm:", e);
  }
}

function mostrarRelatorio(plano, msg) {
  state.plano = plano;
  renderPlano(plano);
  const wizard = $(".wizard");
  if (wizard) wizard.classList.add("hidden");
  const res = $("#resultado");
  if (res) {
    res.classList.add("visible");
    res.hidden = false;
    requestAnimationFrame(function () {
      res.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (msg) toast(msg);
}

function setResultStatus(kind, html) {
  const el = $("#result-status");
  if (!el) return;
  el.hidden = !html;
  el.className = "result-status" + (kind ? " is-" + kind : "");
  el.innerHTML = html || "";
}

function podeUsarIa() {
  const cfg = getLlmConfig();
  if (!cfg || cfg.provider === "local") return false;
  if (cfg.provider === "ollama") return true;
  if (cfg.provider === "gemini") {
    return Boolean(cfg.geminiKey) || serverHasGemini || hasLlmReady();
  }
  if (cfg.provider === "grok") {
    return Boolean(cfg.grokKey) || serverHasGrok;
  }
  return hasLlmReady();
}

function mergeIaNoPlano(plano, ia) {
  if (!plano || !ia || !ia.dias) return plano;
  ["segunda", "quarta", "quinta", "sexta"].forEach(function (d) {
    if (ia.dias[d] && plano.dias[d]) {
      const src = ia.dias[d];
      ["lancamento", "planejamento", "paraCasa", "motoraFina", "patio"].forEach(
        function (k) {
          if (src[k]) plano.dias[d][k] = src[k];
        }
      );
    }
  });
  if (Array.isArray(ia.oads) && ia.oads.length) plano.oads = ia.oads;
  if (ia.entrada) plano.entrada = ia.entrada;
  if (ia.rotinaDiaria) plano.rotinaDiaria = ia.rotinaDiaria;
  if (ia.lanche) plano.lanche = ia.lanche;
  if (ia.saida) plano.saida = ia.saida;
  plano.meta = plano.meta || {};
  plano.meta.fonteIa = true;
  return plano;
}

function prepararFormParaGerar() {
  syncForm();
  if (!state.form.professor) {
    state.form.professor = valTrim("#input-professor") || "Professor(a)";
  }
  if (!state.form.tema) {
    state.form.tema = valTrim("#input-tema") || "Experiências da semana";
  }
  if (!state.form.campos || !state.form.campos.length) {
    state.form.campos = sugerirCamposPorTema(state.form.tema);
  }
  if (!state.form.faixaEtaria) state.form.faixaEtaria = "EI03";
  return state.form;
}

async function aprimorarComIa(plano) {
  const cfg = getLlmConfig();
  setResultStatus(
    "loading",
    '<span class="status-spinner" aria-hidden="true"></span> Aprimorando com <strong>' +
      escapeHtml(providerLabel(cfg.provider)) +
      "</strong>… (pode levar até 40s)"
  );

  const ia = await Promise.race([
    gerarSemanaComLlm({
      tema: state.form.tema,
      faixaEtaria: state.form.faixaEtaria,
      campos: state.form.campos,
      professor: state.form.professor,
      materiais: state.form.materiais,
      observacoes: state.form.observacoes,
    }),
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error("Tempo esgotado na IA (55s)"));
      }, 55000);
    }),
  ]);

  mergeIaNoPlano(plano, ia);
  state.plano = plano;
  renderPlano(plano);
  setResultStatus(
    "ok",
    "✓ Plano aprimorado com <strong>" +
      escapeHtml(providerLabel(cfg.provider)) +
      "</strong>. Você pode imprimir, baixar Word ou copiar o texto."
  );
  toast("Plano atualizado com IA", 4000);
  return plano;
}

async function gerar() {
  const btn = $("#btn-gerar");
  if (btn) {
    btn.classList.add("loading");
    btn.disabled = true;
  }

  let plano;
  try {
    prepararFormParaGerar();

    if (typeof gerarPlanejamento !== "function") {
      throw new Error("Gerador não carregou. Atualize a página com Ctrl+F5.");
    }

    // 1) SEMPRE gera local na hora — nunca depende da rede
    plano = gerarPlanejamento(state.form);
    if (!plano || !plano.dias) {
      throw new Error("O gerador não retornou o plano. Tente de novo.");
    }

    mostrarRelatorio(plano, "Plano gerado! Você já pode imprimir ou baixar Word.");
    setResultStatus(
      "ok",
      "✓ Plano local pronto (BNCC). " +
        (podeUsarIa()
          ? "Aprimorando com IA em seguida…"
          : 'Sem IA configurada — use <button type="button" class="linkish" data-action="prompt">Prompt p/ IA externa</button> se quiser.')
    );
  } catch (e) {
    console.error("gerar:", e);
    toast("Erro ao gerar: " + ((e && e.message) || e), 6000);
    if (btn) {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
    return;
  }

  // 2) IA opcional — se falhar, o plano local permanece válido
  if (podeUsarIa()) {
    try {
      await aprimorarComIa(plano);
    } catch (e) {
      console.warn("IA semana:", e);
      const errMsg = String((e && e.message) || "indisponível");
      setResultStatus(
        "warn",
        "Plano local mantido. IA: " +
          escapeHtml(errMsg.slice(0, 160)) +
          ' · <button type="button" class="linkish" data-action="retry-ia">Tentar IA de novo</button>' +
          ' · <button type="button" class="linkish" data-action="prompt">Prompt p/ IA externa</button>'
      );
      toast("Plano local OK · IA indisponível", 4500);
    }
  }

  if (btn) {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

async function retryIa() {
  if (!state.plano) {
    toast("Gere o plano primeiro");
    return;
  }
  prepararFormParaGerar();
  const btn = $("#btn-retry-ia");
  if (btn) {
    btn.classList.add("loading");
    btn.disabled = true;
  }
  try {
    if (!podeUsarIa()) {
      toast("Configure a IA em ⚙ ou use Prompt externo", 4000);
      setResultStatus(
        "warn",
        'IA não configurada. Abra <strong>⚙ IA</strong> ou use o <button type="button" class="linkish" data-action="prompt">Prompt externo</button>.'
      );
      return;
    }
    await aprimorarComIa(state.plano);
  } catch (e) {
    console.warn(e);
    setResultStatus(
      "warn",
      "Não deu para aprimorar: " +
        escapeHtml(String((e && e.message) || e).slice(0, 160)) +
        ' · <button type="button" class="linkish" data-action="retry-ia">Tentar de novo</button>' +
        ' · <button type="button" class="linkish" data-action="prompt">Prompt p/ IA externa</button>'
    );
    toast("IA falhou · plano local permanece", 4000);
  } finally {
    if (btn) {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }
}

function bindPromptModal() {
  const modal = $("#modal-prompt");
  if (!modal) return;

  function fechar() {
    if (modal.close) modal.close();
  }

  if ($("#btn-fechar-prompt")) {
    $("#btn-fechar-prompt").addEventListener("click", fechar);
  }
  if ($("#btn-fechar-prompt-2")) {
    $("#btn-fechar-prompt-2").addEventListener("click", fechar);
  }
  if ($("#btn-copiar-prompt")) {
    $("#btn-copiar-prompt").addEventListener("click", async function () {
      const ta = $("#textarea-prompt-externo");
      const text = ta ? ta.value : "";
      if (!text) return toast("Nada para copiar");
      try {
        await navigator.clipboard.writeText(text);
        toast("Prompt copiado! Cole na sua IA favorita");
      } catch {
        if (ta) {
          ta.removeAttribute("readonly");
          ta.select();
          try {
            document.execCommand("copy");
            toast("Prompt copiado!");
          } catch {
            toast("Selecione o texto e copie com Ctrl+C");
          }
          ta.setAttribute("readonly", "readonly");
        }
      }
    });
  }
}

/**
 * Abre o modal com prompt montado a partir do formulário.
 * @param {{ motivo?: string, incluirPlano?: boolean, autoCopy?: boolean }} opts
 */
function abrirModalPrompt(opts) {
  opts = opts || {};
  syncForm();

  if (!state.form.professor) {
    state.form.professor = valTrim("#input-professor") || "Professor(a)";
  }
  if (!state.form.tema) {
    state.form.tema = valTrim("#input-tema") || "Experiências da semana";
  }
  if (!state.form.campos || !state.form.campos.length) {
    state.form.campos = sugerirCamposPorTema(state.form.tema);
  }
  if (!state.form.faixaEtaria) state.form.faixaEtaria = "EI03";

  const motivoEl = $("#prompt-motivo");
  if (motivoEl && opts.motivo) {
    motivoEl.innerHTML = "<strong>Dica:</strong> " + escapeHtml(opts.motivo);
  } else if (motivoEl) {
    motivoEl.innerHTML =
      "Copie o texto abaixo e cole no <strong>ChatGPT</strong>, <strong>Gemini</strong>, <strong>Claude</strong> ou outra LLM. Já inclui o que você preencheu no app.";
  }

  const prompt = montarPromptExterno(state.form, {
    motivo: opts.motivo || "",
    planoLocal: opts.incluirPlano && state.plano ? state.plano : null,
  });

  const ta = $("#textarea-prompt-externo");
  if (ta) {
    ta.value = prompt;
    ta.scrollTop = 0;
  }

  const modal = $("#modal-prompt");
  if (modal && modal.showModal) {
    modal.showModal();
  }

  if (opts.autoCopy) {
    navigator.clipboard.writeText(prompt).then(
      function () {
        toast("Prompt copiado!");
      },
      function () {}
    );
  }
}

function renderPlano(p) {
  if (!p || !p.dias) {
    $("#plano-content").innerHTML =
      '<div class="alert alert-warn">Não foi possível montar o relatório. Clique em Gerar de novo.</div>';
    return;
  }

  const diasOrdem = [
    { id: "segunda", nome: "SEGUNDA" },
    { id: "quarta", nome: "QUARTA" },
    { id: "quinta", nome: "QUINTA" },
    { id: "sexta", nome: "SEXTA" },
  ];

  function cells(campo, transform) {
    return diasOrdem
      .map(function (d) {
        const day = p.dias[d.id] || {};
        let v = day[campo] || "";
        if (transform) v = transform(v, day);
        return "<td>" + nl2br(escapeHtml(v)) + "</td>";
      })
      .join("");
  }

  function rowMerged(label, content) {
    return (
      "<tr><th>" +
      escapeHtml(label) +
      '</th><td colspan="4">' +
      nl2br(escapeHtml(content || "")) +
      "</td></tr>"
    );
  }

  const oads = Array.isArray(p.oads)
    ? p.oads
        .map(function (c) {
          return "(" + c + ")";
        })
        .join("; ")
    : p.oads || "";

  const faixaNome = p.faixaEtaria ? p.faixaEtaria.nome : "";
  const faixaFaixa = p.faixaEtaria ? p.faixaEtaria.faixa : "";

  $("#plano-content").innerHTML =
    '<div class="print-hint no-print">' +
    "<strong>Relatório pronto.</strong> Use <em>Imprimir / Salvar PDF</em>, <em>Word (.docx)</em> ou <em>Copiar texto</em>." +
    "</div>" +
    '<article class="plano-doc report-html" id="plano-imprimivel">' +
    '<header class="plano-header">' +
    '<div class="eyebrow">Educação Infantil · BNCC / MEC · Plano semanal</div>' +
    "<h3>PLANO DE AULA SEMANAL — Profª: " +
    escapeHtml(p.professor || "—") +
    "</h3>" +
    '<p class="sub">Período de ' +
    escapeHtml(p.periodo || "—") +
    (p.tema ? " · Tema: " + escapeHtml(p.tema) : "") +
    "</p>" +
    (faixaNome
      ? '<p class="sub">' +
        escapeHtml(faixaNome) +
        " (" +
        escapeHtml(faixaFaixa) +
        ")</p>"
      : "") +
    (p.escola || p.turma
      ? '<p class="sub">' +
        escapeHtml([p.escola, p.turma].filter(Boolean).join(" · ")) +
        "</p>"
      : "") +
    "</header>" +
    '<div class="plano-body">' +
    '<table class="semana-table" role="table">' +
    "<thead><tr><th scope=\"col\"></th><th scope=\"col\">SEGUNDA</th><th scope=\"col\">QUARTA</th><th scope=\"col\">QUINTA</th><th scope=\"col\">SEXTA</th></tr></thead>" +
    "<tbody>" +
    "<tr><th scope=\"row\">LANÇAMENTO DIÁRIO</th>" +
    cells("lancamento") +
    "</tr>" +
    rowMerged("ENTRADA", p.entrada) +
    rowMerged("ROTINA DIÁRIA", p.rotinaDiaria) +
    "<tr><th scope=\"row\">PLANEJAMENTO</th>" +
    cells("planejamento", function (v, day) {
      if (day.paraCasa) return v + "\n\nPARA CASA: " + day.paraCasa;
      return v;
    }) +
    "</tr>" +
    rowMerged("LANCHE", p.lanche) +
    "<tr><th scope=\"row\">COORDENAÇÃO MOTORA FINA</th>" +
    cells("motoraFina") +
    "</tr>" +
    "<tr><th scope=\"row\">PÁTIO / PSICOMOTRICIDADE</th>" +
    cells("patio") +
    "</tr>" +
    rowMerged("SAÍDA", p.saida) +
    "<tr><th scope=\"row\">AJUDANTE DO DIA</th>" +
    cells("ajudante") +
    "</tr>" +
    rowMerged("Objetivos de Aprendizagem e Desenvolvimento (OADs)", oads) +
    "</tbody></table>" +
    '<footer class="plano-footer"><span>Gerado em ' +
    escapeHtml(p.geradoEm || "") +
    " · PlanoMEC</span><span>" +
    escapeHtml((p.meta && p.meta.norma) || "BNCC / DCNEI") +
    "</span></footer>" +
    "</div></article>";
}

function nl2br(s) {
  return String(s || "").replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function planoParaTexto(p) {
  const lines = [];
  lines.push(
    "PLANO DE AULA SEMANAL - Profª: " + p.professor + " - Período de " + p.periodo
  );
  lines.push("Tema: " + (p.tema || ""));
  lines.push("");
  ["segunda", "quarta", "quinta", "sexta"].forEach(function (d) {
    const day = p.dias[d] || {};
    lines.push("=== " + d.toUpperCase() + " ===");
    lines.push("Lançamento: " + (day.lancamento || ""));
    lines.push("Planejamento:\n" + (day.planejamento || ""));
    lines.push("Para casa: " + (day.paraCasa || ""));
    lines.push("Motora fina: " + (day.motoraFina || ""));
    lines.push("Pátio: " + (day.patio || ""));
    lines.push("");
  });
  lines.push("ENTRADA: " + p.entrada);
  lines.push("ROTINA: " + p.rotinaDiaria);
  lines.push("LANCHE: " + p.lanche);
  lines.push("SAÍDA: " + p.saida);
  lines.push(
    "OADs: " +
      (Array.isArray(p.oads)
        ? p.oads.map(function (c) {
            return "(" + c + ")";
          }).join("; ")
        : p.oads)
  );
  return lines.join("\n");
}

async function baixarDocx() {
  if (!state.plano) return toast("Gere o plano primeiro");
  const btn = $("#btn-docx");
  btn.classList.add("loading");
  btn.disabled = true;
  try {
    let res;
    try {
      res = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.plano),
      });
    } catch {
      throw new Error(
        typeof msgSemServidor === "function"
          ? msgSemServidor()
          : "Falha de conexão ao exportar o Word."
      );
    }
    if (!res.ok) {
      const t = await res.text();
      let msg = "Falha ao exportar DOCX";
      try {
        msg = JSON.parse(t).error || msg;
      } catch {
        if (t) msg = t.slice(0, 200);
      }
      if (res.status === 404) {
        msg =
          typeof IS_LOCAL_APP !== "undefined" && !IS_LOCAL_APP
            ? "Exportação indisponível no site agora. Tente de novo em instantes."
            : "Servidor não encontrado. Feche esta página e abra com abrir.bat (http://localhost:3847)";
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const saved = res.headers.get("X-Saved-As") || "plano_semanal.docx";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = saved;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(
      res.headers.get("X-Saved-Folder")
        ? "Word baixado · também em pasta planejamentos/"
        : "Word baixado"
    );
  } catch (e) {
    toast((e && e.message) || "Erro ao baixar Word");
  } finally {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", init);
