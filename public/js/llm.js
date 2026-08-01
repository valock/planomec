/**
 * Cliente multi-LLM do PlanoMEC
 * Provedores grátis: Gemini (Google) e Ollama (local)
 * Opcional pago: Grok (xAI)
 */

const LLM_STORAGE = {
  provider: "planomec_llm_provider",
  geminiKey: "planomec_gemini_key",
  grokKey: "planomec_xai_api_key",
  ollamaUrl: "planomec_ollama_url",
  ollamaModel: "planomec_ollama_model",
};

const DEFAULTS = {
  provider: "gemini", // melhor opção grátis na nuvem
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "llama3.2",
  geminiModel: "gemini-flash-latest",
  grokModel: "grok-4.5",
};

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v != null && v !== "" ? v : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    if (value == null || value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) {
    console.warn(e);
  }
}

function getLlmConfig() {
  return {
    provider: lsGet(LLM_STORAGE.provider, DEFAULTS.provider),
    geminiKey: lsGet(LLM_STORAGE.geminiKey, ""),
    grokKey: lsGet(LLM_STORAGE.grokKey, ""),
    ollamaUrl: lsGet(LLM_STORAGE.ollamaUrl, DEFAULTS.ollamaUrl),
    ollamaModel: lsGet(LLM_STORAGE.ollamaModel, DEFAULTS.ollamaModel),
  };
}

function saveLlmConfig(cfg) {
  if (cfg.provider) lsSet(LLM_STORAGE.provider, cfg.provider);
  if (cfg.geminiKey !== undefined) lsSet(LLM_STORAGE.geminiKey, cfg.geminiKey.trim());
  if (cfg.grokKey !== undefined) lsSet(LLM_STORAGE.grokKey, cfg.grokKey.trim());
  if (cfg.ollamaUrl !== undefined) lsSet(LLM_STORAGE.ollamaUrl, cfg.ollamaUrl.trim());
  if (cfg.ollamaModel !== undefined) lsSet(LLM_STORAGE.ollamaModel, cfg.ollamaModel.trim());
}

/** true quando o app roda pelo servidor local (abrir.bat) */
const IS_LOCAL_APP =
  typeof location !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

/** true se /api/config reportou chave configurada no servidor/site */
let serverHasGemini = false;
let serverHasGrok = false;

function hasLlmReady() {
  const c = getLlmConfig();
  if (c.provider === "gemini") return Boolean(c.geminiKey) || serverHasGemini;
  if (c.provider === "ollama") return true; // tenta local
  if (c.provider === "grok") return Boolean(c.grokKey) || serverHasGrok;
  if (c.provider === "local") return true; // só motor local do app
  return false;
}

/** Mensagem para falha de conexão com /api, conforme o ambiente */
function msgSemServidor() {
  return IS_LOCAL_APP ||
    (typeof location !== "undefined" && location.protocol === "file:")
    ? "Não conectou ao servidor. Abra o app com abrir.bat (http://localhost:3847)."
    : "Falha de conexão com o site. Verifique sua internet e tente de novo.";
}

async function bootstrapKeyFromServer() {
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();

    // O servidor informa apenas SE há chave (nunca a chave em si);
    // o proxy /api/llm usa a chave do .env quando o cliente não envia a sua.
    serverHasGemini = Boolean(data.hasGeminiKey);
    serverHasGrok = Boolean(data.hasGrokKey);

    // Primeira visita: começa no provedor recomendado (Gemini, grátis)
    const firstRun = !lsGet("planomec_llm_bootstrapped", "");
    if (firstRun) {
      saveLlmConfig({ provider: data.preferProvider || "gemini" });
      lsSet("planomec_llm_bootstrapped", "1");
    }
    return serverHasGemini || serverHasGrok;
  } catch {
    return false;
  }
}

/**
 * Chama o Ollama direto do navegador (funciona no app local e no site
 * hospedado, desde que o Ollama esteja rodando na máquina do usuário).
 */
async function chamarOllamaDireto(messages, cfg, options) {
  const base = (cfg.ollamaUrl || DEFAULTS.ollamaUrl).replace(/\/$/, "");
  const modelId = cfg.ollamaModel || DEFAULTS.ollamaModel;
  const res = await fetch(base + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId,
      stream: false,
      messages: messages,
      options: {
        temperature: options.temperature != null ? options.temperature : 0.85,
      },
    }),
  });
  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    throw new Error(data.error || "Erro Ollama " + res.status);
  }
  const text = (data.message && data.message.content) || "";
  if (!String(text).trim()) {
    throw new Error("Ollama não retornou texto. Rode: ollama pull " + modelId);
  }
  return String(text).trim();
}

