/**
 * Armazenamento chave-valor com dois backends escolhidos automaticamente:
 * - Netlify Blobs, quando rodando como Function no Netlify
 * - Arquivo JSON local (data/*.json), quando rodando via server.js
 *
 * Cada "coleção" é um documento único { chave: valor }, gravado inteiro a
 * cada escrita — suficiente para o volume desta app (poucos usuários,
 * poucas turmas por usuário).
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function isNetlifyRuntime() {
  return Boolean(process.env.NETLIFY) || typeof globalThis.Netlify !== "undefined";
}

// ---------- backend local (arquivo JSON, mesmo espírito da pasta planejamentos/) ----------

const writeQueues = new Map(); // serializa escritas por coleção, evita corrida entre requisições

function withLock(name, fn) {
  const prev = writeQueues.get(name) || Promise.resolve();
  const next = prev.then(fn, fn).finally(function () {
    if (writeQueues.get(name) === next) writeQueues.delete(name);
  });
  writeQueues.set(name, next);
  return next;
}

function fileFor(name) {
  return path.join(DATA_DIR, name + ".json");
}

function readAll(name) {
  const file = fileFor(name);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
  } catch {
    return {};
  }
}

function writeAll(name, obj) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(fileFor(name), JSON.stringify(obj, null, 2), "utf8");
}

function localBackend(name) {
  return {
    async get(key) {
      const all = readAll(name);
      return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : null;
    },
    async set(key, value) {
      return withLock(name, function () {
        const all = readAll(name);
        all[key] = value;
        writeAll(name, all);
      });
    },
    async del(key) {
      return withLock(name, function () {
        const all = readAll(name);
        delete all[key];
        writeAll(name, all);
      });
    },
  };
}

// ---------- backend Netlify Blobs ----------

let blobsMod = null;
function blobsBackend(name) {
  // require só acontece se realmente rodando no Netlify — node server.js local
  // nunca precisa desse pacote instalado
  if (!blobsMod) blobsMod = require("@netlify/blobs");
  const store = blobsMod.getStore({ name: name, consistency: "strong" });
  return {
    async get(key) {
      const v = await store.get(key, { type: "json" });
      return v == null ? null : v;
    },
    async set(key, value) {
      await store.setJSON(key, value);
    },
    async del(key) {
      await store.delete(key);
    },
  };
}

function getCollection(name) {
  return isNetlifyRuntime() ? blobsBackend(name) : localBackend(name);
}

module.exports = { getCollection, isNetlifyRuntime };
