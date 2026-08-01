/**
 * Exporta plano semanal no formato model.docx (sem dependências externas)
 * Gera OOXML + ZIP (método store) com módulos nativos do Node.
 */

const zlib = require("zlib");
const crc32Table = (function () {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crc32Table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

/** ZIP simples com deflate (método 8) */
function zipFiles(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data, "utf8");
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      compressed,
    ]);

    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...locals, centralDir, end]);
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runsFromText(text, opts) {
  opts = opts || {};
  const bold = opts.bold ? "<w:b/>" : "";
  const color = opts.color ? "<w:color w:val=\"" + opts.color + "\"/>" : "";
  const size = opts.size || 18;
  const align = opts.align ? "<w:jc w:val=\"" + opts.align + "\"/>" : "";
  const lines = String(text == null ? "" : text).split("\n");
  return lines
    .map(function (line, i) {
      const br = i > 0 ? "<w:r><w:br/></w:r>" : "";
      return (
        br +
        "<w:r><w:rPr><w:rFonts w:ascii=\"Arial\" w:hAnsi=\"Arial\"/>" +
        bold +
        color +
        "<w:sz w:val=\"" +
        size +
        "\"/><w:szCs w:val=\"" +
        size +
        "\"/></w:rPr><w:t xml:space=\"preserve\">" +
        esc(line) +
        "</w:t></w:r>"
      );
    })
    .join("");
}

function para(text, opts) {
  opts = opts || {};
  const align = opts.align ? "<w:jc w:val=\"" + opts.align + "\"/>" : "";
  return (
    "<w:p><w:pPr>" +
    align +
    "<w:spacing w:after=\"60\" w:line=\"240\" w:lineRule=\"auto\"/></w:pPr>" +
    runsFromText(text, opts) +
    "</w:p>"
  );
}

function tc(text, width, opts) {
  opts = opts || {};
  const span = opts.span ? "<w:gridSpan w:val=\"" + opts.span + "\"/>" : "";
  const fill = opts.fill
    ? "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"" + opts.fill + "\"/>"
    : "";
  const vAlign = "<w:vAlign w:val=\"center\"/>";
  return (
    "<w:tc><w:tcPr><w:tcW w:w=\"" +
    width +
    "\" w:type=\"dxa\"/>" +
    span +
    "<w:tcBorders>" +
    "<w:top w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:left w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:bottom w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:right w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "</w:tcBorders>" +
    fill +
    vAlign +
    "<w:tcMar><w:top w:w=\"60\" w:type=\"dxa\"/><w:left w:w=\"80\" w:type=\"dxa\"/><w:bottom w:w=\"60\" w:type=\"dxa\"/><w:right w:w=\"80\" w:type=\"dxa\"/></w:tcMar>" +
    "</w:tcPr>" +
    para(text, opts) +
    "</w:tc>"
  );
}

const COL_LABEL = 2100;
const COL_DAY = 2091;
const COLS = [COL_LABEL, COL_DAY, COL_DAY, COL_DAY, COL_DAY];
const TABLE_W = COLS.reduce(function (a, b) {
  return a + b;
}, 0);

function row5(label, vals, opts) {
  opts = opts || {};
  const d = vals || ["", "", "", ""];
  return (
    "<w:tr>" +
    tc(label, COL_LABEL, {
      bold: true,
      fill: opts.labelFill || "D6E3F0",
      size: 16,
    }) +
    tc(d[0] || "", COL_DAY, { size: 17, fill: opts.dayFill }) +
    tc(d[1] || "", COL_DAY, { size: 17, fill: opts.dayFill }) +
    tc(d[2] || "", COL_DAY, { size: 17, fill: opts.dayFill }) +
    tc(d[3] || "", COL_DAY, { size: 17, fill: opts.dayFill }) +
    "</w:tr>"
  );
}

function rowMerged(label, content, opts) {
  opts = opts || {};
  return (
    "<w:tr>" +
    tc(label, COL_LABEL, {
      bold: true,
      fill: opts.labelFill || "D6E3F0",
      size: 16,
    }) +
    tc(content || "", COL_DAY * 4, {
      size: 17,
      span: 4,
      fill: opts.fill,
    }) +
    "</w:tr>"
  );
}