/**
 * Chama o provedor configurado via proxy /api/llm
 * (Ollama tenta primeiro conexão direta do navegador)
 */
async function chamarLlm(messages, options) {
  options = options || {};
  const cfg = getLlmConfig();
  const provider = options.provider || cfg.provider || "gemini";

  if (provider === "local") {
    throw new Error("Provedor local do app não usa rede — use o gerador sem IA.");
  }

  if (provider === "ollama") {
    try {
      return await chamarOllamaDireto(messages, cfg, options);
    } catch (e) {
      // No app local, o proxy do servidor ainda pode alcançar o Ollama;
      // no site hospedado não há fallback possível.
      if (!IS_LOCAL_APP) {
        throw new Error(
          "Não conectou ao Ollama neste computador. Verifique se ele está aberto e, " +
            "para usar com o site, inicie-o com OLLAMA_ORIGINS=" +
            (typeof location !== "undefined" ? location.origin : "*") +
            " — ou use Gemini (grátis) em ⚙ IA."
        );
      }
      // continua para o proxy local abaixo
    }
  }

  const body = {
    provider: provider,
    messages: messages,
    temperature: options.temperature != null ? options.temperature : 0.85,
    model:
      options.model ||
      (provider === "gemini" ? DEFAULTS.geminiModel : undefined),
    ollamaUrl: cfg.ollamaUrl,
    ollamaModel: cfg.ollamaModel,
  };

  const headers = { "Content-Type": "application/json" };
  if (provider === "gemini" && cfg.geminiKey) headers["X-Gemini-Key"] = cfg.geminiKey;
  if (provider === "grok" && cfg.grokKey) headers["X-Api-Key"] = cfg.grokKey;

  let res;
  try {
    res = await fetch("/api/llm", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(msgSemServidor());
  }

  if (!res.ok) {
    const errText = await res.text();
    let msg = "Erro na IA (" + res.status + ")";
    try {
      const j = JSON.parse(errText);
      msg = j.error || j.message || msg;
      if (typeof msg === "object") msg = JSON.stringify(msg);
      const low = String(msg).toLowerCase();
      if (low.indexOf("credit") >= 0 || low.indexOf("license") >= 0 || j.code === "permission-denied") {
        msg =
          "Grok sem créditos. Troque o provedor para Gemini (grátis) ou Ollama (local) em ⚙ IA.";
      }
      if (low.indexOf("api key not valid") >= 0 || low.indexOf("api_key_invalid") >= 0) {
        msg = "Chave do Gemini inválida. Gere outra em https://aistudio.google.com/apikey";
      }
      if (
        low.indexOf("quota") >= 0 ||
        low.indexOf("resource_exhausted") >= 0 ||
        low.indexOf("rate limit") >= 0 ||
        res.status === 429
      ) {
        msg =
          "Cota do Gemini esgotada. Aguarde ~1 min e tente de novo, ou use outra chave em ⚙ IA.";
      }
      if (low.indexOf("econnrefused") >= 0 || low.indexOf("fetch failed") >= 0) {
        msg =
          "Ollama não está rodando. Instale em https://ollama.com e rode: ollama pull llama3.2";
      }
    } catch {
      if (errText) msg = errText.slice(0, 280);
    }
    if (res.status === 404) {
      msg = IS_LOCAL_APP
        ? "Servidor antigo. Feche tudo e abra de novo com abrir.bat (http://localhost:3847)."
        : "Serviço de IA indisponível no site. Tente de novo em instantes.";
    }
    throw new Error(String(msg));
  }

  const data = await res.json();
  return extrairTexto(data);
}

function extrairTexto(data) {
  if (!data) return "";
  if (typeof data.text === "string") return data.text.trim();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return (data.choices[0].message.content || "").trim();
  }
  if (data.output_text) return String(data.output_text).trim();
  // Gemini raw
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    const parts = data.candidates[0].content.parts || [];
    return parts
      .map(function (p) {
        return p.text || "";
      })
      .join("")
      .trim();
  }
  throw new Error("Resposta inesperada da IA.");
}

