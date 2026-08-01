/**
 * Netlify Function — login de professor(a) (mesma lógica do
 * /api/auth/login do server.js local, sobre lib/auth.js).
 */

import auth from "../../lib/auth.js";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST" });
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }
  try {
    const result = await auth.loginUser(body);
    return json(200, result);
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Erro interno" });
  }
};

export const config = {
  path: "/api/auth/login",
};
