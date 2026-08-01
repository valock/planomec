/**
 * PlanoMEC — servidor local
 * - Serve arquivos estáticos de public/
 * - Proxy /api/llm → Gemini (grátis) | Ollama (local) | Grok (pago)
 * - Exporta plano semanal em .docx no formato do model.docx
 *
 * A mesma lógica roda no Netlify via netlify/functions/ (ver README).
 *
 * Uso:  dar duplo clique em abrir.bat  OU  npm start
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { spawn } = require("child_process");

const providers = require("./lib/llm-providers");
const exportDocxLib = require("./lib/export-docx");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");

// Carrega .env manualmente (sem dependência)
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const PORT = Number(process.env.PORT) || 3847;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".docx": exportDocxLib.DOCX_MIME,
};

function send(res, status, body, headers) {
  headers = headers || {};
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body || "", "utf8");
  res.writeHead(status, Object.assign({ "Content-Length": buf.length }, headers));
  res.end(buf);
}

function sendJson(res, status, obj, headers) {
  send(
    res,
    status,
    JSON.stringify(obj),
    Object.assign({ "Content-Type": "application/json; charset=utf-8" }, headers || {})
  );
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (c) {
      chunks.push(c);
      if (Buffer.concat(chunks).length > 2e6) {
        reject(new Error("Corpo da requisição muito grande"));
        req.destroy();
      }
    });
    req.on("end", function () {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function getGrokKey(req) {
  const headerKey =
    (req.headers["x-api-key"] || "").toString().trim() ||
    ((req.headers.authorization || "").toString().match(/^Bearer\s+(.+)$/i) ||
      [])[1] ||
    "";
  return headerKey || (process.env.XAI_API_KEY || "").trim();
}

function getGeminiKey(req) {
  return (
    (req.headers["x-gemini-key"] || "").toString().trim() ||
    (process.env.GEMINI_API_KEY || "").trim()
  );
}

async function proxyLlm(req, res) {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendJson(res, 400, { error: "JSON inválido" });
    return;
  }

  if (!Array.isArray(payload.messages) || !payload.messages.length) {
    sendJson(res, 400, { error: "messages é obrigatório" });
    return;
  }

  try {
    const result = await providers.callProvider(payload, {
      gemini: getGeminiKey(req),
      grok: getGrokKey(req),
      geminiDefaultModel: process.env.GEMINI_MODEL,
    });
    sendJson(res, 200, result);
  } catch (e) {
    const friendly = providers.friendlyLlmError(e);
    sendJson(res, friendly.status, { error: friendly.message });
  }
}

async function exportDocx(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST" });
    return;
  }

  let plano;
  try {
    plano = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendJson(res, 400, { error: "JSON inválido" });
    return;
  }

  try {
    const buffer = await exportDocxLib.buildWeeklyDocx(plano);
    const filename = exportDocxLib.suggestedFilename(plano);

    // salva também na pasta planejamentos/ (apenas no servidor local)
    const outDir = path.join(ROOT, "planejamentos");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, filename), buffer);

    send(res, 200, buffer, {
      "Content-Type": exportDocxLib.DOCX_MIME,
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "X-Saved-As": filename,
      "X-Saved-Folder": "planejamentos",
    });
  } catch (e) {
    console.error("export-docx:", e);
    sendJson(res, 500, {
      error: e.message || "Falha ao gerar DOCX. Tente de novo.",
    });
  }
}

function apiConfig(req, res) {
  // Nunca envia as chaves ao cliente — apenas informa se existem no .env.
  // O proxy /api/llm usa a chave do .env quando o cliente não envia a sua.
  sendJson(
    res,
    200,
    {
      hasGeminiKey: Boolean((process.env.GEMINI_API_KEY || "").trim()),
      hasGrokKey: Boolean((process.env.XAI_API_KEY || "").trim()),
      preferProvider: "gemini",
      providers: ["gemini", "ollama", "grok"],
      port: PORT,
    },
    { "Cache-Control": "no-store" }
  );
}

function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  rel = decodeURIComponent(rel).replace(/\0/g, "");
  // Nunca serve dotfiles (.env, .gitignore etc.)
  if (rel.split("/").some(function (seg) { return seg.startsWith("."); })) {
    send(res, 404, "Não encontrado", {
      "Content-Type": "text/plain; charset=utf-8",
    });
    return;
  }
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    send(res, 403, "Forbidden");
    return;
  }
  fs.readFile(filePath, function (err, data) {
    if (err) {
      send(res, 404, "Não encontrado: " + pathname, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
  });
}

const server = http.createServer(async function (req, res) {
  const u = new URL(req.url || "/", "http://localhost:" + PORT);
  try {
    if (u.pathname === "/api/llm") return await proxyLlm(req, res);
    if (u.pathname === "/api/export-docx") return await exportDocx(req, res);
    if (u.pathname === "/api/config") return apiConfig(req, res);
    return serveStatic(req, res, u.pathname);
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: e.message });
  }
});

function openBrowser(url) {
  if (process.env.NO_OPEN) return;
  const platform = process.platform;
  try {
    if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
    } else if (platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" });
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    }
  } catch (e) {
    console.warn("Não foi possível abrir o navegador:", e.message);
  }
}

server.on("error", function (err) {
  if (err.code === "EADDRINUSE") {
    console.error("");
    console.error("  Porta " + PORT + " já está em uso.");
    console.error("  Feche o outro node ou altere PORT no arquivo .env");
    console.error("  Tentando abrir o navegador mesmo assim...");
    console.error("");
    openBrowser("http://localhost:" + PORT + "/");
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", function () {
  const url = "http://localhost:" + PORT + "/";
  console.log("");
  console.log("  ========================================");
  console.log("   PlanoMEC  →  " + url);
  console.log("  ========================================");
  console.log(
    "  Gemini (.env):  " +
      (process.env.GEMINI_API_KEY ? "OK" : "não (grátis em aistudio.google.com)")
  );
  console.log(
    "  Grok (.env):    " +
      (process.env.XAI_API_KEY ? "OK (precisa créditos)" : "não")
  );
  console.log("  Ollama:         http://127.0.0.1:11434 (se instalado)");
  console.log("  Export DOCX:    POST /api/export-docx");
  console.log("");
  openBrowser(url);
});