async function gerarIdeiasLlm(contexto) {
  const faixa = contexto.faixaEtaria || "EI03";
  const faixaInfo =
    (typeof FAIXAS_ETARIAS !== "undefined" && FAIXAS_ETARIAS[faixa]) || {
      nome: "Educação Infantil",
      faixa: "",
    };
  const dica = (contexto.dica || "").trim();

  const system = [
    "Você é pedagogo(a) especialista em Educação Infantil (BNCC/DCNEI, Brasil).",
    "Sugira temas de PLANO DE AULA SEMANAL para creche/pré-escola.",
    "Foque em interações, brincadeiras e rotina escolar.",
    "Responda em português do Brasil.",
    "APENAS JSON válido, sem markdown:",
    '{ "ideias": [ { "titulo": "...", "descricao": "...", "campos": ["EO","EF"], "por_que": "..." } ] }',
    "Códigos: EO, CG, TS, EF, ET. Gere exatamente 5 ideias.",
  ].join(" ");

  const user = [
    "Gere 5 temas para plano semanal.",
    "Faixa: " + faixaInfo.nome + " (" + faixaInfo.faixa + ").",
    dica
      ? "Pista do professor: “" + dica + "”."
      : "O professor está sem criatividade — temas cotidianos e lúdicos.",
  ].join("\n");

  const texto = await chamarLlm(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.9 }
  );
  return parseIdeiasJson(texto);
}

async function gerarSemanaComLlm(contexto) {
  const faixa = contexto.faixaEtaria || "EI03";
  const faixaInfo =
    (typeof FAIXAS_ETARIAS !== "undefined" && FAIXAS_ETARIAS[faixa]) || {
      nome: "Educação Infantil",
      faixa: "",
    };
  const tema = contexto.tema || "Experiências da semana";
  const diasIds = (contexto.diasSemana && contexto.diasSemana.length
    ? contexto.diasSemana.map(function (d) {
        return d.id;
      })
    : ["segunda", "quarta", "quinta", "sexta"]);
  const codigosCampo = ["EO", "CG", "TS", "EF", "ET"];
  const exemploDias = diasIds
    .map(function (id, i) {
      return (
        '"' +
        id +
        '":{"lancamento":"5 h/a – ' +
        codigosCampo[i % codigosCampo.length] +
        '","planejamento":"1. ...\\n2. ...\\n3. ...","paraCasa":"...","motoraFina":"...","patio":"..."}'
      );
    })
    .join(",");

  const system = [
    "Você é professor(a) de Educação Infantil no Brasil (BNCC/DCNEI).",
    "Gere um PLANO DE AULA SEMANAL prático e lúdico.",
    "Dias obrigatórios (somente estes " +
      diasIds.length +
      "): " +
      diasIds.join(", ") +
      ".",
    "Cada dia precisa de strings: lancamento, planejamento, paraCasa, motoraFina, patio.",
    "lancamento: formato '5 h/a – EO' (use códigos EO, CG, TS, EF, ET).",
    "planejamento: exatamente 3 atividades numeradas em uma string com quebras de linha (1. 2. 3.).",
    "Linguagem objetiva de escola, português do Brasil, adequada à faixa etária.",
    "Responda SOMENTE com um objeto JSON válido (sem markdown, sem comentários).",
  ].join(" ");

  const user = [
    "Tema da semana: " + tema,
    "Faixa BNCC: " + faixaInfo.nome + " (" + faixaInfo.faixa + ") código " + faixa,
    "Campos de experiência: " + ((contexto.campos || []).join(", ") || "EO, EF, ET"),
    "Professor(a): " + (contexto.professor || "Professor(a)"),
    contexto.materiais ? "Materiais: " + contexto.materiais : "",
    contexto.observacoes ? "Observações: " + contexto.observacoes : "",
    "",
    "Formato exato do JSON:",
    '{"dias":{' +
      exemploDias +
      '},"oads":["' +
      faixa +
      'EF01","' +
      faixa +
      'EO01"]}',
  ]
    .filter(Boolean)
    .join("\n");

  const texto = await chamarLlm(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.7, model: DEFAULTS.geminiModel }
  );
  return parseSemanaJson(texto, diasIds);
}

