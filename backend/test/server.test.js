import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const servidor = fileURLToPath(new URL('../src/server.js', import.meta.url));

// Inicia a API num processo separado e devolve o código de saída e o que ela escreveu no stderr.
// A conexão com o banco é preguiçosa, então um DATABASE_URL fictício basta para esses casos.
function iniciarApi(env) {
  return new Promise((resolve) => {
    const processo = spawn(process.execPath, [servidor], {
      env: { ...process.env, DATABASE_URL: 'postgres://teste@localhost:1/nao_usado', JWT_SECRET: 'teste', ...env },
    });
    let stderr = '';
    processo.stderr.on('data', (parte) => (stderr += parte));
    const limite = setTimeout(() => processo.kill(), 10000);
    processo.on('exit', (codigo) => {
      clearTimeout(limite);
      resolve({ codigo, stderr });
    });
  });
}

test('API não sobe e sai com código 1 quando a porta está ocupada', async () => {
  const ocupante = createServer().listen(0);
  await new Promise((resolve) => ocupante.once('listening', resolve));
  try {
    const { codigo, stderr } = await iniciarApi({ PORT: String(ocupante.address().port) });
    assert.equal(codigo, 1);
    assert.match(stderr, /Não foi possível iniciar a API na porta \d+: .*EADDRINUSE/);
  } finally {
    ocupante.close();
  }
});

test('API não sobe sem JWT_SECRET', async () => {
  const { codigo, stderr } = await iniciarApi({ PORT: '0', JWT_SECRET: undefined });
  assert.equal(codigo, 1);
  assert.match(stderr, /JWT_SECRET não definida/);
});
