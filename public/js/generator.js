/**
 * Gerador de Plano de Aula SEMANAL — formato model.docx (MEC/BNCC)
 * Colunas: SEGUNDA | QUARTA | QUINTA | SEXTA
 */

function diasSelecionados(form) {
  const catalogo =
    typeof DIAS_SEMANA_TODAS !== "undefined"
      ? DIAS_SEMANA_TODAS
      : [
          { id: "segunda", nome: "SEGUNDA" },
          { id: "quarta", nome: "QUARTA" },
          { id: "quinta", nome: "QUINTA" },
          { id: "sexta", nome: "SEXTA" },
        ];
  const padrao =
    typeof DIAS_SEMANA_PADRAO !== "undefined"
      ? DIAS_SEMANA_PADRAO
      : ["segunda", "quarta", "quinta", "sexta"];
  const ids = form && form.diasSemana && form.diasSemana.length ? form.diasSemana : padrao;
  const filtrados = catalogo.filter(function (d) {
    return ids.indexOf(d.id) >= 0;
  });
  return filtrados.length ? filtrados : catalogo.filter(function (d) {
    return padrao.indexOf(d.id) >= 0;
  });
}

/** Atividades-base por faixa e tipo de bloco */
const BANCO = {
  EI01: {
    planejamento: [
      "Exploração sensorial com cestos de tesouros (texturas, temperaturas).",
      "Brincadeiras de colo e cantigas de ninar / gestos.",
      "Exploração de livros de pano/plástico com o adulto.",
      "Marcas gráficas com giz grosso ou tinta nos dedos (supervisionado).",
      "Brincadeiras de esconder e achar objetos e rostos.",
      "Exploração de sons com chocalhos e potes seguros.",
      "Roda de observação de imagens e objetos, nomeando o que aparece.",
      "Exploração de espelho e expressões faciais com o adulto.",
      "Manuseio de objetos com diferentes cheiros seguros (fruta, flor, erva).",
      "Brincadeira de imitar sons de animais e gestos simples.",
    ],
    motoraFina: [
      "Preensão de objetos leves e anéis de encaixe.",
      "Exploração de tecidos e fitas com as mãos.",
      "Transferência de objetos entre recipientes (com supervisão).",
      "Brincadeiras de bater palmas e abrir/fechar as mãos.",
      "Manuseio de bolas sensoriais macias.",
      "Encaixar e desencaixar peças grandes de espuma.",
    ],
    patio: [
      "Tapete externo: rolar e engatinhar com segurança.",
      "Balanço e brinquedos de empurrar (com adulto).",
      "Exploração de sombra e luz no pátio.",
      "Caminhada guiada no espaço externo.",
      "Sentir o vento e a grama com os pés (com supervisão).",
      "Colo ao ar livre observando o movimento das árvores.",
    ],
    paraCasa: [
      "Conversar e cantar com o bebê usando o nome dele(a).",
      "Explorar um livro de imagens em casa.",
      "Brincar de esconder o rostinho (tábua-tábua).",
      "Oferecer brinquedo seguro de diferentes texturas.",
      "Mostrar um objeto novo e nomear em voz alta.",
      "Cantar uma cantiga de ninar antes de dormir.",
    ],
    campos: ["EO", "CG", "TS", "EF", "ET"],
  },
  EI02: {
    planejamento: [
      "Contação de história com fantoches e reconto oral livre.",
      "Exploração de cores e formas com pintura e massinha.",
      "Jogos de classificação (cor, tamanho, textura).",
      "Brincadeira de faz de conta (casinha, mercado, médico).",
      "Cantigas de roda e criação de sons com instrumentos.",
      "Observação da natureza (folhas, água, vento) e desenho.",
      "Chamadinha, contagem de crianças e registro no quadro.",
      "Exploração de portadores textuais (livros, cartazes).",
      "Roda de conversa com perguntas abertas e registro das respostas em desenho.",
      "Caça ao tesouro simples com pistas visuais pela sala.",
      "Criação coletiva de um mural com desenhos e colagens.",
      "Jogo de imitação e adivinhação de gestos e sons.",
    ],
    motoraFina: [
      "Rasgar, colar e pintar com pincel grosso.",
      "Massinha: bolinhas, rolinhos e carimbagens.",
      "Alinhavo e encaixe de peças grandes.",
      "Brincadeiras com pinça e elásticos (supervisão).",
      "Recorte livre com tesoura sem ponta e colagem em cartaz.",
      "Empilhar e encaixar blocos de diferentes tamanhos.",
    ],
    patio: [
      "Circuito motor: pular, engatinhar, equilibrar.",
      "Brincadeiras com bola (chutar, rolar, pegar).",
      "Pular corda (com ajuda) e brincadeiras de imitação.",
      "Parque / brinquedos externos livres.",
      "Corrida com obstáculos leves (cones, arcos).",
      "Brincadeira de estátua e dança livre ao ar livre.",
    ],
    paraCasa: [
      "Observar o céu e contar o que viu para a família.",
      "Desenhar a família ou um momento feliz do dia.",
      "Separar 3 objetos da mesma cor em casa.",
      "Ouvir uma história lida pelo adulto.",
      "Procurar em casa um objeto que combine com a cor favorita.",
      "Cantar para a família uma música aprendida na escola.",
    ],
    campos: ["EO", "CG", "TS", "EF", "ET"],
  },
  EI03: {
    planejamento: [
      "Exploração de letra/som em palavras do tema (oral e escrita espontânea).",
      "Caderno de sala: registro, desenho e tentativa de escrita.",
      "Leitura compartilhada e reconto com personagens.",
      "Jogos de pareamento: numeral e quantidade.",
      "Projeto em grupo: combinar regras e papéis.",
      "Produção artística (pintura, colagem, escultura) sobre o tema.",
      "Escrita do nome e exploração de letras e quantidades.",
      "Experimentos simples e registro por desenho/números.",
      "Roda de debate com hipóteses das crianças, registradas no quadro.",
      "Criação de um pequeno jogo de tabuleiro ou trilha em grupo.",
      "Entrevista simples entre colegas e registro das respostas.",
      "Construção de maquete ou cenário com materiais recicláveis.",
    ],
    motoraFina: [
      "Brincadeiras com pinça, elástico e punção.",
      "Treino de escrita e traçados dirigidos e livres.",
      "Massinha e alinhavo.",
      "Recorte com tesoura sem ponta e colagem.",
      "Dobradura simples (origami) guiada passo a passo.",
      "Contas e miçangas para enfiar em barbante.",
    ],
    patio: [
      "Brincadeiras com bola.",
      "Pular corda e circuito psicomotor.",
      "Parque.",
      "Jogos cooperativos e amarelinha.",
      "Corrida do saci ou brincadeira de pega-pega com regras combinadas.",
      "Circuito de obstáculos cronometrado em duplas.",
    ],
    paraCasa: [
      "Identificar sombras ou figuras do tema em casa.",
      "Registrar um numeral e representar a quantidade.",
      "Recontar a história do dia para a família.",
      "Trazer um objeto relacionado ao tema (com segurança).",
      "Desenhar o que mais gostou de aprender hoje.",
      "Perguntar para a família uma curiosidade sobre o tema da semana.",
    ],
    campos: ["EO", "CG", "TS", "EF", "ET"],
  },
};