function parseIdeiasJson(texto) {
  const parsed = extractJson(texto);
  const lista = parsed.ideias || parsed.ideas || [];
  if (!Array.isArray(lista) || !lista.length) {
    throw new Error("Nenhuma ideia retornada. Tente novamente.");
  }
  return lista.map(function (item, i) {
    return {
      id: "ideia-" + i,
      titulo: String(item.titulo || item.title || "Ideia " + (i + 1)).trim(),
      descricao: String(item.descricao || item.description || "").trim(),
      campos: Array.isArray(item.campos) ? item.campos.map(String) : [],
      porQue: String(item.por_que || item.porQue || item.why || "").trim(),
    };
  });
}

function parseSemanaJson(texto, diasIds) {
  const parsed = extractJson(texto);
  // Normaliza chaves comuns se a IA variar o formato
  if (!parsed.dias && parsed.semana) parsed.dias = parsed.semana;
  if (!parsed.dias && parsed.plano) parsed.dias = parsed.plano;
  if (!parsed.dias) throw new Error("A IA não retornou os dias da semana.");

  // Aceita nomes com maiúsculas / acentos
  const idsAlvo = diasIds && diasIds.length ? diasIds : ["segunda", "quarta", "quinta", "sexta"];
  function variantes(id) {
    return [id, id.toUpperCase(), id.charAt(0).toUpperCase() + id.slice(1)];
  }
  const diasNorm = {};
  idsAlvo.forEach(function (id) {
    let day = parsed.dias[id];
    if (!day) {
      const vars = variantes(id);
      for (let i = 0; i < vars.length; i++) {
        if (parsed.dias[vars[i]]) {
          day = parsed.dias[vars[i]];
          break;
        }
      }
    }
    if (day) {
      diasNorm[id] = {
        lancamento: day.lancamento || day.lancamentoDiario || day.campo || "",
        planejamento: day.planejamento || day.atividades || day.plano || "",
        paraCasa: day.paraCasa || day.para_casa || day.tarefa || "",
        motoraFina: day.motoraFina || day.motora_fina || day.coordenacao || "",
        patio: day.patio || day.psicomotricidade || day.patioPsicomotricidade || "",
      };
      if (typeof diasNorm[id].planejamento === "object") {
        diasNorm[id].planejamento = String(diasNorm[id].planejamento);
      }
      // se planejamento veio como array
      if (Array.isArray(day.planejamento)) {
        diasNorm[id].planejamento = day.planejamento
          .map(function (item, idx) {
            return idx + 1 + ". " + String(item);
          })
          .join("\n");
      }
    }
  });
  if (!Object.keys(diasNorm).length) {
    throw new Error("A IA não preencheu os dias da semana.");
  }
  parsed.dias = diasNorm;
  return parsed;
}

function extractJson(texto) {
  let raw = String(texto || "").trim();
  // remove cercas markdown
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // remove BOM e ruído comum
  raw = raw.replace(/^\uFEFF/, "");

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Não foi possível interpretar a resposta da IA.");
  }

  let slice = raw.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (e1) {
    // tenta limpar vírgulas finais e aspas “inteligentes”
    let cleaned = slice
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      // tenta extrair o maior objeto { ... } balanceado
      const balanced = extractBalancedObject(raw);
      if (balanced) {
        try {
          return JSON.parse(balanced);
        } catch (e3) {
          /* fall through */
        }
      }
      throw new Error("JSON inválido na resposta. Tente de novo ou use o Prompt p/ IA.");
    }
  }
}

