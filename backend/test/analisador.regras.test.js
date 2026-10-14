import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import regras from '../src/analisadores/regras.js';
import { obterAnalisador } from '../src/analisadores/index.js';

const dir = fileURLToPath(new URL('../../exemplos/', import.meta.url));
const exemplos = readdirSync(dir)
  .filter((f) => f.endsWith('.txt') && existsSync(dir + f.replace(/\.txt$/, '.esperado.json')))
  .map((f) => f.replace(/\.txt$/, ''));

test('encontra os 6 exemplos', () => {
  assert.equal(exemplos.length, 6);
});

for (const nome of exemplos) {
  test(`exemplo ${nome}`, () => {
    const txt = readFileSync(dir + nome + '.txt', 'utf8');
    const json = readFileSync(dir + nome + '.esperado.json', 'utf8');
    assert.deepStrictEqual(regras.analisar(txt), JSON.parse(json));
  });
}

test('obterAnalisador desconhecido lança erro', () => {
  assert.throws(() => obterAnalisador('x'), /Analisador desconhecido: x/);
});

test('obterAnalisador padrão é regras', () => {
  assert.equal(obterAnalisador().nome, 'regras');
});

test('texto vazio', () => {
  assert.deepStrictEqual(regras.analisar(''), { tipo: 'outro', resumo: '', pontos_de_atencao: [] });
});