function buildDocumentXml(plano) {
  const professor = plano.professor || "—";
  const periodo = plano.periodo || "—";
  const titulo =
    "PLANO DE AULA SEMANAL -  Profª: " +
    professor +
    " -  Período de " +
    periodo;

  const ordem = ["segunda", "quarta", "quinta", "sexta"];
  const dias = plano.dias || {};
  const pick = function (campo) {
    return ordem.map(function (d) {
      const day = dias[d] || {};
      const v = day[campo];
      if (Array.isArray(v)) return v.filter(Boolean).join("\n");
      return v || "";
    });
  };

  const planejamento = pick("planejamento");
  const paraCasa = pick("paraCasa");
  const planejamentoComCasa = ordem.map(function (_, i) {
    let t = planejamento[i] || "";
    if (paraCasa[i]) t = (t ? t + "\n\n" : "") + "PARA CASA: " + paraCasa[i];
    return t;
  });

  const oads = Array.isArray(plano.oads)
    ? plano.oads
        .map(function (c) {
          return "(" + c + ")";
        })
        .join("; ")
    : plano.oads || "";

  const header =
    "<w:tr>" +
    tc("", COL_LABEL, { fill: "1F4E79" }) +
    tc("SEGUNDA", COL_DAY, {
      bold: true,
      fill: "1F4E79",
      color: "FFFFFF",
      align: "center",
      size: 18,
    }) +
    tc("QUARTA", COL_DAY, {
      bold: true,
      fill: "1F4E79",
      color: "FFFFFF",
      align: "center",
      size: 18,
    }) +
    tc("QUINTA", COL_DAY, {
      bold: true,
      fill: "1F4E79",
      color: "FFFFFF",
      align: "center",
      size: 18,
    }) +
    tc("SEXTA", COL_DAY, {
      bold: true,
      fill: "1F4E79",
      color: "FFFFFF",
      align: "center",
      size: 18,
    }) +
    "</w:tr>";

  const table =
    "<w:tbl>" +
    "<w:tblPr><w:tblW w:w=\"" +
    TABLE_W +
    "\" w:type=\"dxa\"/><w:tblBorders>" +
    "<w:top w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:left w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:bottom w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:right w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:insideH w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "<w:insideV w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"000000\"/>" +
    "</w:tblBorders></w:tblPr>" +
    "<w:tblGrid>" +
    COLS.map(function (w) {
      return "<w:gridCol w:w=\"" + w + "\"/>";
    }).join("") +
    "</w:tblGrid>" +
    header +
    row5("LANÇAMENTO DIÁRIO", pick("lancamento"), { dayFill: "F2F2F2" }) +
    rowMerged(
      "ENTRADA",
      plano.entrada ||
        "ROTINA: Roda de socialização e banheiro. HORA CÍVICA."
    ) +
    rowMerged(
      "ROTINA DIÁRIA",
      plano.rotinaDiaria ||
        "Pegar o material, café da manhã, roda de socialização, banheiro. Chamadinha, quantidade de alunos, data, dia da semana e ajudante do dia.",
      { fill: "F2F2F2" }
    ) +
    row5("PLANEJAMENTO", planejamentoComCasa) +
    rowMerged(
      "LANCHE",
      plano.lanche || "LAVAR AS MÃOS, LANCHE, ESCOVAÇÃO E BANHEIRO.",
      { fill: "F2F2F2" }
    ) +
    row5("COORDENAÇÃO MOTORA FINA", pick("motoraFina")) +
    row5("PÁTIO / PSICOMOTRICIDADE", pick("patio"), { dayFill: "F2F2F2" }) +
    rowMerged(
      "SAÍDA",
      plano.saida ||
        "RELAXAMENTO, ORGANIZAR A SALA, GUARDAR OS MATERIAIS NA MOCHILA, AGUARDAR SENTADO."
    ) +
    row5("AJUDANTE DO DIA", pick("ajudante")) +
    rowMerged(
      "Objetivos de Aprendizagem e Desenvolvimento (OADs)",
      oads || "—",
      { fill: "FFF2CC", labelFill: "FFE699" }
    ) +
    "</w:tbl>";

  let extras = "";
  if (plano.tema) {
    extras += para("Tema da semana: " + plano.tema, {
      align: "center",
      size: 20,
    });
  }
  if (plano.faixaEtaria) {
    extras += para(
      "Faixa etária (BNCC): " +
        (plano.faixaEtaria.nome || "") +
        " (" +
        (plano.faixaEtaria.faixa || "") +
        ")",
      { align: "center", size: 18, color: "444444" }
    );
  }

  return (
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">" +
    "<w:body>" +
    para(titulo, { bold: true, align: "center", size: 24 }) +
    extras +
    table +
    para(
      "Documento gerado pelo PlanoMEC · BNCC / DCNEI (MEC) · " +
        (plano.geradoEm || new Date().toLocaleString("pt-BR")),
      { size: 14, color: "666666" }
    ) +
    "<w:sectPr>" +
    "<w:pgSz w:w=\"11906\" w:h=\"16838\"/>" +
    "<w:pgMar w:top=\"720\" w:right=\"720\" w:bottom=\"720\" w:left=\"720\" w:header=\"720\" w:footer=\"720\"/>" +
    "</w:sectPr>" +
    "</w:body></w:document>"
  );
}

async function buildWeeklyDocx(plano) {
  const documentXml = buildDocumentXml(plano);

  const contentTypes =
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
    "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
    "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
    "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
    "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>" +
    "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>" +
    "</Types>";

  const rels =
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
    "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>" +
    "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/>" +
    "<Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\" Target=\"docProps/app.xml\"/>" +
    "</Relationships>";

  const docRels =
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"></Relationships>";

  const now = new Date().toISOString();
  const core =
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" xmlns:dcmitype=\"http://purl.org/dc/dcmitype/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">" +
    "<dc:title>Plano de Aula Semanal</dc:title>" +
    "<dc:creator>PlanoMEC</dc:creator>" +
    "<cp:lastModifiedBy>PlanoMEC</cp:lastModifiedBy>" +
    "<dcterms:created xsi:type=\"dcterms:W3CDTF\">" +
    now +
    "</dcterms:created>" +
    "<dcterms:modified xsi:type=\"dcterms:W3CDTF\">" +
    now +
    "</dcterms:modified>" +
    "</cp:coreProperties>";

  const app =
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\" xmlns:vt=\"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes\">" +
    "<Application>PlanoMEC</Application></Properties>";

  return zipFiles([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: documentXml },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "docProps/core.xml", data: core },
    { name: "docProps/app.xml", data: app },
  ]);
}

/** Nome de arquivo seguro para o .docx gerado */
function suggestedFilename(plano) {
  const safeName = String((plano && plano.professor) || "plano")
    .replace(/[^\wÀ-ú\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  return "Plano_Semanal_" + (safeName || "EI") + "_" + Date.now() + ".docx";
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

module.exports = { buildWeeklyDocx, suggestedFilename, DOCX_MIME };
