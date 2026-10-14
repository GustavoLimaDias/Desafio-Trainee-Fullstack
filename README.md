# Analisador de Documentos

Portal web em que usuários de um escritório cadastram textos jurídicos (trechos de contratos, petições, notificações, decisões) e geram, para cada um, uma **análise automática** com o tipo do documento, um resumo e os pontos de atenção (multas, prazos, juros, rescisão etc.).

A análise é feita por **regras fixas e determinísticas**, definidas no enunciado do desafio, e fica isolada atrás de uma interface para que possa ser trocada no futuro por uma implementação com IA sem mudar rotas, banco ou front-end.

Projeto desenvolvido para o desafio técnico Trainee Fullstack da DFA Correspondente. O enunciado original está no histórico do repositório (commit `3a47de9`). **Todos os dados usados em testes, exemplos e demonstração são fictícios.**

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Regras de negócio](#regras-de-negócio)
3. [Tecnologias](#tecnologias)
4. [Arquitetura e estrutura de pastas](#arquitetura-e-estrutura-de-pastas)
5. [Pré-requisitos](#pré-requisitos)
6. [Instalação do zero (Windows)](#instalação-do-zero-windows)
7. [Variáveis de ambiente](#variáveis-de-ambiente)
8. [Como usar o sistema](#como-usar-o-sistema)
9. [Dados fictícios para testes manuais](#dados-fictícios-para-testes-manuais)
10. [Exemplos oficiais do analisador](#exemplos-oficiais-do-analisador)
11. [API](#api)
12. [Testes](#testes)
13. [Build e CI](#build-e-ci)
14. [Decisões técnicas](#decisões-técnicas)
15. [Avaliação do analisador](#avaliação-do-analisador)
16. [Limitações conhecidas](#limitações-conhecidas)
17. [Melhorias futuras](#melhorias-futuras)
18. [Solução de problemas](#solução-de-problemas)

## Funcionalidades

### Requisitos obrigatórios do desafio

- **Usuários:** cadastro (nome, e-mail e senha), login com token JWT, logout e aviso de sessão expirada.
- **Documentos:** listagem do mais recente para o mais antigo, com opção de inverter a ordem e de filtrar só os documentos do usuário logado; página de detalhes; criação e edição com o mesmo formulário; remoção com confirmação.
- **Permissões:** só o autor vê e usa os botões de editar, remover e analisar, e a API responde `403` para os demais usuários.
- **Análise:** botão "Analisar documento" (apenas para o autor), que executa o analisador por regras, salva o resultado no banco e exibe tipo, resumo e pontos de atenção.
- **API:** validação de todas as entradas, status HTTP e formato de erro padronizados, datas em ISO 8601.
- **Banco:** PostgreSQL com migrations.
- **Testes automatizados:** o analisador gera exatamente a saída esperada dos 6 exemplos oficiais, e as regras da API são verificadas com banco real.

### Diferenciais implementados

| Diferencial | O que foi feito | Como foi verificado |
|---|---|---|
| Busca por título e paginação | Parâmetros opcionais `busca`, `pagina` e `por_pagina` em `GET /documentos` (sem eles, a resposta é exatamente a do enunciado). No front-end, campo de busca e botões "Anterior"/"Próxima", de 10 em 10 | Testes de integração e chamadas reais à API |
| Importação de `.txt` | Botão "Carregar arquivo .txt" no formulário de documento: o navegador lê o arquivo e preenche o campo conteúdo. O arquivo não é enviado nem guardado no servidor | Build do front-end. Não há teste automatizado de front-end |
| Testes de integração com banco real | `backend/test/api.test.js` sobe a API e usa um banco PostgreSQL só para testes | `npm test` |
| CI com GitHub Actions | `.github/workflows/ci.yml` roda os testes do back-end com PostgreSQL e o build do front-end a cada push e pull request | Os testes foram executados localmente só com as variáveis definidas no workflow; o workflow em si roda pela primeira vez no GitHub após o push |

Também foram incluídos, por segurança: limite de tentativas de login, limite de 72 bytes para a senha no cadastro e validação de formato de e-mail mais estrita (detalhes em [Regras de negócio](#regras-de-negócio)).

## Regras de negócio

### Usuários

- **Nome:** obrigatório, até 100 caracteres.
- **E-mail:** obrigatório e único, sem diferenciar maiúsculas: é salvo em minúsculas e convertido antes de comparar, no cadastro e no login. O formato exige um domínio com partes separadas por ponto e uma extensão de pelo menos 2 letras (máximo de 254 caracteres). Isso confere só o formato: não garante que o e-mail exista nem que pertença a quem se cadastrou.
- **Senha:** obrigatória, com no mínimo 8 caracteres e no máximo 72 bytes (veja [Decisões técnicas](#decisões-técnicas)). É salva apenas como hash `bcrypt` e nunca é retornada pela API.
- **E-mail já cadastrado:** `409`.
- **Login:** e-mail inexistente e senha errada respondem `401` com a mesma mensagem.
- **Limite de tentativas:** depois de 5 senhas erradas para o mesmo e-mail a partir do mesmo IP, o login responde `429` por 15 minutos, mesmo com a senha certa. Um login certo antes disso zera a contagem.
- **Sessão:** o token vale por 8 horas. Quando a API recusa o token, o front-end desloga e avisa no login que a sessão expirou.
- **Cadastro:** não faz login automático; o usuário é levado à página de login.

### Documentos

- **Acesso:** todas as páginas e endpoints exigem login. Qualquer usuário logado vê todos os documentos, mas só o **autor** pode editar, remover ou analisar.
- **Título:** obrigatório, até 200 caracteres.
- **Conteúdo:** obrigatório, até 50.000 caracteres.
- **Campos em branco:** título ou conteúdo vazios ou só com espaços e quebras de linha respondem `400`.
- **Contagem de caracteres:** os limites contam caracteres Unicode, então um emoji conta como 1.
- **Sem alteração no texto:** título e conteúdo são salvos **exatamente como enviados**, sem `trim`.
- **Edição:** o `PUT` sempre recebe título e conteúdo. Se o conteúdo mudar (comparação exata), a análise existente é apagada. Se só o título mudar, a análise é mantida.
- **Remoção:** remove também a análise.

### Analisador

- **Entrada e saída:** recebe apenas o `conteudo` do documento e devolve `{ tipo, resumo, pontos_de_atencao }`.
- **Tipo:** `contrato`, `peticao`, `decisao`, `notificacao` ou `outro`. Vence o tipo com mais termos diferentes do glossário encontrados; em empate, a prioridade é `decisao`, `peticao`, `notificacao`, `contrato`; sem nenhum termo, o tipo é `outro`.
- **Resumo:** as duas primeiras frases, cortadas em 300 caracteres com `...`.
- **Pontos de atenção:** frases com termos como multa, prazo, juros, rescisão, indenização, despejo e honorários, sem repetir frases idênticas.
- **Detalhes das regras:** normalização Unicode, divisão em frases e comparação de palavras inteiras sem acento e sem diferenciar maiúsculas seguem exatamente o enunciado. Os exemplos comentados estão em [`exemplos/README.md`](exemplos/README.md).
- **Uma análise por documento:** analisar de novo substitui a análise anterior. O banco guarda qual analisador gerou a análise (`"regras"`) e quando.

## Tecnologias

| Tecnologia | Função |
|---|---|
| Node.js (JavaScript, ES Modules) | Ambiente de execução do back-end e das ferramentas |
| Express 5 | Servidor HTTP e rotas da API. Encaminha erros de funções `async` ao middleware de erro sem `try/catch` em cada controller |
| PostgreSQL + `pg` | Banco de dados, acessado com SQL puro e consultas parametrizadas |
| `bcryptjs` | Hash de senhas, em JavaScript puro (sem compilação nativa no Windows) |
| `jsonwebtoken` | Geração e validação do token JWT (HS256, validade de 8 horas) |
| `node:test` + `fetch` nativo | Testes automatizados, sem bibliotecas extras |
| React 19 | Interface do usuário |
| React Router 7 | Rotas do front-end e proteção das páginas logadas |
| Vite 8 | Servidor de desenvolvimento e build do front-end |
| CSS puro | Estilos (`frontend/src/estilos.css`), sem biblioteca de UI |
| GitHub Actions | Integração contínua |

## Arquitetura e estrutura de pastas

```
.
├── backend/
│   ├── src/
│   │   ├── server.js        inicia a API (valida a configuração antes de abrir a porta)
│   │   ├── app.js           monta o Express: CORS, JSON, rotas e tratamento de erros
│   │   ├── config.js        lê as variáveis de ambiente
│   │   ├── erros.js         ErroApp: status HTTP + código de erro padronizado
│   │   ├── validacao.js     validação das entradas
│   │   ├── rotas/           URL → middleware + controller
│   │   ├── controllers/     lê a requisição, valida e monta a resposta
│   │   ├── services/        regras de negócio (autor, regra do PUT, hash, token, limite de login)
│   │   ├── repositorios/    SQL
│   │   ├── analisadores/    interface do analisador, glossário e implementação por regras
│   │   ├── middlewares/     autenticação e tratamento de erros
│   │   └── db/              conexão, transação, migrations e script de demonstração
│   └── test/                testes do analisador e de integração da API
├── frontend/
│   └── src/
│       ├── paginas/         uma por tela (login, cadastro, lista, detalhes, novo, editar)
│       ├── componentes/     RotaProtegida, DocumentoForm, Campo, EtiquetaTipo, Carregando/MensagemErro
│       ├── api.js           chamadas à API com o token; em 401, desloga
│       ├── AuthContext.jsx  usuário logado (token e dados no localStorage)
│       └── useRequisicao.js estados de carregamento e erro das consultas
├── exemplos/                6 documentos oficiais do desafio e as saídas esperadas
└── .github/workflows/       pipeline de CI
```

O fluxo de uma requisição é `rotas → controllers → services → repositórios`. O analisador é usado só pelo service de documentos, por meio de `obterAnalisador()`.

## Pré-requisitos

- **Node.js 22.12 ou superior**, com o npm que o acompanha. O Vite 8 exige no mínimo essa versão, e os scripts usam `--env-file` do Node. O desenvolvimento foi feito com o Node 24.15 e o npm 12.
- **PostgreSQL** com um usuário que possa criar bancos. O desenvolvimento foi feito com o PostgreSQL 18; a CI usa o 16.
- **Git**, para clonar o repositório.

## Instalação do zero (Windows)

Os comandos abaixo são para o **PowerShell**. Em Linux ou macOS, troque `Copy-Item` por `cp`.

### 1. Clonar o repositório

```powershell
git clone https://github.com/GustavoLimaDias/Desafio-Trainee-Fullstack.git
cd Desafio-Trainee-Fullstack
```

### 2. Criar os bancos

São dois bancos: um para a aplicação e outro, separado, para os testes de integração (**o banco de testes é apagado a cada execução dos testes**).

```powershell
createdb -h localhost -U postgres analisador_documentos
createdb -h localhost -U postgres analisador_documentos_test
```

Se o `createdb` não estiver no PATH, use o caminho completo da sua instalação, por exemplo:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -U postgres analisador_documentos
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -U postgres analisador_documentos_test
```

### 3. Configurar e iniciar o back-end

Na pasta `backend`:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edite o arquivo `backend/.env` com o usuário e a senha do seu PostgreSQL e com um `JWT_SECRET` aleatório (veja [Variáveis de ambiente](#variáveis-de-ambiente)). Para gerar o segredo:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Crie as tabelas. Este comando também serve para verificar a conexão com o banco:

```powershell
npm run db:migrar
```

A saída esperada é `Aplicada: 001_criar_tabelas.sql`, ou `Nenhuma migration pendente.` se as tabelas já existirem. Se aparecer `Falha ao migrar: ...`, veja [Solução de problemas](#solução-de-problemas).

Inicie a API (ela fica rodando neste terminal):

```powershell
npm run dev
```

A API sobe em `http://localhost:3000` e mostra `API rodando em http://localhost:3000`. O `npm run dev` reinicia sozinho quando um arquivo muda; o `npm start` executa sem esse recarregamento.

### 4. Iniciar o front-end

Em **outro terminal**, a partir da raiz do repositório:

```powershell
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. O front-end chama a API em `http://localhost:3000`; para usar outro endereço, copie `frontend/.env.example` para `frontend/.env` e ajuste `VITE_API_URL`.

### 5. (Opcional) Carregar os dados de demonstração

O banco começa **vazio**. Para ter usuários e documentos prontos, veja [Dados fictícios para testes manuais](#dados-fictícios-para-testes-manuais).

## Variáveis de ambiente

### `backend/.env` (copiado de `backend/.env.example`)

| Variável | Obrigatória | Finalidade | Exemplo fictício |
|---|---|---|---|
| `DATABASE_URL` | Sim | Conexão com o banco da aplicação | `postgres://usuario:senha@localhost:5432/analisador_documentos` |
| `JWT_SECRET` | Sim | Segredo para assinar os tokens. Use um valor aleatório e não o compartilhe | `troque-por-um-valor-aleatorio` |
| `DATABASE_URL_TEST` | Só para os testes de integração | Banco de testes, **apagado a cada execução**. Precisa ser diferente do `DATABASE_URL` | `postgres://usuario:senha@localhost:5432/analisador_documentos_test` |
| `PORT` | Não (padrão `3000`) | Porta da API | `3000` |
| `FRONTEND_URL` | Não (padrão `http://localhost:5173`) | Origem do front-end liberada no CORS | `http://localhost:5173` |
| `ANALISADOR` | Não (padrão `regras`) | Implementação do analisador. Hoje só existe `regras`; outro valor impede a API de subir | `regras` |

Se a senha do banco tiver caracteres especiais (`@`, `:`, `/`, `#`), codifique-os na URL (ex.: `@` vira `%40`).

O arquivo `.env` está no `.gitignore` e não deve ser commitado.

### `frontend/.env` (opcional, copiado de `frontend/.env.example`)

| Variável | Obrigatória | Finalidade | Exemplo |
|---|---|---|---|
| `VITE_API_URL` | Não (padrão `http://localhost:3000`) | Endereço da API. É fixado no momento do build | `http://localhost:3000` |

## Como usar o sistema

1. **Criar conta:** em `http://localhost:5173`, clique em **Cadastre-se** e informe nome, e-mail e senha (mínimo de 8 caracteres). Depois do cadastro, você é levado ao login.
2. **Entrar:** informe e-mail e senha. A lista de documentos é aberta.
3. **Lista de documentos:**
   - mostra título, autor, data de criação e tipo (ou "Não analisado");
   - o botão de ordenação alterna entre "Mais recentes primeiro" e "Mais antigos primeiro";
   - "Apenas meus documentos" filtra os seus;
   - o campo de busca filtra pelo título;
   - a lista mostra 10 documentos por página.
4. **Novo documento:** clique em **Novo documento**, preencha título e conteúdo (ou use **Carregar arquivo .txt**) e salve. A página de detalhes é aberta.
5. **Analisar:** nos detalhes de um documento seu, clique em **Analisar documento**. O tipo, o resumo e os pontos de atenção aparecem no painel "Análise". Analisar de novo substitui a análise.
6. **Editar:** clique em **Editar**. Se você mudar o conteúdo, a análise é apagada e precisa ser gerada de novo.
7. **Remover:** clique em **Remover** e confirme. O documento e a análise dele são apagados.
8. **Sair:** botão **Sair** no topo.

## Dados fictícios para testes manuais

O banco começa vazio. Há duas formas de ter usuários para testar.

**Opção 1: cadastrar pela interface.** Crie duas contas pela página de cadastro, com e-mails fictícios como `ana@exemplo.com` e `bruno@exemplo.com`.

**Opção 2: script de demonstração.** Execute uma vez, na pasta `backend`, depois de configurar o `.env` e rodar `npm run db:migrar`. A API não precisa estar rodando:

```powershell
npm run db:demo
```

O script cadastra dois usuários e cinco documentos fictícios no banco do `DATABASE_URL`:
- **Segurança:** mostra qual banco vai alterar (ex.: `Banco: localhost:5432/analisador_documentos`) e se recusa a rodar com `NODE_ENV=production` ou quando o `DATABASE_URL` é igual ao `DATABASE_URL_TEST`.
- **Pode ser repetido:** não duplica registros, porque usuários com o mesmo e-mail e documentos com o mesmo título do mesmo autor são mantidos. Não apaga nem altera dados existentes; um usuário que já exista **não** tem a senha trocada (se você já cadastrou `ana@exemplo.com` ou `bruno@exemplo.com` pela interface, vale a senha que você escolheu).
- **Mesmas regras da aplicação:** cria os usuários pelo mesmo serviço do cadastro (senha com hash) e as análises pelo mesmo serviço do botão "Analisar".
- **Só manual:** nunca é executado automaticamente. Nem a API nem as migrations o chamam.

**Usuários criados pelo script.** As senhas são fictícias e servem **apenas para ambiente local de teste**; não use essas senhas em nenhum ambiente real.

| Nome | E-mail | Senha | Para que serve |
|---|---|---|---|
| Ana Souza | `ana@exemplo.com` | `Demo@2026` | Uso normal: tem 3 documentos, analisados e não analisados |
| Bruno Lima | `bruno@exemplo.com` | `Demo@2026` | Conferir permissões e o filtro "Apenas meus documentos" |

**Documentos criados pelo script:**

| Autor | Título | Análise salva |
|---|---|---|
| Ana Souza | Contrato de prestação de serviços - Estúdio Aurora | `contrato` |
| Ana Souza | Notificação extrajudicial - Condomínio Jardim dos Ipês | nenhuma (ao analisar: `notificacao`) |
| Ana Souza | Ata de reunião interna - organização da agenda | `outro` (nenhum termo do glossário, sem pontos de atenção) |
| Bruno Lima | Petição inicial - cobrança de serviços de reforma | `peticao` |
| Bruno Lima | Sentença - ação de obrigação de fazer | nenhuma (ao analisar: `decisao`) |

**Roteiro para verificar permissões:**

1. Entre como **Ana**. A lista mostra os 5 documentos. Inverta a ordem e marque "Apenas meus documentos": ficam 3.
2. Abra a notificação e clique em **Analisar documento**. Edite só o título: a análise continua. Edite o conteúdo: a análise é apagada.
3. Abra um documento do Bruno: ele aparece, mas sem os botões de editar, remover e analisar.
4. Saia e entre como **Bruno**. Os documentos da Ana aparecem só para leitura, e "Apenas meus documentos" mostra os 2 dele. A recusa da API (`403`) para quem não é o autor é verificada em `backend/test/api.test.js`.

**Para remover os dados de demonstração** (as análises vão junto pelo `ON DELETE CASCADE`), execute no banco de desenvolvimento, por exemplo com `psql "<sua DATABASE_URL>"`:

```sql
DELETE FROM documentos WHERE autor_id IN (SELECT id FROM usuarios WHERE email IN ('ana@exemplo.com', 'bruno@exemplo.com'));
DELETE FROM usuarios WHERE email IN ('ana@exemplo.com', 'bruno@exemplo.com');
```

Isso também apaga qualquer documento que você tenha criado logado como Ana ou Bruno.

## Exemplos oficiais do analisador

A pasta [`exemplos/`](exemplos/) contém os 6 documentos fictícios do enunciado (`.txt`) e a saída esperada de cada um (`.esperado.json`). Esses arquivos não são alterados pelo projeto.

| Arquivo | Finalidade | Tipo esperado | Pontos de atenção |
|---|---|---|---|
| `01-contrato-locacao` | Documento comum de contrato | `contrato` | 3 |
| `02-peticao-indenizacao` | Documento comum de petição (resumo cortado em 300 caracteres) | `peticao` | 4 |
| `03-sentenca-cobranca` | Documento comum de decisão | `decisao` | 3 |
| `04-notificacao-aluguel` | Documento comum de notificação | `notificacao` | 2 |
| `05-procuracao` | Documento sem termos do glossário | `outro` | 0 |
| `06-casos-de-borda` | Casos de borda: `\r\n` e `\r`, tab, espaço não separável, acentos em NFD, emojis, empate de tipos e frases repetidas | `decisao` | 6 |

**Comparação automática** (na pasta `backend`, não precisa de banco):

```powershell
node --test test/analisador.regras.test.js
```

O teste lê cada `.txt` diretamente da pasta `exemplos/`, executa o analisador e compara o resultado com o `.esperado.json` correspondente. Ele também roda dentro do `npm test`.

**Comparação pela interface:** crie um documento com o conteúdo de um dos `.txt` e clique em **Analisar documento**. O tipo, o resumo e os pontos de atenção devem ser iguais aos do `.esperado.json` de mesmo nome. Para os exemplos 01 a 05, copiar e colar funciona. O exemplo 06 tem caracteres invisíveis que o navegador pode alterar ao colar; para ele, prefira o botão **Carregar arquivo .txt**, que preenche o conteúdo com o texto do arquivo como ele é, ou use o teste automatizado.

## API

Base: `http://localhost:3000`. Corpo das requisições e respostas em JSON. As rotas autenticadas recebem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Autenticação | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/auth/cadastro` | não | `201` usuário | `400`, `409` |
| POST | `/auth/login` | não | `200` token + usuário | `400`, `401`, `429` |
| GET | `/documentos` | sim | `200` lista | `400`, `401` |
| GET | `/documentos/:id` | sim | `200` documento | `401`, `404` |
| POST | `/documentos` | sim | `201` documento | `400`, `401` |
| PUT | `/documentos/:id` | sim (autor) | `200` documento | `400`, `401`, `403`, `404` |
| DELETE | `/documentos/:id` | sim (autor) | `204` sem corpo | `401`, `403`, `404` |
| POST | `/documentos/:id/analise` | sim (autor) | `201` análise | `401`, `403`, `404` |

### Erros

Todos os erros têm o formato:

```json
{ "erro": "VALIDACAO", "mensagem": "O campo 'titulo' é obrigatório." }
```

| Status | `erro` | Quando |
|---|---|---|
| `400` | `VALIDACAO` | Entrada inválida, JSON malformado ou parâmetro de consulta inválido |
| `401` | `NAO_AUTENTICADO` | Sem token, token inválido ou expirado, login incorreto |
| `403` | `SEM_PERMISSAO` | Usuário não é o autor do documento |
| `404` | `NAO_ENCONTRADO` | Documento ou rota inexistente (inclui ids inválidos, como `/documentos/abc`) |
| `409` | `CONFLITO` | E-mail já cadastrado |
| `429` | `MUITAS_TENTATIVAS` | Excesso de senhas erradas no login (não previsto no enunciado) |
| `500` | `ERRO_INTERNO` | Erro inesperado (não previsto no enunciado) |

### Parâmetros de `GET /documentos`

| Parâmetro | Valores | Padrão | Efeito |
|---|---|---|---|
| `ordem` | `desc` ou `asc` | `desc` | Ordem pela data de criação |
| `meus` | `true` ou `false` | `false` | Só os documentos do usuário logado |
| `busca` (opcional) | texto | sem filtro | Título contém o texto, sem diferenciar maiúsculas (acentos fazem diferença); vazio ou só espaços é ignorado |
| `pagina` (opcional) | inteiro de 1 a 1.000.000 | `1` | Página desejada |
| `por_pagina` (opcional) | inteiro de 1 a 100 | `10` | Itens por página |

Sem `pagina` nem `por_pagina`, a lista traz todos os documentos. Valores diferentes dos aceitos, ou parâmetros repetidos, respondem `400`.

### Exemplos

**Cadastro**

```http
POST /auth/cadastro
Content-Type: application/json

{ "nome": "Ana Souza", "email": "Ana@Exemplo.com", "senha": "Demo@2026" }
```

```json
201
{ "id": 1, "nome": "Ana Souza", "email": "ana@exemplo.com" }
```

**Login**

```http
POST /auth/login
Content-Type: application/json

{ "email": "ana@exemplo.com", "senha": "Demo@2026" }
```

```json
200
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { "id": 1, "nome": "Ana Souza", "email": "ana@exemplo.com" }
}
```

**Criar documento** (o `PUT /documentos/:id` recebe o mesmo corpo, sempre com os dois campos, e responde `200` no mesmo formato)

```http
POST /documentos
Authorization: Bearer <token>
Content-Type: application/json

{ "titulo": "Contrato de locação - Rua das Acácias", "conteudo": "CONTRATO DE LOCAÇÃO RESIDENCIAL\n\nPelo presente instrumento..." }
```

```json
201
{
  "id": 7,
  "titulo": "Contrato de locação - Rua das Acácias",
  "conteudo": "CONTRATO DE LOCAÇÃO RESIDENCIAL\n\nPelo presente instrumento...",
  "autor": { "id": 1, "nome": "Ana Souza" },
  "criado_em": "2026-10-06T14:30:00.000Z",
  "atualizado_em": "2026-10-06T14:30:00.000Z",
  "analise": null
}
```

O `GET /documentos/:id` responde nesse mesmo formato, com a análise no campo `analise` (ou `null`).

**Listar documentos**

```http
GET /documentos?ordem=asc&meus=true
Authorization: Bearer <token>
```

```json
200
[
  {
    "id": 7,
    "titulo": "Contrato de locação - Rua das Acácias",
    "autor": { "id": 1, "nome": "Ana Souza" },
    "criado_em": "2026-10-06T14:30:00.000Z",
    "tipo": "contrato"
  }
]
```

`tipo` é `null` quando o documento ainda não foi analisado.

**Analisar documento** (substitui a análise anterior, se houver)

```http
POST /documentos/7/analise
Authorization: Bearer <token>
```

```json
201
{
  "tipo": "contrato",
  "resumo": "CONTRATO DE LOCAÇÃO RESIDENCIAL Pelo presente instrumento, ...",
  "pontos_de_atencao": ["CLÁUSULA SEGUNDA - O prazo de vigência da locação é de 30 meses, ..."],
  "analisador": "regras",
  "criado_em": "2026-10-06T14:31:00.000Z"
}
```

**Erro de permissão**

```http
DELETE /documentos/7
Authorization: Bearer <token de outro usuário>
```

```json
403
{ "erro": "SEM_PERMISSAO", "mensagem": "Apenas o autor pode alterar este documento." }
```

## Testes

Na pasta `backend`:

```powershell
npm test
```

| Arquivo | O que testa | Precisa de banco? |
|---|---|---|
| `test/analisador.regras.test.js` | Os 6 exemplos oficiais (saída idêntica ao `.esperado.json`), seleção do analisador e texto vazio | Não |
| `test/server.test.js` | A API não sobe (código de saída 1) com a porta ocupada ou sem `JWT_SECRET` | Não |
| `test/api.test.js` | Integração da API: cadastro e login (incluindo `409`, `401` e limite de tentativas), `401`, `403`, `404`, validações, ordenação, filtro `meus`, busca, paginação, regras do `PUT`, análise, remoção e concorrência entre `PUT` e análise | Sim, o `DATABASE_URL_TEST` |

- Os testes de integração aplicam as migrations no banco de testes e o **limpam antes de cada teste**. Por isso o `DATABASE_URL_TEST` precisa apontar para um banco separado; se ele for igual ao `DATABASE_URL`, esses testes são pulados.
- Sem `DATABASE_URL_TEST`, os testes de integração aparecem como pulados (`skipped`) e só os do analisador rodam.
- O resultado esperado é `fail 0`.

Para rodar só os testes do analisador:

```powershell
node --test test/analisador.regras.test.js
```

Não há testes automatizados de front-end (veja [Melhorias futuras](#melhorias-futuras)).

## Build e CI

**Build do front-end** (na pasta `frontend`):

```powershell
npm run build     # gera os arquivos estáticos em frontend/dist
npm run preview   # serve o build localmente, para conferência
```

O `VITE_API_URL` é fixado no momento do build. Não há configuração de produção ou de deploy neste projeto. Para a API, o `npm start` executa sem recarregamento automático, mas continua lendo o `backend/.env`.

**CI:** o arquivo `.github/workflows/ci.yml` roda a cada push e pull request, em dois jobs:
- **backend:** sobe um PostgreSQL 16 temporário e executa `npm ci` e `npm test`, com `DATABASE_URL_TEST` e `JWT_SECRET` definidos no próprio workflow. São valores apenas do CI, não segredos.
- **frontend:** executa `npm ci` e `npm run build`.

## Decisões técnicas

- **`pg` com SQL puro em vez de ORM:** são três tabelas, então um ORM traria mais configuração do que benefício. Cada consulta fica explícita no repositório e sempre usa parâmetros (`$1`, `$2`), o que evita injeção de SQL. A única parte montada no texto da consulta é a direção da ordenação, escolhida entre dois valores fixos depois da validação.
- **Migrations próprias:** `npm run db:migrar` aplica os arquivos `.sql` de `backend/src/db/migrations/` em ordem, cada um numa transação, e registra os aplicados na tabela `migracoes`.
- **Banco de dados:**
  - `usuarios.email` é `UNIQUE` e sempre gravado em minúsculas;
  - `analises.documento_id` é `UNIQUE`, e uma nova análise substitui a anterior com `INSERT ... ON CONFLICT DO UPDATE`;
  - `analises` referencia `documentos` com `ON DELETE CASCADE`;
  - `pontos_de_atencao` é `jsonb`;
  - `analises.tipo` tem um `CHECK` com os cinco tipos válidos.
- **Concorrência:** o `PUT` e a análise travam a linha do documento (`SELECT ... FOR UPDATE`) dentro de uma transação. Assim, um `PUT` que muda o conteúdo enquanto uma análise roda não deixa salva a análise do conteúdo antigo, e analisar um documento removido ao mesmo tempo responde `404`. Com um analisador lento (ex.: IA), a trava duraria o tempo da chamada.
- **Analisador trocável:** o resto da aplicação depende apenas de `obterAnalisador()` (`backend/src/analisadores/index.js`), que devolve `{ nome, analisar(conteudo) }` conforme a variável `ANALISADOR`. O `nome` é salvo no campo `analisador`. Para adicionar um analisador com IA, basta criar a implementação e registrá-la no mapa desse arquivo.
- **Falhar ao subir, não na primeira requisição:** a API não inicia se `DATABASE_URL` ou `JWT_SECRET` faltarem, se `ANALISADOR` for desconhecido ou se a porta estiver ocupada, e mostra a causa no terminal.
- **Senha com no máximo 72 bytes:** o `bcrypt` só usa os primeiros 72 bytes da senha, então o final de uma senha maior seria ignorado sem aviso.
  - Em vez de trocar o algoritmo, o que exigiria migrar os hashes já salvos, o cadastro recusa senhas acima desse tamanho com `400`.
  - O login não mudou, então nenhuma conta existente deixa de funcionar.
  - 72 bytes equivalem a 72 caracteres sem acento; letras acentuadas ocupam 2 bytes e emojis, 4.
- **Limite de tentativas sem dependência:** um módulo pequeno (`services/limiteLogin.js`) guarda em memória as falhas por IP e e-mail. A contagem por e-mail **e** IP evita que um atacante bloqueie a conta de outra pessoa a partir de outros endereços.
- **Sem bibliotecas extras de validação, CORS, testes ou variáveis de ambiente:** as validações são poucas e diretas, o CORS é um middleware de poucas linhas, os testes usam `node:test` e o `.env` é lido com o `--env-file` nativo do Node.
- **Limites de tamanho coerentes:**
  - título (200) e conteúdo (50.000) contam caracteres Unicode, da mesma forma que o analisador;
  - o front-end valida os mesmos limites antes de enviar;
  - o corpo JSON aceita até 1 MB, o suficiente para 50.000 caracteres mesmo com acentos e emojis;
  - o arquivo `.txt` importado pode ter até 1 MB, e o texto resultante passa pelo limite de 50.000 caracteres.
- **Dados de demonstração por script explícito (`npm run db:demo`), e não por migration:** o projeto continua subindo com o banco vazio e nenhuma conta padrão é criada sem que alguém peça.
- **Pontos que o enunciado não define:**
  - id inválido responde `404`;
  - parâmetro repetido na listagem responde `400`, e os valores diferenciam maiúsculas (`ASC` é inválido);
  - o título também é salvo sem `trim`;
  - documentos com a mesma data de criação são ordenados pelo `id`;
  - `atualizado_em` muda em todo `PUT`;
  - o login não valida o formato do e-mail (um e-mail inválido simplesmente não é encontrado e responde `401`);
  - as rotas do front-end usam `/documentos/...`, as mesmas da API, porque a API é chamada pelo endereço completo (`VITE_API_URL`), e não por proxy do Vite.
- **Interface:** CSS puro com paleta em variáveis, cores por tipo de documento e layout adaptado a telas pequenas. A confirmação de remoção usa o `window.confirm` do navegador, que é acessível e funciona em qualquer tela.

## Avaliação do analisador

As regras fixas acertam o **tipo** dos exemplos 01 a 04 e classificam a procuração (05) como `outro`, que é o esperado pelas regras. Os pontos de atenção também encontram bem as frases com multa, juros, prazo e honorários. O resultado piora nos seguintes casos:

- **Resumo que não resume.** O resumo é sempre as duas primeiras frases. Na sentença (03), isso vira só o cabeçalho do tribunal ("PODER JUDICIÁRIO DO ESTADO DE MINAS GERAIS Comarca de Belo Horizonte - 12ª Vara Cível"), sem dizer que o pedido foi julgado procedente. Na notificação (04), vira o título e o nome do notificante. Na petição (02), o corte em 300 caracteres termina no meio de uma palavra ("Construtora Horizonte Az...").
- **Informação importante fora dos pontos de atenção.** Na notificação (04), a frase com o valor da dívida (R$ 5.400,00) não tem nenhum termo do glossário e fica de fora. No contrato (01), o valor do aluguel e o vencimento também não aparecem.
- **Falsos positivos por palavra solta.** Na petição (02), a frase de abertura entra nos pontos de atenção só porque o nome da ação contém "INDENIZAÇÃO". O termo aparece, mas a frase não é um risco.
- **Glossário limitado.** "multado" não casa com `multa`, a procuração não tem um tipo próprio e os poderes amplos dados ao advogado ("transigir", "receber valores"), que merecem atenção, não são detectados.
- **Sem contexto.** As regras não entendem negação nem a quem um ponto se aplica, e o desempate por prioridade (`decisao` antes de `peticao`) é arbitrário, como mostra o exemplo 06, uma mensagem de cliente classificada como decisão.

Um analisador com IA resolveria a maior parte disso: geraria um resumo de fato ("sentença que condena o réu a pagar R$ 7.200,00 de taxas condominiais, com correção e juros"), identificaria valores, datas e prazos sem depender de uma lista de termos, reconheceria tipos fora do glossário e explicaria por que cada ponto merece atenção. Em troca, a saída deixa de ser determinística, há custo e latência por chamada, os textos são enviados a um serviço externo (o que exige cuidado com dados sensíveis) e a resposta do modelo precisa ser validada (tipo dentro dos valores permitidos, resumo como texto, pontos como lista de textos) antes de ser salva.

## Limitações conhecidas

- **Limite de login em memória:** vale para um único processo da API e zera quando ela reinicia. Com várias instâncias, cada uma teria sua própria contagem. Tentativas simultâneas podem passar um pouco do limite de 5. Atrás de um proxy, todos os acessos teriam o IP do proxy, a menos que o Express seja configurado com `trust proxy`.
- **Busca:** não ignora acentos ("peticao" não encontra "Petição").
- **Paginação na interface:** o front-end sabe se há próxima página pedindo um item a mais; a API não informa o total de páginas.
- **Importação:** só `.txt` em UTF-8. Arquivos em outra codificação (ex.: Windows-1252) podem aparecer com caracteres trocados. PDF não é suportado.
- **Token:** fica no `localStorage`, o que o expõe em caso de XSS. Também não há como revogar um token antes de ele expirar (8 horas).
- **E-mail:** domínios com acento (ex.: `ação.com.br`) não são aceitos no cadastro.
- **Testes:** a interface não tem testes automatizados; os fluxos de tela são verificados manualmente.

## Melhorias futuras

Diferenciais do enunciado que **não** foram implementados:

| Item | Motivo |
|---|---|
| Analisador com IA | Exige a chave de um provedor pago, que não há como configurar com segurança neste projeto. A interface já está pronta para recebê-lo, com validação da resposta do modelo e tratamento de falhas do provedor |
| TypeScript | Migrar o projeto inteiro no prazo traria risco de regressão sem mudar o comportamento |
| Docker / Docker Compose | O Docker não estava disponível no ambiente de desenvolvimento, e uma configuração não testada não foi incluída |
| Histórico de análises | Exige nova tabela, endpoint e tela; ficou fora para não arriscar a regra atual de substituição e remoção da análise |
| Testes de front-end | Exigiriam Vitest, Testing Library e jsdom; a prioridade foi cobrir as regras no back-end |
| Swagger / OpenAPI | Os endpoints estão documentados neste README, com exemplos |
| Deploy | Exigiria conta e credenciais em um serviço externo |
| Importação de PDF | Exigiria uma biblioteca de extração de texto |

Outras melhorias: guardar o token em cookie `httpOnly`, mover o limite de login para o banco (ou Redis) se a API tiver mais de uma instância e informar o total de itens na paginação.

## Solução de problemas

As mensagens que vêm do PostgreSQL aparecem no idioma configurado no servidor do banco (em inglês, por exemplo, `database "..." does not exist` e `password authentication failed`).

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `node: .env: not found` ao rodar `npm run dev`, `npm start`, `npm run db:migrar` ou `npm run db:demo` | O arquivo `backend/.env` não existe | Na pasta `backend`, rode `Copy-Item .env.example .env` e preencha os valores |
| `Error: Variável de ambiente DATABASE_URL não definida` (ou `JWT_SECRET`) | A variável está vazia ou ausente no `.env` | Preencha a variável em `backend/.env` |
| `Falha ao migrar: ECONNREFUSED` | O PostgreSQL não está rodando ou a porta/host do `DATABASE_URL` está errado | Inicie o serviço do PostgreSQL (no Windows, em "Serviços") e confira host e porta |
| `Falha ao migrar: banco de dados "..." não existe` | O banco não foi criado | Rode o `createdb` do passo [Criar os bancos](#2-criar-os-bancos) |
| `Falha ao migrar: autenticação do tipo senha falhou` | Usuário ou senha errados no `DATABASE_URL` | Corrija o `.env`. Se a senha tiver `@`, `:`, `/` ou `#`, codifique na URL (`@` vira `%40`) |
| `Não foi possível iniciar a API na porta 3000: ... EADDRINUSE` | Outro processo já usa a porta | Feche o outro processo ou mude `PORT` no `.env` (e ajuste `VITE_API_URL` no front-end) |
| `Error: Analisador desconhecido: ...` | `ANALISADOR` tem um valor que não existe | Use `ANALISADOR=regras` ou remova a variável |
| Página mostra "Não foi possível conectar à API." | A API não está rodando ou o `VITE_API_URL` aponta para outro endereço | Inicie a API e confira o `VITE_API_URL` |
| Erro de CORS no console do navegador | O Vite subiu em outra porta (ex.: `5174`, quando a `5173` está ocupada) ou o `FRONTEND_URL` não corresponde | Ajuste `FRONTEND_URL` no `backend/.env` para o endereço exibido pelo Vite e reinicie a API |
| Testes de integração aparecem como `skipped` | `DATABASE_URL_TEST` não definido ou igual ao `DATABASE_URL` | Crie o banco de testes e defina `DATABASE_URL_TEST` no `backend/.env` |
| "Muitas tentativas de login" durante o desenvolvimento | 5 senhas erradas seguidas para o mesmo e-mail | Aguarde 15 minutos ou reinicie a API (a contagem fica em memória) |
| `npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada` (ou `running scripts is disabled`) | Política de execução padrão do Windows PowerShell | Use `npm.cmd` no lugar de `npm` (ex.: `npm.cmd install`) ou libere scripts para o seu usuário com `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `npm install` falha ou o Vite reclama da versão do Node | Node.js anterior ao 22.12 | Atualize o Node.js |
