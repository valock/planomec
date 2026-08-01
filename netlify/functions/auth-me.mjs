/**
 * Netlify Function — confirma a sessão atual (token no header Authorization).
 */

import auth from "../../lib/auth.js";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "Use GET" });
  try {
    const info = auth.requireAuth(req.headers.get("authorization"));
    return json(200, info);
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Erro interno" });
  }
};

export const config = {
  path: "/api/auth/me",
};
