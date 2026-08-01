/**
 * Netlify Function — informa ao app quais provedores têm chave configurada
 * no site (variáveis de ambiente). Nunca envia as chaves em si.
 */

export default async () => {
  const body = {
    hasGeminiKey: Boolean((Netlify.env.get("GEMINI_API_KEY") || "").trim()),
    hasGrokKey: Boolean((Netlify.env.get("XAI_API_KEY") || "").trim()),
    preferProvider: "gemini",
    providers: ["gemini", "ollama", "grok"],
    hosted: true,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};

export const config = {
  path: "/api/config",
};