function pick(arr, i) {
  if (!arr || !arr.length) return "";
  return arr[i % arr.length];
}

function formatPeriodo(inicio, fim) {
  if (!inicio && !fim) {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, "0");
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const y = now.getFullYear();
    return d + "/" + m + "/" + y;
  }
  const fmt = (s) => {
    if (!s) return "";
    const p = s.split("-");
    if (p.length === 3) return p[2] + "/" + p[1] + "/" + p[0];
    return s;
  };
  const a = fmt(inicio);
  const b = fmt(fim);
  if (a && b) return a + " a " + b;
  return a || b;
}

function horasCampo(campo, horas) {
  return (horas || "5") + " h/a – " + campo;
}

/**
 * Gera plano semanal no formato do model.docx
 */
function gerarPlanejamento(form) {
  form = form || {};
  const faixaId = form.faixaEtaria || "EI03";
  const faixa =
    (typeof FAIXAS_ETARIAS !== "undefined" && FAIXAS_ETARIAS[faixaId]) ||
    { id: faixaId, nome: "Educação Infantil", faixa: "" };
  const banco = BANCO[faixaId] || BANCO.EI03;
  const tema = String(form.tema || "Semana de experiências e brincadeiras").trim();
  const professor = String(form.professor || "—").trim();
  const camposSel =
    form.campos && form.campos.length ? form.campos.slice() : banco.campos.slice(0, 4);

  // Objetivos BNCC
  let oads = [];
  if (form.objetivosManuais && form.objetivosManuais.length) {
    oads = form.objetivosManuais.slice();
  } else {
    const objs = selecionarObjetivos(faixaId, camposSel, 2);
    oads = objs.map((o) => o.codigo);
  }

  const seed = hashStr(tema + faixaId + professor);
  const dias = {};
  const diasSemana = diasSelecionados(form);

  diasSemana.forEach(function (dia, i) {
    const campoDia = camposSel[i % camposSel.length];
    const planItems = [
      "1. " + adaptarAoTema(pick(banco.planejamento, seed + i), tema),
      "2. " + adaptarAoTema(pick(banco.planejamento, seed + i + 3), tema),
    ];
    if (i % 2 === 0) {
      planItems.push(
        "3. " + adaptarAoTema(pick(banco.planejamento, seed + i + 5), tema)
      );
    }

    dias[dia.id] = {
      lancamento: horasCampo(campoDia, dia.id === "quinta" ? "1" : "5"),
      planejamento: planItems.join("\n"),
      paraCasa: adaptarAoTema(pick(banco.paraCasa, seed + i), tema),
      motoraFina: pick(banco.motoraFina, seed + i),
      patio: pick(banco.patio, seed + i + 1),
      ajudante: form.ajudantes && form.ajudantes[dia.id]
        ? form.ajudantes[dia.id]
        : "",
    };
  });

  // Override se o professor colou atividades manuais por dia
  if (form.diasOverride) {
    diasSemana.forEach(function (dia) {
      const o = form.diasOverride[dia.id];
      if (!o) return;
      Object.keys(o).forEach(function (k) {
        if (o[k]) dias[dia.id][k] = o[k];
      });
    });
  }

  const plano = {
    tipo: "semanal",
    professor: professor,
    escola: (form.escola || "").trim(),
    turma: (form.turma || "").trim(),
    periodo: formatPeriodo(form.dataInicio, form.dataFim || form.data),
    tema: tema,
    faixaEtaria: faixa,
    quantidadeCriancas: form.quantidadeCriancas || "—",
    entrada:
      form.entrada ||
      "ROTINA: Roda de socialização e banheiro. HORA CÍVICA.",
    rotinaDiaria:
      form.rotinaDiaria ||
      "Pegar o material, café da manhã, roda de socialização, banheiro. Chamadinha, quantidade de alunos, leitura do alfabeto e números e mudança climática. No quadro: quantidade de alunos, data do dia, dia da semana e explorar o nome do ajudante do dia.",
    lanche:
      form.lanche || "LAVAR AS MÃOS, LANCHE, ESCOVAÇÃO E BANHEIRO.",
    saida:
      form.saida ||
      "RELAXAMENTO, ORGANIZAR A SALA, GUARDAR OS MATERIAIS NA MOCHILA, AGUARDAR SENTADO.",
    dias: dias,
    diasSemana: diasSemana,
    oads: oads,
    campos:
      typeof CAMPOS_EXPERIENCIA !== "undefined"
        ? CAMPOS_EXPERIENCIA.filter(function (c) {
            return camposSel.indexOf(c.id) >= 0;
          })
        : [],
    direitos: selecionarDireitos(camposSel),
    geradoEm: new Date().toLocaleString("pt-BR"),
    meta: {
      norma: "BNCC — Educação Infantil | DCNEI (Resolução CNE/CEB nº 5/2009)",
      eixos:
        typeof EIXOS_ESTRUTURANTES !== "undefined" ? EIXOS_ESTRUTURANTES : [],
    },
  };

  return plano;
}

