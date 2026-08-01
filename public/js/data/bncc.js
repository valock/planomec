/**
 * Dados oficiais da BNCC — Educação Infantil
 * Base Nacional Comum Curricular (MEC)
 * Eixos estruturantes: Interações e Brincadeiras
 */

const DIAS_SEMANA_TODAS = [
  { id: "segunda", nome: "SEGUNDA" },
  { id: "terca", nome: "TERÇA" },
  { id: "quarta", nome: "QUARTA" },
  { id: "quinta", nome: "QUINTA" },
  { id: "sexta", nome: "SEXTA" },
];
// Mantém o padrão atual do model.docx (não quebra quem já usa o app)
const DIAS_SEMANA_PADRAO = ["segunda", "quarta", "quinta", "sexta"];

const FAIXAS_ETARIAS = {
  EI01: {
    id: "EI01",
    nome: "Bebês",
    faixa: "0 a 1 ano e 6 meses",
    descricao: "Creche — bebês",
  },
  EI02: {
    id: "EI02",
    nome: "Crianças bem pequenas",
    faixa: "1 ano e 7 meses a 3 anos e 11 meses",
    descricao: "Creche — crianças bem pequenas",
  },
  EI03: {
    id: "EI03",
    nome: "Crianças pequenas",
    faixa: "4 anos a 5 anos e 11 meses",
    descricao: "Pré-escola",
  },
};

const EIXOS_ESTRUTURANTES = [
  {
    id: "interacoes",
    nome: "Interações",
    descricao:
      "As interações são o meio privilegiado de aprendizagem e desenvolvimento, nas relações com o outro e com o mundo.",
  },
  {
    id: "brincadeiras",
    nome: "Brincadeiras",
    descricao:
      "A brincadeira é o eixo estruturante das práticas pedagógicas, garantindo o direito de brincar de forma cotidiana e diversificada.",
  },
];

const DIREITOS_APRENDIZAGEM = [
  {
    id: "conviver",
    nome: "Conviver",
    descricao:
      "Conviver com outras crianças e adultos, em pequenos e grandes grupos, utilizando diferentes linguagens, ampliando o conhecimento de si e do outro, o respeito em relação à cultura e às diferenças entre as pessoas.",
  },
  {
    id: "brincar",
    nome: "Brincar",
    descricao:
      "Brincar cotidianamente de diversas formas, em diferentes espaços e tempos, com diferentes parceiros (crianças e adultos), ampliando e diversificando seu acesso a produções culturais, seus conhecimentos, sua imaginação, sua criatividade, suas experiências emocionais, corporais, sensoriais, expressivas, cognitivas, sociais e relacionais.",
  },
  {
    id: "participar",
    nome: "Participar",
    descricao:
      "Participar ativamente, com adultos e outras crianças, tanto do planejamento da gestão da escola e das atividades propostas pelo educador quanto da realização das atividades da vida cotidiana, tais como a escolha das brincadeiras, dos materiais e dos ambientes, desenvolvendo diferentes linguagens e elaborando conhecimentos, decidindo e se posicionando.",
  },
  {
    id: "explorar",
    nome: "Explorar",
    descricao:
      "Explorar movimentos, gestos, sons, formas, texturas, cores, palavras, emoções, transformações, relacionamentos, histórias, objetos, elementos da natureza, na escola e fora dela, ampliando seus saberes sobre a cultura, em suas diversas modalidades: as artes, a escrita, a ciência e a tecnologia.",
  },
  {
    id: "expressar",
    nome: "Expressar",
    descricao:
      "Expressar, como sujeito dialógico, criativo e sensível, suas necessidades, emoções, sentimentos, dúvidas, hipóteses, descobertas, opiniões, questionamentos, por meio de diferentes linguagens.",
  },
  {
    id: "conhecer-se",
    nome: "Conhecer-se",
    descricao:
      "Conhecer-se e construir sua identidade pessoal, social e cultural, constituindo uma imagem positiva de si e de seus grupos de pertencimento, nas diversas experiências de cuidados, interações, brincadeiras e linguagens vivenciadas na instituição escolar e em seu contexto familiar e comunitário.",
  },
];

