import { pool } from '../db/pool.js';

// Escapa % e _ para a busca ser por texto literal no ILIKE.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

export async function listar({ ordem, autorId, busca, limite, deslocamento = 0 }) {
  // ordem já foi validada como 'asc' ou 'desc' antes de chegar aqui.
  const direcao = ordem === 'asc' ? 'ASC' : 'DESC';
  // LIMIT NULL no PostgreSQL significa sem limite.
  const { rows } = await pool.query(
    `SELECT d.id, d.titulo, d.criado_em, u.id AS autor_id, u.nome AS autor_nome, a.tipo
       FROM documentos d
       JOIN usuarios u ON u.id = d.autor_id
       LEFT JOIN analises a ON a.documento_id = d.id
      WHERE ($1::int IS NULL OR d.autor_id = $1)
        AND ($2::text IS NULL OR d.titulo ILIKE '%' || $2 || '%')
      ORDER BY d.criado_em ${direcao}, d.id ${direcao}
      LIMIT $3 OFFSET $4`,
    [autorId ?? null, busca ? escaparLike(busca) : null, limite ?? null, deslocamento],
  );
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT d.id, d.titulo, d.conteudo, d.criado_em, d.atualizado_em,
            u.id AS autor_id, u.nome AS autor_nome,
            a.tipo, a.resumo, a.pontos_de_atencao, a.analisador, a.criado_em AS analise_criada_em
       FROM documentos d
       JOIN usuarios u ON u.id = d.autor_id
       LEFT JOIN analises a ON a.documento_id = d.id
      WHERE d.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// Trava a linha até o fim da transação, para PUT e análise do mesmo documento não se cruzarem.
export async function buscarParaAlterar(id, cliente) {
  const { rows } = await cliente.query(
    'SELECT id, conteudo, autor_id FROM documentos WHERE id = $1 FOR UPDATE',
    [id],
  );
  return rows[0] ?? null;
}

export async function criar({ titulo, conteudo, autorId }) {
  const { rows } = await pool.query(
    'INSERT INTO documentos (titulo, conteudo, autor_id) VALUES ($1, $2, $3) RETURNING id',
    [titulo, conteudo, autorId],
  );
  return rows[0].id;
}

export async function atualizar(id, { titulo, conteudo }, cliente = pool) {
  await cliente.query(
    'UPDATE documentos SET titulo = $2, conteudo = $3, atualizado_em = now() WHERE id = $1',
    [id, titulo, conteudo],
  );
}

export async function remover(id) {
  await pool.query('DELETE FROM documentos WHERE id = $1', [id]);
}
