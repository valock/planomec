/**
 * CRUD de turmas por professor(a) — uma coleção "turmas", um documento por
 * e-mail (array de turmas), igual ao padrão de lib/auth.js sobre lib/store.js.
 */

const crypto = require("crypto");
const store = require("./store");

const turmasCol = () => store.getCollection("turmas");

const FAIXAS_VALIDAS = ["EI01", "EI02", "EI03"];
const DIAS_VALIDOS = ["segunda", "terca", "quarta", "quinta", "sexta"];

function validarCampos(data, { parcial } = {}) {
  const out = {};

  if (data.escola !== undefined) out.escola = String(data.escola || "").trim();
  if (data.turma !== undefined) out.turma = String(data.turma || "").trim();
  if (data.quantidadeCriancas !== undefined) {
    out.quantidadeCriancas = String(data.quantidadeCriancas || "").trim();
  }

  if (data.faixaEtaria !== undefined) {
    if (FAIXAS_VALIDAS.indexOf(data.faixaEtaria) < 0) {
      const e = new Error("faixaEtaria inválida");
      e.status = 400;
      throw e;
    }
    out.faixaEtaria = data.faixaEtaria;
  } else if (!parcial) {
    out.faixaEtaria = "EI03";
  }

  if (data.diasSemana !== undefined) {
    const ids = Array.isArray(data.diasSemana) ? data.diasSemana : [];
    const filtrados = DIAS_VALIDOS.filter(function (d) {
      return ids.indexOf(d) >= 0;
    });
    if (!filtrados.length) {
      const e = new Error("diasSemana precisa ter ao menos 1 dia válido");
      e.status = 400;
      throw e;
    }
    out.diasSemana = filtrados;
  } else if (!parcial) {
    out.diasSemana = ["segunda", "quarta", "quinta", "sexta"];
  }

  if (!parcial && !out.turma) {
    const e = new Error("Informe o nome da turma/grupo");
    e.status = 400;
    throw e;
  }

  return out;
}

async function listTurmas(email) {
  const lista = await turmasCol().get(email);
  return Array.isArray(lista) ? lista : [];
}

async function createTurma(email, data) {
  const campos = validarCampos(data);
  const lista = await listTurmas(email);
  const turma = Object.assign(
    { id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    campos,
    { updatedAt: new Date().toISOString() }
  );
  lista.push(turma);
  await turmasCol().set(email, lista);
  return turma;
}

async function updateTurma(email, id, data) {
  const campos = validarCampos(data, { parcial: true });
  const lista = await listTurmas(email);
  const idx = lista.findIndex(function (t) {
    return t.id === id;
  });
  if (idx < 0) {
    const e = new Error("Turma não encontrada");
    e.status = 404;
    throw e;
  }
  lista[idx] = Object.assign({}, lista[idx], campos, { updatedAt: new Date().toISOString() });
  await turmasCol().set(email, lista);
  return lista[idx];
}

async function deleteTurma(email, id) {
  const lista = await listTurmas(email);
  const idx = lista.findIndex(function (t) {
    return t.id === id;
  });
  if (idx < 0) {
    const e = new Error("Turma não encontrada");
    e.status = 404;
    throw e;
  }
  lista.splice(idx, 1);
  await turmasCol().set(email, lista);
  return { ok: true };
}

module.exports = { listTurmas, createTurma, updateTurma, deleteTurma };
