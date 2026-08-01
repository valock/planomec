/**
 * Netlify Function — proxy de IA (mesma lógica do /api/llm do server.js local).
 * As chaves podem vir dos headers (usuário) ou das variáveis de ambiente do site.
 */

import providers from "../../lib/llm-providers.js";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function getGrokKey(req) {
  const header =
    (req.headers.get("x-api-key") || "").trim() ||
    ((req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i) ||
      [])[1] ||
    "";
  return header || (Netlify.env.get("XAI_API_KEY") || "").trim();
}

function getGeminiKey(req) {
  return (
    (req.headers.get("x-gemini-key") || "").trim() ||
    (Netlify.env.get("GEMINI_API_KEY") || "").trim()
  );
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json(405, { error: "Use POST" });

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  if (!Array.isArray(payload.messages) || !payload.messages.length) {
    return json(400, { error: "messages é obrigatório" });
  }

  if ((payload.provider || "").toLowerCase() === "ollama") {
    // Ollama roda no computador do usuário — um servidor na nuvem não o alcança.
    return json(502, {
      error:
        "Ollama é local e não pode ser acessado pelo site hospedado. " +
        "O app tenta conexão direta do navegador; para isso, inicie o Ollama com " +
        "OLLAMA_ORIGINS configurado para o endereço deste site, ou use Gemini (grátis) em ⚙ IA.",
    });
  }

  try {
    const result = await providers.callProvider(payload, {
      gemini: getGeminiKey(req),
      grok: getGrokKey(req),
      geminiDefaultModel: Netlify.env.get("GEMINI_MODEL"),
    });
    return json(200, result);
  } catch (e) {
    const friendly = providers.friendlyLlmError(e);
    return json(friendly.status, { error: friendly.message });
  }
};

export const config = {
  path: "/api/llm",
};
