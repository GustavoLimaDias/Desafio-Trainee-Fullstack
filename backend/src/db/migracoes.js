import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool, transacao } from './pool.js';

const pasta = fileURLToPath(new URL('./migrations/', import.meta.url));

// Aplica, em ordem, as migrations ainda não registradas na tabela migracoes.
export async function aplicarMigracoes() {
  await pool.query(`CREATE TABLE IF NOT EXISTS migracoes (
    nome TEXT PRIMARY KEY,
    aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await pool.query('SELECT nome FROM migracoes');
  const aplicadas = new Set(rows.map((r) => r.nome));
  const pendentes = readdirSync(pasta).filter((f) => f.endsWith('.sql') && !aplicadas.has(f)).sort();

  for (const arquivo of pendentes) {
    await transacao(async (cliente) => {
      await cliente.query(readFileSync(pasta + arquivo, 'utf8'));
      await cliente.query('INSERT INTO migracoes (nome) VALUES ($1)', [arquivo]);
    });
  }
  return pendentes;
}
