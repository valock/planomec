/**
 * Autenticação simples sem dependências novas:
 * - Senha: crypto.scryptSync (salt + hash), sem bcrypt
 * - Sessão: token assinado à mão com crypto.createHmac, sem jsonwebtoken
 */

const crypto = require("crypto");
const store = require("./store");

const users = () => store.getCollection("users");

function normEmail(e) {
  return String(e || "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(String(password || ""), salt, 64);
  const stored = Buffer.from(hash, "hex");
  return check.length === stored.length && crypto.timingSafeEqual(check, stored);
}

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    const e = new Error(
      "SESSION_SECRET não configurado. Defina no .env (local) e nas variáveis de ambiente do Netlify."
    );
    e.status = 500;
    throw e;
  }
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function signToken(payload, ttlSeconds) {
  const body = Object.assign({}, payload, {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (ttlSeconds || 30 * 24 * 3600),
  });
  const payloadB64 = b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
  return payloadB64 + "." + sig;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const payloadB64 = parts[0];
  const sig = parts[1];
  const expected = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload; // { sub: email, nome, iat, exp }
}

async function registerUser({ email, senha, nome }) {
  email = normEmail(email);
  nome = String(nome || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const e = new Error("E-mail inválido");
    e.status = 400;
    throw e;
  }
  if (!senha || String(senha).length < 6) {
    const e = new Error("Senha precisa ter ao menos 6 caracteres");
    e.status = 400;
    throw e;
  }
  if (!nome) {
    const e = new Error("Informe seu nome");
    e.status = 400;
    throw e;
  }

  const col = users();
  if (await col.get(email)) {
    const e = new Error("E-mail já cadastrado");
    e.status = 409;
    throw e;
  }
  const { salt, hash } = hashPassword(senha);
  await col.set(email, { email, nome, salt, hash, createdAt: new Date().toISOString() });
  return { email, nome, token: signToken({ sub: email, nome }) };
}

async function loginUser({ email, senha }) {
  email = normEmail(email);
  const user = await users().get(email);
  if (!user || !verifyPassword(senha, user.salt, user.hash)) {
    const e = new Error("E-mail ou senha inválidos");
    e.status = 401;
    throw e;
  }
  return { email: user.email, nome: user.nome, token: signToken({ sub: user.email, nome: user.nome }) };
}

function requireAuth(authorizationHeader) {
  const m = /^Bearer\s+(.+)$/i.exec(String(authorizationHeader || "").trim());
  const payload = m && verifyToken(m[1]);
  if (!payload) {
    const e = new Error("Sessão inválida ou expirada");
    e.status = 401;
    throw e;
  }
  return { email: payload.sub, nome: payload.nome };
}

module.exports = { registerUser, loginUser, requireAuth, verifyToken, normEmail };
