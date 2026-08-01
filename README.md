# PlanoMEC — Plano de Aula Semanal (Educação Infantil)

Gera **plano de aula semanal** no formato da escola (`model.docx`), com os
**dias da semana que você escolher** (padrão: Segunda · Quarta · Quinta · Sexta):

| SEGUNDA | QUARTA | QUINTA | SEXTA |
|---------|--------|--------|-------|
| Lançamento, planejamento, motora fina, pátio… | … | … | … |

Com **OADs da BNCC**, exportação **Word (.docx)** e ideias opcionais com IA
(Gemini grátis, Ollama local ou Grok). O resultado final é **editável direto
na tela** (clique e digite) e cada trecho tem um botão **✨ Melhorar com IA**
próprio, para ajudar quando bater aquele apagão criativo na hora de planejar.

Professoras podem **criar uma conta** e cadastrar suas turmas (escola, faixa
etária, dias da semana) uma vez só, sem precisar preencher tudo de novo toda
semana — ou **continuar sem conta** para um uso avulso, sem fricção nenhuma.

## Como abrir no computador (uso local)

**Não abra só o `index.html`.** Use o servidor local:

1. Dê **duplo clique** em `abrir.bat`
2. O navegador deve abrir em **http://localhost:3847**
3. Mantenha a janela preta aberta enquanto usa o app

Se a porta estiver ocupada, feche outras janelas do PlanoMEC e tente de novo.

## Como publicar no Netlify (uso na web)

O projeto já está pronto para o Netlify: o site estático fica em `public/`
e as rotas `/api/*` viram Functions em `netlify/functions/`.

1. Crie um repositório git com esta pasta (o `.gitignore` já protege o `.env`)
   e conecte-o a um site novo em [app.netlify.com](https://app.netlify.com)
   — ou use `netlify deploy` pela CLI.
2. O `netlify.toml` já define `publish = "public"` e a pasta de functions.
3. Em **Site configuration → Environment variables**, cadastre:
   - `SESSION_SECRET` **(obrigatório)** — segredo para assinar as sessões de
     login. Gere um valor aleatório longo (ex.: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
     e **use um valor diferente do `.env` local**. Sem essa variável, login e
     cadastro de turmas retornam erro 500 — o resto do app funciona normalmente.
   - `GEMINI_API_KEY` *(opcional)* — para o site oferecer Gemini sem o professor colar chave
   - `XAI_API_KEY` *(opcional)* — idem para Grok
   - `GEMINI_MODEL` *(opcional)* — para trocar o modelo padrão
4. Publique. O fluxo completo (login, turmas, gerar plano, IA, exportar Word)
   funciona no site. As turmas ficam salvas no **Netlify Blobs** (armazenamento
   nativo do Netlify, incluso em qualquer site — nenhuma conta externa é
   necessária).

Diferenças no site hospedado:

- O Word é **baixado no navegador** (não há pasta `planejamentos/` na nuvem).
- **Ollama** roda no computador do usuário; o navegador conecta direto em
  `http://127.0.0.1:11434`, mas é preciso iniciar o Ollama com
  `OLLAMA_ORIGINS=https://SEU-SITE.netlify.app`.
- As chaves de API salvas em ⚙ IA ficam **no navegador do professor**
  (localStorage); as variáveis de ambiente ficam só no servidor e
  **nunca são enviadas ao cliente**.
- Atenção: com `GEMINI_API_KEY` configurada no site, qualquer visitante consome
  a cota dessa chave. Use uma chave gratuita dedicada ou deixe sem e peça para
  cada professor colar a própria chave em ⚙ IA.
- O único pacote npm do projeto é o `@netlify/blobs` (usado só para salvar
  turmas no site hospedado). Rodar localmente com `abrir.bat`/`node server.js`
  **não precisa dele instalado** — nesse modo as turmas ficam em arquivos JSON
  na pasta `data/` (já protegida pelo `.gitignore`).

## IA sem créditos no Grok

O botão **⚙ IA** permite escolher:

| Provedor | Custo | Como usar |
|----------|-------|-----------|
| **Gemini (Google)** | Grátis (cota generosa) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → cole a chave |
| **Ollama** | 100% grátis no PC | Instale [ollama.com](https://ollama.com) → `ollama pull llama3.2` |
| **Grok (xAI)** | Pago | Precisa créditos em [console.x.ai](https://console.x.ai) |
| **Só o app** | Grátis | Plano BNCC local, sem IA |

No uso local também dá para colocar no `.env`:

```
GEMINI_API_KEY=AIza...
XAI_API_KEY=xai-...
```

## Contas e turmas

Ao abrir o app, a professora escolhe:

- **Criar conta / entrar** — cadastra turmas (escola, faixa etária, dias da
  semana) uma vez e reaproveita toda semana. Na volta, escolhe **Usar esta
  turma** e só preenche o período (datas) e o tema daquela semana.
- **Continuar sem conta** — vai direto pro gerador, do jeito que já era antes,
  sem nenhuma conta ou turma salva.

Login é feito com e-mail e senha (senha nunca é enviada em texto puro nem
guardada em texto puro — fica só o hash). Sem `SESSION_SECRET` configurado,
essa parte fica indisponível e o app mostra erro só ao tentar entrar/cadastrar
— o restante (gerar plano, exportar Word, IA) continua funcionando igual.

## Fluxo

1. **(Opcional)** Login/cadastro → escolher ou criar uma turma
2. Identificação (professor — já preenchido se logada —, período, faixa
   etária BNCC, dias da semana do plano)
3. Tema da semana + campos de experiência
4. OADs (objetivos BNCC) — opcional marcar
5. Detalhes opcionais
6. **Gerar planejamento** → tabela semanal, com **cada bloco editável e um
   botão ✨ Melhorar com IA** ao lado
7. **Baixar Word (.docx)** (igual ao modelo)

No uso local, os arquivos também são salvos em `planejamentos/`.

## Estrutura

```
abrir.bat            ← duplo clique para uso local
server.js            ← servidor local (estáticos + /api/*)
netlify.toml         ← configuração do Netlify
.env                 ← chaves e SESSION_SECRET locais (não versionar)
model.docx           ← modelo de referência da escola
data/                ← turmas/usuários no uso local (JSON, não versionado)
public/              ← site estático (publicado no Netlify)
  index.html
  css/styles.css
  js/
    app.js
    generator.js     ← plano semanal (funciona offline, sem IA)
    llm.js           ← cliente de IA (Gemini/Ollama/Grok)
    data/bncc.js     ← faixas, campos, dias da semana e OADs da BNCC
lib/                 ← código Node compartilhado
  export-docx.js     ← gera .docx no formato do modelo (colunas dinâmicas)
  llm-providers.js   ← chamadas aos provedores de IA
  store.js           ← armazenamento chave-valor (Netlify Blobs ou JSON local)
  auth.js            ← cadastro/login (hash de senha, sessão assinada)
  turmas.js          ← CRUD de turmas por professor(a)
netlify/functions/   ← rotas /api/* no Netlify
  llm.mjs
  config.mjs
  export-docx.mjs
  auth-register.mjs
  auth-login.mjs
  auth-me.mjs
  turmas.mjs
  turmas-item.mjs
```

## Referências

- BNCC — Educação Infantil (MEC)
- DCNEI — Resolução CNE/CEB nº 5/2009
