import { pool } from '../db/pool.js';

// Cada documento tem no máximo uma análise: uma nova substitui a anterior.
export async function salvar(documentoId, { tipo, resumo, pontos_de_atencao }, analisador, cliente = pool) {
  const { rows } = await cliente.query(
    `INSERT INTO analises (documento_id, tipo, resumo, pontos_de_atencao, analisador)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (documento_id) DO UPDATE
       SET tipo = EXCLUDED.tipo, resumo = EXCLUDED.resumo, pontos_de_atencao = EXCLUDED.pontos_de_atencao,
           analisador = EXCLUDED.analisador, criado_em = now()
     RETURNING tipo, resumo, pontos_de_atencao, analisador, criado_em`,
    // jsonb precisa receber o texto JSON; um array JS seria enviado como array do Postgres.
    [documentoId, tipo, resumo, JSON.stringify(pontos_de_atencao), analisador],
  );
  return rows[0];
}

export async function removerDoDocumento(documentoId, cliente = pool) {
  await cliente.query('DELETE FROM analises WHERE documento_id = $1', [documentoId]);
}
