import { pool } from './pool.js';
import { aplicarMigracoes } from './migracoes.js';

try {
  const aplicadas = await aplicarMigracoes();
  if (aplicadas.length === 0) console.log('Nenhuma migration pendente.');
  for (const arquivo of aplicadas) console.log(`Aplicada: ${arquivo}`);
} catch (erro) {
  // Conexão recusada chega como AggregateError, com message vazia e o motivo em code (ex.: ECONNREFUSED).
  console.error('Falha ao migrar:', erro.message || erro.code);
  process.exitCode = 1;
} finally {
  await pool.end();
}
