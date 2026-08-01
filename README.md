# PlanoMEC — Plano de Aula Semanal (Educação Infantil)

Gera **plano de aula semanal** no formato da escola (`model.docx`):

| SEGUNDA | QUARTA | QUINTA | SEXTA |
|---------|--------|--------|-------|
| Lançamento, planejamento, motora fina, pátio… | … | … | … |

Com **OADs da BNCC**, exportação **Word (.docx)** e ideias opcionais com IA
(Gemini grátis, Ollama local ou Grok).

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
3. Em **Site configuration → Environment variables**, cadastre (opcional):
   - `GEMINI_API_KEY` — para o site oferecer Gemini sem o professor colar chave
   - `XAI_API_KEY` — idem para Grok
   - `GEMINI_MODEL` — para trocar o modelo padrão
4. Publique. O fluxo completo (gerar plano, IA, exportar Word) funciona no site.

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

## Fluxo

1. Identificação (professor, período, faixa etária BNCC)
2. Tema da semana + campos de experiência
3. OADs (objetivos BNCC) — opcional marcar
4. Detalhes opcionais
5. **Gerar planejamento** → tabela semanal
6. **Baixar Word (.docx)** (igual ao modelo)

No uso local, os arquivos também são salvos em `planejamentos/`.

## Estrutura

```
abrir.bat            ← duplo clique para uso local
server.js            ← servidor local (estáticos + /api/*)
netlify.toml         ← configuração do Netlify
.env                 ← chaves locais (não versionar)
model.docx           ← modelo de referência da escola
public/              ← site estático (publicado no Netlify)
  index.html
  css/styles.css
  js/
    app.js
    generator.js     ← plano semanal (funciona offline, sem IA)
    llm.js           ← cliente de IA (Gemini/Ollama/Grok)
    data/bncc.js     ← faixas, campos e OADs da BNCC
lib/                 ← código Node compartilhado
  export-docx.js     ← gera .docx no formato do modelo
  llm-providers.js   ← chamadas aos provedores de IA
netlify/functions/   ← rotas /api/* no Netlify
  llm.mjs
  config.mjs
  export-docx.mjs
```

## Referências

- BNCC — Educação Infantil (MEC)
- DCNEI — Resolução CNE/CEB nº 5/2009
