/**
 * Netlify Function — atualiza/remove uma turma específica do professor logado.
 * PUT    /api/turmas/:id
 * DELETE /api/turmas/:id
 */

import auth from "../../lib/auth.js";
import turmas from "../../lib/turmas.js";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (req, context) => {
  try {
    const { email } = auth.requireAuth(req.headers.get("authorization"));
    const id = context.params.id;
    if (req.method === "PUT") {
      const body = await req.json();
      const turma = await turmas.updateTurma(email, id, body);
      return json(200, turma);
    }
    if (req.method === "DELETE") {
      const result = await turmas.deleteTurma(email, id);
      return json(200, result);
    }
    return json(405, { error: "Use PUT ou DELETE" });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Erro interno" });
  }
};

export const config = {
  path: "/api/turmas/:id",
};