/** Tece o tema na frase da atividade em vez de só colar "(tema: X)" no final */
function adaptarAoTema(texto, tema) {
  if (!texto) return "";
  if (!tema) return texto;
  if (texto.toLowerCase().indexOf(tema.toLowerCase()) >= 0) return texto;

  const temaMin = tema.charAt(0).toLowerCase() + tema.slice(1);
  const semPonto = texto.replace(/\.\s*$/, "");
  const templates = [
    function () {
      return semPonto + ", relacionando com o tema \"" + tema + "\".";
    },
    function () {
      return "Com o tema \"" + tema + "\": " + texto;
    },
    function () {
      return semPonto + ", explorando elementos de " + temaMin + ".";
    },
    function () {
      return semPonto + ", trazendo referências de " + temaMin + " para a roda de conversa.";
    },
    function () {
      return "Usando " + temaMin + " como fio condutor, " + texto.charAt(0).toLowerCase() + texto.slice(1);
    },
    function () {
      return semPonto + ", dando continuidade ao que já foi explorado sobre " + temaMin + " na semana.";
    },
  ];
  const idx = hashStr(texto + "|" + tema) % templates.length;
  return templates[idx]();
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function selecionarObjetivos(faixaId, camposIds, maxPorCampo) {
  maxPorCampo = maxPorCampo || 2;
  const faixa = OBJETIVOS[faixaId];
  if (!faixa) return [];
  const resultado = [];
  for (const campoId of camposIds) {
    const lista = faixa[campoId] || [];
    const escolhidos = [];
    if (lista.length > 0) escolhidos.push(lista[0]);
    if (lista.length > 2 && maxPorCampo >= 2)
      escolhidos.push(lista[Math.min(2, lista.length - 1)]);
    resultado.push(
      ...escolhidos.slice(0, maxPorCampo).map(function (o) {
        return Object.assign({}, o, { campo: campoId });
      })
    );
  }
  return resultado;
}

function selecionarDireitos(camposIds) {
  const mapa = {
    EO: ["conviver", "participar", "conhecer-se"],
    CG: ["brincar", "explorar", "expressar"],
    TS: ["explorar", "expressar", "brincar"],
    EF: ["expressar", "participar", "explorar"],
    ET: ["explorar", "brincar", "participar"],
  };
  const ids = new Set(["brincar"]);
  for (const c of camposIds) {
    (mapa[c] || []).forEach(function (d) {
      ids.add(d);
    });
  }
  return DIREITOS_APRENDIZAGEM.filter(function (d) {
    return ids.has(d.id);
  }).slice(0, 4);
}

function sugerirCamposPorTema(tema) {
  const t = (tema || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const mapa = [
    { keys: ["identidade", "familia", "amizade", "conviv", "empatia", "cultura"], campos: ["EO"] },
    { keys: ["corpo", "movimento", "danca", "motor", "autocuidado"], campos: ["CG"] },
    { keys: ["cor", "forma", "arte", "musica", "som", "pintura"], campos: ["TS"] },
    { keys: ["historia", "leitura", "livro", "letra", "escrita", "alfabeto"], campos: ["EF"] },
    { keys: ["natureza", "animal", "agua", "numero", "quantidade", "espaco"], campos: ["ET"] },
  ];
  const set = new Set();
  mapa.forEach(function (item) {
    if (item.keys.some(function (k) { return t.indexOf(k) >= 0; })) {
      item.campos.forEach(function (c) { set.add(c); });
    }
  });
  if (!set.size) {
    set.add("EO");
    set.add("EF");
    set.add("ET");
  }
  return [...set];
}
