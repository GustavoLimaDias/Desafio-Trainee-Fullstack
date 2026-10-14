import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Os testes de integração usam um banco próprio, que é limpo a cada teste.
const urlTeste = process.env.DATABASE_URL_TEST;
const motivoPular = !urlTeste
  ? 'DATABASE_URL_TEST não definida (veja .env.example)'
  : urlTeste === process.env.DATABASE_URL && 'DATABASE_URL_TEST não pode ser igual a DATABASE_URL';

describe('API', { skip: motivoPular }, () => {
  let servidor, base, pool;

  before(async () => {
    process.env.DATABASE_URL = urlTeste;
    process.env.JWT_SECRET ??= 'segredo-de-teste';
    const { app } = await import('../src/app.js');
    ({ pool } = await import('../src/db/pool.js'));
    const { aplicarMigracoes } = await import('../src/db/migracoes.js');
    await aplicarMigracoes();
    servidor = app.listen(0);
    base = `http://localhost:${servidor.address().port}`;
  });

  after(async () => {
    servidor?.close();
    await pool?.end();
  });

  beforeEach(() => pool.query('TRUNCATE usuarios, documentos, analises RESTART IDENTITY CASCADE'));

  async function req(metodo, caminho, { corpo, token } = {}) {
    const headers = {};
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    });
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
  }

  async function criarUsuario(nome = 'Ana Souza', email = 'ana@exemplo.com') {
    await req('POST', '/auth/cadastro', { corpo: { nome, email, senha: 'senha1234' } });
    return (await req('POST', '/auth/login', { corpo: { email, senha: 'senha1234' } })).corpo;
  }

  const criarDocumento = (token, titulo = 'Contrato', conteudo = 'Texto do documento.') =>
    req('POST', '/documentos', { token, corpo: { titulo, conteudo } });

  describe('erros gerais', () => {
    test('rota inexistente responde 404 no formato padrão', async () => {
      const r = await req('GET', '/nao-existe');
      assert.equal(r.status, 404);
      assert.deepStrictEqual(r.corpo, { erro: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' });
    });

    test('JSON malformado responde 400', async () => {
      const r = await req('POST', '/auth/login', { corpo: '{ invalido' });
      assert.equal(r.status, 400);
      assert.equal(r.corpo.erro, 'VALIDACAO');
    });
  });

  describe('usuários', () => {
    test('cadastro responde 201 sem a senha e guarda o e-mail em minúsculas', async () => {
      const r = await req('POST', '/auth/cadastro', {
        corpo: { nome: 'Ana Souza', email: 'Ana@Exemplo.com', senha: 'senha1234' },
      });
      assert.equal(r.status, 201);
      assert.deepStrictEqual(r.corpo, { id: 1, nome: 'Ana Souza', email: 'ana@exemplo.com' });
      const { rows } = await pool.query('SELECT senha_hash FROM usuarios');
      assert.notEqual(rows[0].senha_hash, 'senha1234');
    });

    test('e-mail já cadastrado responde 409, sem diferenciar maiúsculas', async () => {
      await criarUsuario();
      const r = await req('POST', '/auth/cadastro', {
        corpo: { nome: 'Outra', email: 'ANA@exemplo.com', senha: 'senha1234' },
      });
      assert.equal(r.status, 409);
      assert.equal(r.corpo.erro, 'CONFLITO');
    });

    test('cadastro valida nome, e-mail e senha', async () => {
      const casos = [
        { email: 'a@b.com', senha: 'senha1234' },
        { nome: 'x'.repeat(101), email: 'a@b.com', senha: 'senha1234' },
        { nome: 'Ana', email: 'invalido', senha: 'senha1234' },
        { nome: 'Ana', email: 'a@b.com', senha: '1234567' },
        { nome: 'Ana', email: 'ana@exemplo', senha: 'senha1234' },
        { nome: 'Ana', email: 'ana@exemplo..com', senha: 'senha1234' },
        { nome: 'Ana', email: 'ana@-exemplo.com', senha: 'senha1234' },
        { nome: 'Ana', email: 'ana@exemplo.c', senha: 'senha1234' },
        { nome: 'Ana', email: `${'a'.repeat(250)}@b.com`, senha: 'senha1234' },
        // Mais de 72 bytes: o bcrypt descartaria o final da senha.
        { nome: 'Ana', email: 'a@b.com', senha: 'x'.repeat(73) },
        { nome: 'Ana', email: 'a@b.com', senha: 'ç'.repeat(37) },
      ];
      for (const corpo of casos) {
        const r = await req('POST', '/auth/cadastro', { corpo });
        assert.equal(r.status, 400, JSON.stringify(corpo));
        assert.equal(r.corpo.erro, 'VALIDACAO');
      }
    });

    test('login responde token e usuário, aceitando e-mail em maiúsculas', async () => {
      await criarUsuario();
      const r = await req('POST', '/auth/login', { corpo: { email: 'ANA@EXEMPLO.COM', senha: 'senha1234' } });
      assert.equal(r.status, 200);
      assert.ok(r.corpo.token);
      assert.deepStrictEqual(r.corpo.usuario, { id: 1, nome: 'Ana Souza', email: 'ana@exemplo.com' });
    });

    test('login com e-mail inexistente ou senha errada responde 401 com a mesma mensagem', async () => {
      await criarUsuario();
      const semUsuario = await req('POST', '/auth/login', { corpo: { email: 'x@exemplo.com', senha: 'senha1234' } });
      const senhaErrada = await req('POST', '/auth/login', { corpo: { email: 'ana@exemplo.com', senha: 'errada123' } });
      assert.equal(semUsuario.status, 401);
      assert.equal(senhaErrada.status, 401);
      assert.deepStrictEqual(semUsuario.corpo, senhaErrada.corpo);
    });

    test('senha com exatamente 72 bytes é aceita no cadastro e no login', async () => {
      const senha = 'ç'.repeat(36); // 36 caracteres de 2 bytes
      const cadastro = await req('POST', '/auth/cadastro', { corpo: { nome: 'Ana', email: 'longa@exemplo.com', senha } });
      assert.equal(cadastro.status, 201);
      const login = await req('POST', '/auth/login', { corpo: { email: 'longa@exemplo.com', senha } });
      assert.equal(login.status, 200);
    });

    test('após 5 senhas erradas o login responde 429, sem afetar outro e-mail', async () => {
      await criarUsuario('Carla', 'limite@exemplo.com');
      await criarUsuario('Davi', 'livre@exemplo.com');
      for (let i = 0; i < 5; i++) {
        const r = await req('POST', '/auth/login', { corpo: { email: 'limite@exemplo.com', senha: 'errada123' } });
        assert.equal(r.status, 401);
      }
      // Mesmo com a senha certa, o e-mail fica bloqueado até a janela expirar.
      const bloqueado = await req('POST', '/auth/login', { corpo: { email: 'limite@exemplo.com', senha: 'senha1234' } });
      assert.equal(bloqueado.status, 429);
      assert.equal(bloqueado.corpo.erro, 'MUITAS_TENTATIVAS');
      const outro = await req('POST', '/auth/login', { corpo: { email: 'livre@exemplo.com', senha: 'senha1234' } });
      assert.equal(outro.status, 200);
    });
  });

  describe('documentos', () => {
    test('sem token ou com token inválido responde 401', async () => {
      assert.equal((await req('GET', '/documentos')).status, 401);
      const r = await req('GET', '/documentos', { token: 'invalido' });
      assert.equal(r.status, 401);
      assert.equal(r.corpo.erro, 'NAO_AUTENTICADO');
    });

    test('cria e detalha documento preservando o conteúdo exatamente', async () => {
      const { token } = await criarUsuario();
      const conteudo = '  Linha 1\r\n\tLinha 2 📄  \n\n';
      const criado = await criarDocumento(token, 'Título', conteudo);
      assert.equal(criado.status, 201);
      assert.equal(criado.corpo.conteudo, conteudo);
      assert.deepStrictEqual(criado.corpo.autor, { id: 1, nome: 'Ana Souza' });
      assert.equal(criado.corpo.analise, null);
      assert.match(criado.corpo.criado_em, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const detalhe = await req('GET', `/documentos/${criado.corpo.id}`, { token });
      assert.equal(detalhe.status, 200);
      assert.deepStrictEqual(detalhe.corpo, criado.corpo);
    });

    test('valida título e conteúdo', async () => {
      const { token } = await criarUsuario();
      const casos = [
        { titulo: '   ', conteudo: 'ok' },
        { titulo: 'ok', conteudo: '\n \t\n' },
        { titulo: 'ok' },
        { titulo: 'x'.repeat(201), conteudo: 'ok' },
        { titulo: 'ok', conteudo: 'x'.repeat(50001) },
        { titulo: 1, conteudo: 'ok' },
      ];
      for (const corpo of casos) {
        const r = await req('POST', '/documentos', { token, corpo });
        assert.equal(r.status, 400, JSON.stringify(corpo).slice(0, 80));
      }
      // 50.000 emojis: cada um é 1 caractere, mesmo ocupando 2 unidades em .length.
      const r = await criarDocumento(token, 'ok', '📄'.repeat(50000));
      assert.equal(r.status, 201);
    });

    test('documento inexistente responde 404', async () => {
      const { token } = await criarUsuario();
      for (const id of ['999', 'abc']) {
        const r = await req('GET', `/documentos/${id}`, { token });
        assert.equal(r.status, 404);
        assert.equal(r.corpo.erro, 'NAO_ENCONTRADO');
      }
      const escritas = [
        await req('PUT', '/documentos/999', { token, corpo: { titulo: 'a', conteudo: 'b' } }),
        await req('DELETE', '/documentos/999', { token }),
        await req('POST', '/documentos/999/analise', { token }),
      ];
      for (const r of escritas) assert.equal(r.status, 404);
    });

    test('listagem ordena por data e filtra os documentos do usuário', async () => {
      const ana = await criarUsuario();
      const bruno = await criarUsuario('Bruno Lima', 'bruno@exemplo.com');
      await criarDocumento(ana.token, 'Primeiro');
      await criarDocumento(bruno.token, 'Segundo');
      await criarDocumento(ana.token, 'Terceiro');
      await pool.query("UPDATE documentos SET criado_em = now() - (4 - id) * interval '1 minute'");

      const titulos = (r) => r.corpo.map((d) => d.titulo);
      const padrao = await req('GET', '/documentos', { token: ana.token });
      assert.equal(padrao.status, 200);
      assert.deepStrictEqual(titulos(padrao), ['Terceiro', 'Segundo', 'Primeiro']);
      assert.deepStrictEqual(Object.keys(padrao.corpo[0]).sort(), ['autor', 'criado_em', 'id', 'tipo', 'titulo']);
      assert.equal(padrao.corpo[0].tipo, null);

      const asc = await req('GET', '/documentos?ordem=asc', { token: ana.token });
      assert.deepStrictEqual(titulos(asc), ['Primeiro', 'Segundo', 'Terceiro']);

      const meus = await req('GET', '/documentos?meus=true', { token: ana.token });
      assert.deepStrictEqual(titulos(meus), ['Terceiro', 'Primeiro']);

      const todos = await req('GET', '/documentos?meus=false&ordem=desc', { token: ana.token });
      assert.equal(todos.corpo.length, 3);
    });

    test('busca por título e paginação são opcionais', async () => {
      const { token } = await criarUsuario();
      for (const titulo of ['Contrato A', 'Petição', 'CONTRATO B', 'Multa 100%', 'Multa 1000']) await criarDocumento(token, titulo);
      await pool.query("UPDATE documentos SET criado_em = now() - (10 - id) * interval '1 minute'");
      const titulos = async (qs) => (await req('GET', `/documentos?${qs}`, { token })).corpo.map((d) => d.titulo);

      assert.deepStrictEqual(await titulos('busca=contrato&ordem=asc'), ['Contrato A', 'CONTRATO B']);
      // % e _ são procurados como texto, não como curinga.
      assert.deepStrictEqual(await titulos('busca=100%25'), ['Multa 100%']);
      assert.deepStrictEqual(await titulos('busca=%20%20'), await titulos(''));
      assert.deepStrictEqual(await titulos('por_pagina=2'), ['Multa 1000', 'Multa 100%']);
      assert.deepStrictEqual(await titulos('pagina=2&por_pagina=2'), ['CONTRATO B', 'Petição']);
      assert.deepStrictEqual(await titulos('pagina=3&por_pagina=2&ordem=asc'), ['Multa 1000']);
      assert.deepStrictEqual(await titulos('pagina=9&por_pagina=2'), []);
      assert.equal((await titulos('pagina=1')).length, 5); // por_pagina padrão: 10
    });

    test('parâmetros inválidos na listagem respondem 400', async () => {
      const { token } = await criarUsuario();
      for (const qs of ['ordem=cima', 'meus=sim', 'ordem=ASC', 'ordem=asc&ordem=desc', 'pagina=0', 'pagina=abc', 'por_pagina=101', 'pagina=1.5', 'busca=a&busca=b']) {
        const r = await req('GET', `/documentos?${qs}`, { token });
        assert.equal(r.status, 400, qs);
        assert.equal(r.corpo.erro, 'VALIDACAO');
      }
    });

    test('outro usuário não pode editar, remover nem analisar (403)', async () => {
      const ana = await criarUsuario();
      const bruno = await criarUsuario('Bruno Lima', 'bruno@exemplo.com');
      const { corpo: doc } = await criarDocumento(ana.token);
      const corpo = { titulo: 'Novo', conteudo: 'Novo' };
      const tentativas = [
        await req('PUT', `/documentos/${doc.id}`, { token: bruno.token, corpo }),
        await req('DELETE', `/documentos/${doc.id}`, { token: bruno.token }),
        await req('POST', `/documentos/${doc.id}/analise`, { token: bruno.token }),
      ];
      for (const r of tentativas) {
        assert.equal(r.status, 403);
        assert.equal(r.corpo.erro, 'SEM_PERMISSAO');
      }
      // Outro usuário pode ver o documento.
      assert.equal((await req('GET', `/documentos/${doc.id}`, { token: bruno.token })).status, 200);
    });

    test('analisa, substitui a análise e mostra o tipo na listagem', async () => {
      const { token } = await criarUsuario();
      const { corpo: doc } = await criarDocumento(token, 'Sentença', 'SENTENÇA\nJulgo procedente. Multa de 10%.');
      const r = await req('POST', `/documentos/${doc.id}/analise`, { token });
      assert.equal(r.status, 201);
      assert.deepStrictEqual(Object.keys(r.corpo), ['tipo', 'resumo', 'pontos_de_atencao', 'analisador', 'criado_em']);
      assert.equal(r.corpo.tipo, 'decisao');
      assert.equal(r.corpo.analisador, 'regras');
      assert.deepStrictEqual(r.corpo.pontos_de_atencao, ['Multa de 10%.']);

      const novamente = await req('POST', `/documentos/${doc.id}/analise`, { token });
      assert.equal(novamente.status, 201);
      const { rows } = await pool.query('SELECT count(*)::int AS total FROM analises');
      assert.equal(rows[0].total, 1);

      const detalhe = await req('GET', `/documentos/${doc.id}`, { token });
      assert.deepStrictEqual(detalhe.corpo.analise, novamente.corpo);
      const lista = await req('GET', '/documentos', { token });
      assert.equal(lista.corpo[0].tipo, 'decisao');
    });

    test('PUT mantém a análise se o conteúdo não mudar e apaga se mudar', async () => {
      const { token } = await criarUsuario();
      const { corpo: doc } = await criarDocumento(token, 'Título', 'Conteúdo original.');
      await req('POST', `/documentos/${doc.id}/analise`, { token });

      const soTitulo = await req('PUT', `/documentos/${doc.id}`, {
        token,
        corpo: { titulo: 'Título novo', conteudo: 'Conteúdo original.' },
      });
      assert.equal(soTitulo.status, 200);
      assert.equal(soTitulo.corpo.titulo, 'Título novo');
      assert.notEqual(soTitulo.corpo.analise, null);

      const novoConteudo = await req('PUT', `/documentos/${doc.id}`, {
        token,
        corpo: { titulo: 'Título novo', conteudo: 'Conteúdo original. ' },
      });
      assert.equal(novoConteudo.status, 200);
      assert.equal(novoConteudo.corpo.analise, null);
    });

    test('análise espera alteração em andamento e usa o conteúdo já atualizado', async () => {
      const { token } = await criarUsuario();
      const { corpo: doc } = await criarDocumento(token, 'Título', 'Conteúdo antigo.');
      const outra = await pool.connect();
      try {
        await outra.query('BEGIN');
        await outra.query('SELECT 1 FROM documentos WHERE id = $1 FOR UPDATE', [doc.id]);
        const analise = req('POST', `/documentos/${doc.id}/analise`, { token });
        await new Promise((resolver) => setTimeout(resolver, 200));
        await outra.query("UPDATE documentos SET conteudo = 'Conteúdo novo.' WHERE id = $1", [doc.id]);
        await outra.query('COMMIT');
        assert.equal((await analise).corpo.resumo, 'Conteúdo novo.');
      } finally {
        outra.release();
      }
    });

    test('PUT exige os dois campos', async () => {
      const { token } = await criarUsuario();
      const { corpo: doc } = await criarDocumento(token);
      const r = await req('PUT', `/documentos/${doc.id}`, { token, corpo: { titulo: 'Só título' } });
      assert.equal(r.status, 400);
    });

    test('DELETE responde 204 e remove a análise junto', async () => {
      const { token } = await criarUsuario();
      const { corpo: doc } = await criarDocumento(token);
      await req('POST', `/documentos/${doc.id}/analise`, { token });
      const r = await req('DELETE', `/documentos/${doc.id}`, { token });
      assert.equal(r.status, 204);
      assert.equal((await req('GET', `/documentos/${doc.id}`, { token })).status, 404);
      const { rows } = await pool.query('SELECT count(*)::int AS total FROM analises');
      assert.equal(rows[0].total, 0);
    });
  });
});
