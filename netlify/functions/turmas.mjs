/**
 * Netlify Function — lista/cria turmas do professor logado.
 * GET  /api/turmas  -> lista
 * POST /api/turmas  -> cria
 */

import auth from "../../lib/auth.js";
import turmas from "../../lib/turmas.js";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  try {
    const { email } = auth.requireAuth(req.headers.get("authorization"));
    if (req.method === "GET") {
      const lista = await turmas.listTurmas(email);
      return json(200, { turmas: lista });
    }
    if (req.method === "POST") {
      const body = await req.json();
      const turma = await turmas.createTurma(email, body);
      return json(201, turma);
    }
    return json(405, { error: "Use GET ou POST" });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Erro interno" });
  }
};

export const config = {
  path: "/api/turmas",
};
