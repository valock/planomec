/**
 * TEMPORÁRIO — só para diagnosticar o erro "Cannot find module '@netlify/blobs'".
 * Remover depois de resolvido.
 */
import { readdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

function json(status, obj) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const info = {
    cwd: process.cwd(),
    __dirname,
    dirnameContents: safeReaddir(__dirname),
    cwdContents: safeReaddir(process.cwd()),
    nodeModulesInDirname: existsSync(join(__dirname, "node_modules")),
    nodeModulesInCwd: existsSync(join(process.cwd(), "node_modules")),
    nodeModulesAtVarTask: existsSync("/var/task/node_modules"),
    varTaskContents: safeReaddir("/var/task"),
  };

  try {
    const mod = await import("@netlify/blobs");
    info.importBlobsOk = true;
    info.hasGetStore = typeof mod.getStore === "function";
  } catch (e) {
    info.importBlobsOk = false;
    info.importBlobsError = e.message;
  }

  return json(200, info);
};

function safeReaddir(p) {
  try {
    return readdirSync(p);
  } catch (e) {
    return "ERR: " + e.message;
  }
}

export const config = {
  path: "/api/debug-blobs",
};
