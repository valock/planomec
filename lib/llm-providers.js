/**
 * Provedores de IA — compartilhado entre server.js (local) e Netlify Functions.
 * As chaves são recebidas por parâmetro; este módulo não lê process.env.
 */

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const DEFAULT_GROK_MODEL = "grok-4.5";

function fetchWithTimeout(url, options, ms) {
  ms = ms || 45000;
  const ctrl = new AbortController();
  const t = setTimeout(function () {
    ctrl.abort();
  }, ms);
  options = options || {};
  options.signal = ctrl.signal;
  return fetch(url, options).finally(function () {
    clearTimeout(t);
  });
}

async function callGemini(messages, apiKey, temperature, model, defaultModel) {
  // System + user as contents
  let systemText = "";
  const contents = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemText += (systemText ? "\n" : "") + (m.content || "");
    } else {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      });
    }
  }
  if (!contents.length) {
    contents.push({ role: "user", parts: [{ text: systemText || "Olá" }] });
  } else if (systemText) {
    contents[0].parts[0].text =
      systemText + "\n\n" + (contents[0].parts[0].text || "");
  }

  const tried = [];
  const models = [];
  [model, defaultModel, DEFAULT_GEMINI_MODEL].forEach(function (m) {
    if (m && models.indexOf(m) < 0) models.push(m);
  });

  // 1º tenta com JSON mode (mais estável p/ planejamento); se o modelo não aceitar, tenta sem.
  const genConfigs = [
    {
      temperature: temperature != null ? temperature : 0.75,
      responseMimeType: "application/json",
    },
    {
      temperature: temperature != null ? temperature : 0.75,
    },
  ];

  let lastErr = null;
  for (const modelId of models) {
    for (let gi = 0; gi < genConfigs.length; gi++) {
      tried.push(modelId + (gi === 0 ? "+json" : ""));
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        modelId +
        ":generateContent?key=" +
        encodeURIComponent(apiKey);
      try {
        const upstream = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: contents,
              generationConfig: genConfigs[gi],
            }),
          },
          55000
        );
        const data = await upstream.json();
        if (!upstream.ok) {
          const err =
            (data.error && data.error.message) ||
            data.message ||
            JSON.stringify(data).slice(0, 300);
          lastErr = new Error(err);
          lastErr.status = upstream.status;
          // JSON mode inválido → tenta sem mime; 404/429 → outro modelo
          if (
            gi === 0 &&
            (upstream.status === 400 ||
              String(err).toLowerCase().indexOf("response mime") >= 0 ||
              String(err).toLowerCase().indexOf("json") >= 0)
          ) {
            continue;
          }
          if (upstream.status === 404 || upstream.status === 429) break;
          throw lastErr;
        }
        const parts =
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts
            ? data.candidates[0].content.parts
            : [];
        const text = parts
          .map(function (p) {
            return p.text || "";
          })
          .join("")
          .trim();
        if (!text) {
          lastErr = new Error("Gemini não retornou texto.");
          continue;
        }
        return { text: text, provider: "gemini", model: modelId };
      } catch (e) {
        lastErr = e;
        if (e.name === "AbortError") {
          lastErr = new Error(
            "IA demorou demais. Tente de novo ou use o Prompt p/ IA externa."
          );
          lastErr.status = 504;
        }
        if (e.status && e.status !== 404 && e.status !== 429 && e.status !== 400)
          throw e;
      }
    }
  }
  throw (
    lastErr ||
    new Error("Falha no Gemini. Modelos tentados: " + tried.join(", "))
  );
}

async function callOllama(messages, ollamaUrl, model, temperature) {
  const base = (ollamaUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
  const modelId = model || "llama3.2";
  const upstream = await fetch(base + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId,
      stream: false,
      messages: (messages || []).map(function (m) {
        return { role: m.role || "user", content: m.content || "" };
      }),
      options: { temperature: temperature != null ? temperature : 0.85 },
    }),
  });
  const data = await upstream.json().catch(function () {
    return {};
  });
  if (!upstream.ok) {
    const err = data.error || JSON.stringify(data).slice(0, 200);
    const e = new Error(err || "Erro Ollama " + upstream.status);
    e.status = upstream.status;
    throw e;
  }
  const text = (data.message && data.message.content) || data.response || "";
  if (!String(text).trim()) {
    throw new Error("Ollama não retornou texto. Rode: ollama pull " + modelId);
  }
  return { text: String(text).trim(), provider: "ollama", model: modelId };
}

