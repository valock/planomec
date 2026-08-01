/**
 * Netlify Function — gera o .docx do plano semanal (formato model.docx).
 * Diferente do servidor local, não salva cópia em planejamentos/ —
 * o arquivo é apenas devolvido para download no navegador.
 */

import exportDocxLib from "../../lib/export-docx.js";

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  if (req.method !== "POST") return jsonError(405, "Use POST");

  let plano;
  try {
    plano = await req.json();
  } catch {
    return jsonError(400, "JSON inválido");
  }

  try {
    const buffer = await exportDocxLib.buildWeeklyDocx(plano);
    const filename = exportDocxLib.suggestedFilename(plano);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": exportDocxLib.DOCX_MIME,
        "Content-Disposition": 'attachment; filename="' + filename + '"',
        "X-Saved-As": filename,
      },
    });
  } catch (e) {
    console.error("export-docx:", e);
    return jsonError(500, e.message || "Falha ao gerar DOCX. Tente de novo.");
  }
};

export const config = {
  path: "/api/export-docx",
};