const CAMPOS_EXPERIENCIA = [
  {
    id: "EO",
    codigo: "EO",
    nome: "O eu, o outro e o nós",
    descricao:
      "Experiências de construção da identidade e da subjetividade, relações positivas, pertencimento, respeito e valorização das diferenças e tradições culturais.",
    cor: "eo",
  },
  {
    id: "CG",
    codigo: "CG",
    nome: "Corpo, gestos e movimentos",
    descricao:
      "Experiências corporais em brincadeiras, exploração do espaço, faz de conta, dança, música e diferentes formas de expressão do corpo.",
    cor: "cg",
  },
  {
    id: "TS",
    codigo: "TS",
    nome: "Traços, sons, cores e formas",
    descricao:
      "Experiências com manifestações artísticas, culturais e científicas: linguagem musical, linguagens visuais, criação e sensibilidade estética.",
    cor: "ts",
  },
  {
    id: "EF",
    codigo: "EF",
    nome: "Escuta, fala, pensamento e imaginação",
    descricao:
      "Experiências com linguagem oral e escrita, leitura de histórias, imaginação, comunicação e práticas de uso da escrita em contextos significativos.",
    cor: "ef",
  },
  {
    id: "ET",
    codigo: "ET",
    nome: "Espaços, tempos, quantidades, relações e transformações",
    descricao:
      "Experiências com noções espaciais e temporais, medidas, contagem, relações, transformações de materiais e conhecimento do mundo físico e social.",
    cor: "et",
  },
];