async function callGrok(messages, apiKey, temperature, model) {
  const upstream = await fetchWithTimeout(
    XAI_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: model || DEFAULT_GROK_MODEL,
        messages: messages,
        temperature: temperature != null ? temperature : 0.85,
      }),
    },
    55000
  );
  const data = await upstream.json().catch(function () {
    return {};
  });
  if (!upstream.ok) {
    const err =
      (data.error && (data.error.message || data.error)) ||
      data.message ||
      JSON.stringify(data).slice(0, 300);
    const e = new Error(typeof err === "string" ? err : JSON.stringify(err));
    e.status = upstream.status;
    e.code = data.code;
    throw e;
  }
  const text =
    data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
  return {
    text: String(text || "").trim(),
    provider: "grok",
    model: model || DEFAULT_GROK_MODEL,
  };
}

/**
 * Traduz erros técnicos dos provedores em mensagens úteis ao professor.
 * Retorna { status, message }.
 */
function friendlyLlmError(e) {
  const status = (e && e.status) || 502;
  let msg = (e && e.message) || "Falha na IA";
  const low = String(msg).toLowerCase();
  if (low.indexOf("credit") >= 0 || (e && e.code === "permission-denied")) {
    msg =
      "Grok sem créditos. Em ⚙ IA escolha Gemini (grátis) ou Ollama (local).";
  }
  if (
    low.indexOf("quota") >= 0 ||
    low.indexOf("resource_exhausted") >= 0 ||
    low.indexOf("rate limit") >= 0 ||
    status === 429
  ) {
    msg =
      "Cota do Gemini esgotada neste modelo. Aguarde 1 minuto e tente de novo, ou gere outra chave em https://aistudio.google.com/apikey";
  }
  if (low.indexOf("econnrefused") >= 0) {
    msg =
      "Ollama não está rodando. Instale https://ollama.com e execute: ollama pull llama3.2";
  }
  if ((e && e.name === "AbortError") || low.indexOf("abort") >= 0) {
    msg =
      "IA demorou demais. Tente de novo (Gemini flash-latest às vezes leva ~30s).";
  }
  return { status: status, message: msg };
}

/**
 * Roteia a chamada para o provedor escolhido.
 * @param {object} payload - { provider, messages, temperature, model, ollamaUrl, ollamaModel }
 * @param {object} keys - { gemini, grok, geminiDefaultModel }
 */
async function callProvider(payload, keys) {
  const provider = (payload.provider || "gemini").toLowerCase();
  const temperature = payload.temperature;

  if (provider === "gemini") {
    if (!keys.gemini) {
      const e = new Error(
        "Chave Gemini ausente. Crie grátis em https://aistudio.google.com/apikey e cole em ⚙ IA."
      );
      e.status = 401;
      throw e;
    }
    return callGemini(
      payload.messages,
      keys.gemini,
      temperature,
      payload.model,
      keys.geminiDefaultModel
    );
  }
  if (provider === "ollama") {
    return callOllama(
      payload.messages,
      payload.ollamaUrl,
      payload.ollamaModel || payload.model,
      temperature
    );
  }
  if (provider === "grok") {
    if (!keys.grok) {
      const e = new Error(
        "Token Grok ausente. Sem créditos? Use Gemini (grátis) em ⚙ IA."
      );
      e.status = 401;
      throw e;
    }
    return callGrok(payload.messages, keys.grok, temperature, payload.model);
  }
  const e = new Error("Provedor inválido. Use: gemini | ollama | grok");
  e.status = 400;
  throw e;
}

module.exports = {
  callGemini,
  callOllama,
  callGrok,
  callProvider,
  friendlyLlmError,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROK_MODEL,
};