function extractBalancedObject(text) {
  const s = String(text || "");
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Instruções de formato por tipo de bloco, pra IA não quebrar o formato esperado do campo */
const INSTRUCOES_BLOCO = {
  planejamento:
    "Mantenha exatamente o formato de lista numerada (comece com \"1.\", pode ter até 3 itens numerados em linhas separadas), sem texto fora da lista, sem markdown.",
  paraCasa:
    "Responda com uma única frase curta, tom de bilhete simples para a família, sem numeração, sem markdown.",
  motoraFina:
    "Responda com uma frase curta descrevendo a atividade de coordenação motora fina, sem numeração, sem markdown.",
  patio:
    "Responda com uma frase curta descrevendo a atividade de pátio/psicomotricidade, sem numeração, sem markdown.",
  ajudante:
    "Responda só com um texto bem curto (poucas palavras), sem pontuação extra, sem markdown.",
  lancamento:
    "Mantenha exatamente o formato \"N h/a – CODIGO\" (N é um número, CODIGO é um dos: EO, CG, TS, EF, ET), sem mais nada.",
  "rotina-caps":
    "Responda com uma frase curta de rotina escolar, TODA EM CAIXA ALTA, no mesmo estilo de instruções de sala de aula.",
  oads:
    "Responda só com 2 a 4 códigos BNCC (formato tipo EI03EF01), separados por ponto e vírgula, sem explicação, sem markdown.",
};

/** Reescreve/melhora só um bloco de texto do plano, mantendo o formato esperado do campo */
async function melhorarBlocoComIa(opts) {
  opts = opts || {};
  const texto = String(opts.texto || "");
  const campoTipo = opts.campoTipo || "";
  const contexto = opts.contexto || {};
  const instrucao =
    INSTRUCOES_BLOCO[campoTipo] ||
    "Responda apenas com o texto melhorado, sem explicações, sem markdown.";

  const faixaId = contexto.faixaEtaria || "EI03";
  const faixaInfo =
    (typeof FAIXAS_ETARIAS !== "undefined" && FAIXAS_ETARIAS[faixaId]) || {
      nome: "Educação Infantil",
      faixa: "",
    };

  const system = [
    "Você é pedagogo(a) especialista em Educação Infantil no Brasil (BNCC/DCNEI).",
    "A professora vai te dar um trecho específico de um plano de aula semanal.",
    "Reescreva esse trecho de forma mais criativa, específica e conectada ao tema — sem perder o formato esperado.",
    instrucao,
    "Responda em português do Brasil, APENAS com o texto final em texto puro — nunca em JSON, sem aspas, sem comentários, sem markdown.",
  ].join(" ");

  const user = [
    "Tema da semana: " + (contexto.tema || "Experiências da semana"),
    "Faixa etária: " +
      faixaInfo.nome +
      (faixaInfo.faixa ? " (" + faixaInfo.faixa + ")" : ""),
    contexto.dia ? "Dia: " + contexto.dia : "",
    contexto.campos && contexto.campos.length
      ? "Campos de experiência: " + contexto.campos.join(", ")
      : "",
    "",
    "Texto atual:",
    texto || "(vazio)",
    "",
    "Reescreva esse texto seguindo as instruções acima.",
  ]
    .filter(Boolean)
    .join("\n");

  const resposta = await chamarLlm(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.9 }
  );
  return limparRespostaBloco(resposta, campoTipo);
}