/** Objetivos de aprendizagem e desenvolvimento (BNCC) */
const OBJETIVOS = {
  EI01: {
    EO: [
      { codigo: "EI01EO01", texto: "Perceber que suas ações têm efeitos nas outras crianças e nos adultos." },
      { codigo: "EI01EO02", texto: "Perceber as possibilidades e os limites de seu corpo nas brincadeiras e interações das quais participa." },
      { codigo: "EI01EO03", texto: "Interagir com crianças da mesma faixa etária e adultos ao explorar espaços, materiais, objetos, brinquedos." },
      { codigo: "EI01EO04", texto: "Comunicar necessidades, desejos e emoções, utilizando gestos, balbucios, palavras." },
      { codigo: "EI01EO05", texto: "Reconhecer seu corpo e expressar suas sensações em momentos de alimentação, higiene, brincadeira e descanso." },
      { codigo: "EI01EO06", texto: "Interagir com outras crianças da mesma faixa etária e adultos, adaptando-se ao convívio social." },
    ],
    CG: [
      { codigo: "EI01CG01", texto: "Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos." },
      { codigo: "EI01CG02", texto: "Experimentar as possibilidades corporais nas brincadeiras e interações em ambientes acolhedores e desafiantes." },
      { codigo: "EI01CG03", texto: "Imitar gestos e movimentos de outras crianças, adultos e animais." },
      { codigo: "EI01CG04", texto: "Participar do cuidado do seu corpo e da promoção do seu bem-estar." },
      { codigo: "EI01CG05", texto: "Utilizar os movimentos de preensão, encaixe e lançamento, ampliando suas possibilidades de manuseio de diferentes materiais e objetos." },
    ],
    TS: [
      { codigo: "EI01TS01", texto: "Explorar sons produzidos com o próprio corpo e com objetos do ambiente." },
      { codigo: "EI01TS02", texto: "Traçar marcas gráficas, em diferentes suportes, usando instrumentos riscantes e tintas." },
      { codigo: "EI01TS03", texto: "Explorar diferentes fontes sonoras e materiais para acompanhar brincadeiras cantadas, canções, músicas e melodias." },
    ],
    EF: [
      { codigo: "EI01EF01", texto: "Reconhecer quando é chamado por seu nome e reconhecer os nomes de pessoas com quem convive." },
      { codigo: "EI01EF02", texto: "Demonstrar interesse ao ouvir a leitura de poemas e a apresentação de músicas." },
      { codigo: "EI01EF03", texto: "Demonstrar interesse ao ouvir histórias lidas ou contadas, observando ilustrações e os movimentos de leitura do adulto-leitor." },
      { codigo: "EI01EF04", texto: "Reconhecer elementos das ilustrações de histórias, apontando-os, a pedido do adulto-leitor." },
      { codigo: "EI01EF05", texto: "Imitar as variações de entonação e gestos realizados pelos adultos, ao ler histórias e ao cantar." },
      { codigo: "EI01EF06", texto: "Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão." },
      { codigo: "EI01EF07", texto: "Conhecer e manipular materiais impressos e audiovisuais em diferentes portadores (livro, revista, gibi, jornal, cartaz, CD, tablet etc.)." },
      { codigo: "EI01EF08", texto: "Participar de situações de escuta de textos em diferentes gêneros textuais (poemas, fábulas, contos, receitas, quadrinhos, anúncios etc.)." },
      { codigo: "EI01EF09", texto: "Conhecer e manipular diferentes instrumentos e suportes de escrita." },
    ],
    ET: [
      { codigo: "EI01ET01", texto: "Explorar e descobrir as propriedades de objetos e materiais (odor, cor, sabor, temperatura)." },
      { codigo: "EI01ET02", texto: "Explorar relações de causa e efeito (transbordar, tingir, misturar, mover e remover etc.) na interação com o mundo físico." },
      { codigo: "EI01ET03", texto: "Explorar o ambiente pela ação e observação, manipulando, experimentando e fazendo descobertas." },
      { codigo: "EI01ET04", texto: "Manipular, experimentar, arrumar e explorar o espaço por meio de experiências de deslocamentos de si e dos objetos." },
      { codigo: "EI01ET05", texto: "Manipular materiais diversos e variados para comparar as diferenças e semelhanças entre eles." },
      { codigo: "EI01ET06", texto: "Vivenciar diferentes ritmos, velocidades e fluxos nas interações e brincadeiras (em danças, balanços, escorregadores etc.)." },
    ],
  },
  EI02: {
    EO: [
      { codigo: "EI02EO01", texto: "Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos." },
      { codigo: "EI02EO02", texto: "Demonstrar imagem positiva de si e confiança em sua capacidade para enfrentar dificuldades e desafios." },
      { codigo: "EI02EO03", texto: "Compartilhar os objetos e os espaços com crianças da mesma faixa etária e adultos." },
      { codigo: "EI02EO04", texto: "Comunicar-se com os colegas e os adultos, buscando compreendê-los e fazendo-se compreender." },
      { codigo: "EI02EO05", texto: "Perceber que as pessoas têm características físicas diferentes, respeitando essas diferenças." },
      { codigo: "EI02EO06", texto: "Respeitar regras básicas de convívio social nas interações e brincadeiras." },
      { codigo: "EI02EO07", texto: "Resolver conflitos nas interações e brincadeiras, com a orientação de um adulto." },
    ],
    CG: [
      { codigo: "EI02CG01", texto: "Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras." },
      { codigo: "EI02CG02", texto: "Deslocar seu corpo no espaço, orientando-se por noções como em frente, atrás, no alto, embaixo, dentro, fora etc., ao se envolver em brincadeiras e atividades de diferentes naturezas." },
      { codigo: "EI02CG03", texto: "Explorar formas de deslocamento no espaço (pular, saltar, dançar), combinando movimentos e seguindo orientações." },
      { codigo: "EI02CG04", texto: "Demonstrar progressiva independência no cuidado do seu corpo." },
      { codigo: "EI02CG05", texto: "Desenvolver progressivamente as habilidades manuais, adquirindo controle para desenhar, pintar, rasgar, folhear, entre outros." },
    ],
    TS: [
      { codigo: "EI02TS01", texto: "Criar sons com materiais, objetos e instrumentos musicais, para acompanhar diversos ritmos de música." },
      { codigo: "EI02TS02", texto: "Utilizar materiais variados com possibilidades de manipulação (argila, massa de modelar), explorando cores, texturas, superfícies, planos, formas e volumes ao criar objetos tridimensionais." },
      { codigo: "EI02TS03", texto: "Utilizar diferentes fontes sonoras disponíveis no ambiente em brincadeiras cantadas, canções, músicas e melodias." },
    ],
    EF: [
      { codigo: "EI02EF01", texto: "Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões." },
      { codigo: "EI02EF02", texto: "Identificar e criar diferentes sons e reconhecer rimas e aliterações em cantigas de roda e textos poéticos." },
      { codigo: "EI02EF03", texto: "Demonstrar interesse e atenção ao ouvir a leitura de histórias e outros textos, diferenciando escrita de ilustrações, e acompanhando, com orientação do adulto-leitor, a direção da leitura." },
      { codigo: "EI02EF04", texto: "Formular e responder perguntas sobre fatos da história narrada, identificando cenários, personagens e principais acontecimentos." },
      { codigo: "EI02EF05", texto: "Relatar experiências e fatos acontecidos, histórias ouvidas, filmes ou peças teatrais assistidos etc." },
      { codigo: "EI02EF06", texto: "Criar e contar histórias oralmente, com base em imagens ou temas sugeridos." },
      { codigo: "EI02EF07", texto: "Manusear diferentes portadores textuais, demonstrando reconhecer seus usos sociais." },
      { codigo: "EI02EF08", texto: "Manipular textos e participar de situações de escuta para ampliar seu contato com diferentes gêneros textuais." },
      { codigo: "EI02EF09", texto: "Manusear diferentes instrumentos e suportes de escrita para desenhar, traçar letras e outros sinais gráficos." },
    ],
    ET: [
      { codigo: "EI02ET01", texto: "Explorar e descrever semelhanças e diferenças entre as características e propriedades dos objetos (textura, massa, tamanho)." },
      { codigo: "EI02ET02", texto: "Observar, relatar e descrever incidentes do cotidiano e fenômenos naturais (luz solar, vento, chuva etc.)." },
      { codigo: "EI02ET03", texto: "Compartilhar, com outras crianças, situações de cuidado de plantas e animais nos espaços da instituição e fora dela." },
      { codigo: "EI02ET04", texto: "Identificar relações espaciais (dentro e fora, em cima, embaixo, acima, abaixo, entre e do lado) e temporais (antes, durante e depois)." },
      { codigo: "EI02ET05", texto: "Classificar objetos, considerando determinado atributo (tamanho, peso, cor, forma etc.)." },
      { codigo: "EI02ET06", texto: "Utilizar conceitos básicos de tempo (agora, antes, durante, depois, ontem, hoje, amanhã, lento, rápido, depressa, devagar)." },
      { codigo: "EI02ET07", texto: "Contar oralmente objetos, pessoas, livros etc., em contextos diversos." },
      { codigo: "EI02ET08", texto: "Registrar com números a quantidade de crianças (meninas e meninos, presentes e ausentes) e a quantidade de objetos da mesma natureza." },
    ],
  },
  EI03: {
    EO: [
      { codigo: "EI03EO01", texto: "Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir." },
      { codigo: "EI03EO02", texto: "Agir de maneira independente, com confiança em suas capacidades, reconhecendo suas conquistas e limitações." },
      { codigo: "EI03EO03", texto: "Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação." },
      { codigo: "EI03EO04", texto: "Comunicar suas ideias e sentimentos a pessoas e grupos diversos." },
      { codigo: "EI03EO05", texto: "Demonstrar valorização das características de seu corpo e respeitar as características dos outros (crianças e adultos) com os quais convive." },
      { codigo: "EI03EO06", texto: "Manifestar interesse e respeito por diferentes culturas e modos de vida." },
      { codigo: "EI03EO07", texto: "Usar estratégias pautadas no respeito mútuo para lidar com conflitos nas interações com crianças e adultos." },
    ],
    CG: [
      { codigo: "EI03CG01", texto: "Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música." },
      { codigo: "EI03CG02", texto: "Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias, atividades artísticas, entre outras possibilidades." },
      { codigo: "EI03CG03", texto: "Criar movimentos, gestos, olhares e mímicas em brincadeiras, jogos e atividades artísticas como dança, teatro e música." },
      { codigo: "EI03CG04", texto: "Adotar hábitos de autocuidado relacionados a higiene, alimentação, conforto e aparência." },
      { codigo: "EI03CG05", texto: "Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades em situações diversas." },
    ],
    TS: [
      { codigo: "EI03TS01", texto: "Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas." },
      { codigo: "EI03TS02", texto: "Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura, criando produções bidimensionais e tridimensionais." },
      { codigo: "EI03TS03", texto: "Reconhecer as qualidades do som (intensidade, duração, altura e timbre), utilizando-as em suas produções sonoras e ao ouvir músicas e sons." },
    ],
    EF: [
      { codigo: "EI03EF01", texto: "Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita (escrita espontânea), de fotos, desenhos e outras formas de expressão." },
      { codigo: "EI03EF02", texto: "Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos." },
      { codigo: "EI03EF03", texto: "Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas." },
      { codigo: "EI03EF04", texto: "Recontar histórias ouvidas e planejar coletivamente roteiros de vídeos e de encenações, definindo os contextos, os personagens, a estrutura da história." },
      { codigo: "EI03EF05", texto: "Recontar histórias ouvidas para produção de reconto escrito, tendo o professor como escriba." },
      { codigo: "EI03EF06", texto: "Produzir suas próprias histórias orais e escritas (escrita espontânea), em situações com função social significativa." },
      { codigo: "EI03EF07", texto: "Levantar hipóteses sobre gêneros textuais veiculados em portadores conhecidos, recorrendo a estratégias de observação gráfica e/ou de leitura." },
      { codigo: "EI03EF08", texto: "Selecionar livros e textos de gêneros conhecidos para a leitura de um adulto e/ou para sua própria leitura." },
      { codigo: "EI03EF09", texto: "Levantar hipóteses em relação à linguagem escrita, realizando registros de palavras e textos, por meio de escrita espontânea." },
    ],
    ET: [
      { codigo: "EI03ET01", texto: "Estabelecer relações de comparação entre objetos, observando suas propriedades." },
      { codigo: "EI03ET02", texto: "Observar e descrever mudanças em diferentes materiais, resultantes de ações sobre eles, em experimentos envolvendo fenômenos naturais e artificiais." },
      { codigo: "EI03ET03", texto: "Identificar e selecionar fontes de informações, para responder a questões sobre a natureza, seus fenômenos, sua conservação." },
      { codigo: "EI03ET04", texto: "Registrar observações, manipulações e medidas, usando múltiplas linguagens (desenho, registro por números ou escrita espontânea), em diferentes suportes." },
      { codigo: "EI03ET05", texto: "Classificar objetos e figuras de acordo com suas semelhanças e diferenças." },
      { codigo: "EI03ET06", texto: "Relatar fatos importantes sobre seu nascimento e desenvolvimento, a história dos seus familiares e da sua comunidade." },
      { codigo: "EI03ET07", texto: "Relacionar números às suas respectivas quantidades e identificar o antes, o depois e o entre em uma sequência." },
      { codigo: "EI03ET08", texto: "Expressar medidas (peso, altura etc.), construindo gráficos básicos." },
    ],
  },
};

const TEMAS_SUGERIDOS = [
  "Identidade e autovalorização",
  "Família e pertencimento",
  "Amizade e convivência",
  "Corpo e autocuidado",
  "Movimento e brincadeiras motoras",
  "Natureza e meio ambiente",
  "Animais e seres vivos",
  "Água e elementos da natureza",
  "Cores, formas e texturas",
  "Música e sons",
  "Artes e expressão criativa",
  "Histórias e contação",
  "Alimentação saudável",
  "Estações do ano",
  "Culturas e diversidade",
  "Espaço e noções de localização",
  "Números e quantidades no cotidiano",
  "Profissões e comunidade",
  "Festas e tradições populares",
  "Cuidado com o outro e empatia",
];