function limparRespostaBloco(texto, campoTipo) {
  let t = String(texto || "").trim();
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();

  // Às vezes a IA responde embrulhada em JSON mesmo pedindo só texto puro
  if (/^[{[]/.test(t)) {
    try {
      const parsed = JSON.parse(t);
      if (typeof parsed === "string") {
        t = parsed;
      } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const chaves = Object.keys(parsed);
        // Chave conhecida primeiro; senão, objeto com só 1 propriedade string
        // (a IA às vezes embrulha o texto em JSON mesmo pedindo texto puro,
        // com nomes de chave imprevisíveis — "resposta", "texto_reescrito", etc.)
        const conhecida = ["resposta", "texto", "text", "valor", "value"].find(function (k) {
          return typeof parsed[k] === "string";
        });
        if (conhecida) {
          t = parsed[conhecida];
        } else if (chaves.length === 1 && typeof parsed[chaves[0]] === "string") {
          t = parsed[chaves[0]];
        }
      }
    } catch {
      /* não era JSON de verdade, segue com o texto original */
    }
  }

  t = String(t).trim();
  t = t.replace(/^["“](.*)["”]$/s, "$1").trim();
  if (campoTipo === "rotina-caps") t = t.toUpperCase();
  return t;
}

/** Checagem leve de formato, pra não gravar algo quebrado no plano */
function validarFormatoBloco(texto, campoTipo) {
  const t = String(texto || "").trim();
  if (!t) return false;
  if (campoTipo === "lancamento") return /^\d+\s*h\/a/i.test(t);
  if (campoTipo === "planejamento") return /^1\./.test(t);
  return true;
}

function providerLabel(id) {
  if (id === "gemini") return "Gemini (grátis)";
  if (id === "ollama") return "Ollama (local grátis)";
  if (id === "grok") return "Grok (xAI, pago)";
  if (id === "local") return "Só app (sem IA)";
  return id;
}

/**
 * Monta um prompt completo para colar em qualquer LLM externa
 * (ChatGPT, Gemini web, Claude, Copilot, etc.) com os dados do formulário.
 * @param {object} form - dados do formulário do app
 * @param {object} [opts]
 * @param {object} [opts.planoLocal] - rascunho local já gerado (opcional)
 * @param {string} [opts.motivo] - por que o prompt está sendo oferecido
 */
function montarPromptExterno(form, opts) {
  form = form || {};
  opts = opts || {};
  const faixaId = form.faixaEtaria || "EI03";
  const faixaInfo =
    (typeof FAIXAS_ETARIAS !== "undefined" && FAIXAS_ETARIAS[faixaId]) || {
      nome: "Educação Infantil",
      faixa: "",
      id: faixaId,
    };

  const camposIds = Array.isArray(form.campos) ? form.campos : [];
  const camposTexto = camposIds
    .map(function (id) {
      const c =
        typeof CAMPOS_EXPERIENCIA !== "undefined" &&
        CAMPOS_EXPERIENCIA.find(function (x) {
          return x.id === id;
        });
      return c ? c.codigo + " — " + c.nome : id;
    })
    .join("\n  - ");

  const oadsCodigos = Array.isArray(form.objetivosManuais)
    ? form.objetivosManuais.slice()
    : [];
  let oadsDetalhe = "";
  if (oadsCodigos.length && typeof OBJETIVOS !== "undefined") {
    const faixaObjs = OBJETIVOS[faixaId] || {};
    const linhas = [];
    oadsCodigos.forEach(function (cod) {
      let texto = "";
      Object.keys(faixaObjs).forEach(function (campoId) {
        const lista = faixaObjs[campoId] || [];
        const hit = lista.find(function (o) {
          return o.codigo === cod;
        });
        if (hit) texto = hit.texto;
      });
      linhas.push(texto ? "(" + cod + ") " + texto : "(" + cod + ")");
    });
    oadsDetalhe = linhas.join("\n  - ");
  } else if (oadsCodigos.length) {
    oadsDetalhe = oadsCodigos.map(function (c) {
      return "(" + c + ")";
    }).join("; ");
  }

  const periodo =
    form.dataInicio || form.dataFim
      ? [form.dataInicio, form.dataFim].filter(Boolean).join(" a ")
      : "";

  const diasIds =
    Array.isArray(form.diasSemana) && form.diasSemana.length
      ? form.diasSemana
      : ["segunda", "quarta", "quinta", "sexta"];
  const catalogoDias =
    typeof DIAS_SEMANA_TODAS !== "undefined"
      ? DIAS_SEMANA_TODAS
      : [
          { id: "segunda", nome: "SEGUNDA" },
          { id: "terca", nome: "TERÇA" },
          { id: "quarta", nome: "QUARTA" },
          { id: "quinta", nome: "QUINTA" },
          { id: "sexta", nome: "SEXTA" },
        ];
  const diasNomes = diasIds.map(function (id) {
    const d = catalogoDias.find(function (c) {
      return c.id === id;
    });
    return d ? d.nome : id.toUpperCase();
  });

  const blocos = [];

  blocos.push(
    [
      "Você é pedagogo(a) especialista em Educação Infantil no Brasil,",
      "com domínio da BNCC (Educação Infantil) e das DCNEI (MEC).",
      "Ajude a montar um PLANO DE AULA SEMANAL prático, lúdico e alinhado à BNCC,",
      "no formato usado em escolas de Educação Infantil (modelo semanal).",
    ].join(" ")
  );

  if (opts.motivo) {
    blocos.push("Contexto: " + opts.motivo);
  }

  blocos.push(
    [
      "## Dados já preenchidos pelo(a) professor(a)",
      "",
      "- Instituição / Escola: " + (form.escola || "(não informado)"),
      "- Professor(a): " + (form.professor || "(não informado)"),
      "- Turma / Grupo: " + (form.turma || "(não informado)"),
      "- Quantidade de crianças: " +
        (form.quantidadeCriancas || "(não informado)"),
      "- Período: " + (periodo || "(não informado)"),
      "- Faixa etária BNCC: " +
        faixaInfo.nome +
        " (" +
        (faixaInfo.faixa || faixaId) +
        ") · código " +
        faixaId,
      "- Tema da semana: " + (form.tema || "Experiências da semana"),
    ].join("\n")
  );

  if (camposTexto) {
    blocos.push(
      "## Campos de experiência em destaque\n  - " + camposTexto
    );
  } else {
    blocos.push(
      "## Campos de experiência\n(não marcados — sugira os mais adequados ao tema)"
    );
  }

  if (oadsDetalhe) {
    blocos.push(
      "## Objetivos de Aprendizagem e Desenvolvimento (OADs) selecionados\n  - " +
        oadsDetalhe
    );
  } else {
    blocos.push(
      "## OADs\n(ainda não marcados — sugira 4 a 8 códigos BNCC coerentes com a faixa " +
        faixaId +
        " e o tema)"
    );
  }

  if ((form.materiais || "").trim()) {
    blocos.push("## Materiais / recursos\n" + form.materiais.trim());
  }
  if ((form.inclusao || "").trim()) {
    blocos.push(
      "## Estratégias de inclusão / acessibilidade\n" + form.inclusao.trim()
    );
  }
  if ((form.observacoes || "").trim()) {
    blocos.push(
      "## Observações do(a) professor(a)\n" + form.observacoes.trim()
    );
  }

  if (opts.planoLocal && opts.planoLocal.dias) {
    const rascunho = [];
    diasIds.forEach(function (d) {
      const day = opts.planoLocal.dias[d] || {};
      rascunho.push("### " + d.toUpperCase());
      rascunho.push("Lançamento: " + (day.lancamento || "—"));
      rascunho.push("Planejamento:\n" + (day.planejamento || "—"));
      rascunho.push("Para casa: " + (day.paraCasa || "—"));
      rascunho.push("Motora fina: " + (day.motoraFina || "—"));
      rascunho.push("Pátio: " + (day.patio || "—"));
      rascunho.push("");
    });
    blocos.push(
      [
        "## Rascunho já gerado pelo app (pode melhorar, reescrever e enriquecer)",
        "Use como base — não precisa recomeçar do zero se estiver bom.",
        "",
        rascunho.join("\n").trim(),
      ].join("\n")
    );
  }

  blocos.push(
    [
      "## O que preciso que você faça",
      "",
      "1. Complete o plano semanal para **" + diasNomes.join(", ") + "** (somente estes dias).",
      "2. Cada dia deve ter:",
      "   - **lancamento**: ex. \"5 h/a – EO\" (horas/aula + campo de experiência)",
      "   - **planejamento**: 3 atividades numeradas (1. 2. 3.), concretas e adequadas à idade",
      "   - **paraCasa**: sugestão leve para a família",
      "   - **motoraFina**: atividade de coordenação motora fina",
      "   - **patio**: pátio / psicomotricidade / corpo em movimento",
      "3. Inclua também propostas curtas de **entrada**, **rotina diária**, **lanche** e **saída** (podem se repetir na semana se fizer sentido).",
      "4. Liste **OADs** com códigos BNCC (ex. EI03EF01) coerentes com o tema e a faixa.",
      "5. Linguagem objetiva de escola, em português do Brasil, respeitando interações e brincadeiras.",
      "6. Adeque tudo à faixa etária informada (sem atividades inadequadas para a idade).",
    ].join("\n")
  );

  blocos.push(
    [
      "## Formato de resposta (obrigatório)",
      "",
      "Responda em **português do Brasil**, de forma clara para copiar para o diário de classe.",
      "Pode usar texto organizado por dia **ou** JSON no formato:",
      "",
      '{',
      '  "dias": {',
      '    "' +
        diasIds[0] +
        '": { "lancamento":"...", "planejamento":"1. ...\\n2. ...\\n3. ...", "paraCasa":"...", "motoraFina":"...", "patio":"..." }' +
        (diasIds.length > 1 ? "," : ""),
      diasIds
        .slice(1)
        .map(function (id, i, arr) {
          return '    "' + id + '": { ... }' + (i < arr.length - 1 ? "," : "");
        })
        .join("\n"),
      "  },",
      '  "entrada": "...",',
      '  "rotinaDiaria": "...",',
      '  "lanche": "...",',
      '  "saida": "...",',
      '  "oads": ["EI03EF01", "EI03EO01"]',
      "}",
      "",
      "Se preferir texto corrido, use seções " +
        diasNomes.join(" / ") +
        " com os mesmos campos.",
    ].join("\n")
  );

  blocos.push(
    "Comece pelo plano da segunda-feira e percorra a semana mantendo coerência com o tema \"" +
      (form.tema || "Experiências da semana") +
      "\"."
  );

  return blocos.join("\n\n");
}
