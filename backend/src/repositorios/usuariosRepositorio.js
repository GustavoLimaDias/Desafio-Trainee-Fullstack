import { pool } from '../db/pool.js';

export async function criar({ nome, email, senhaHash }) {
  const { rows } = await pool.query(
    'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
    [nome, email, senhaHash],
  );
  return rows[0];
}

export async function buscarPorEmail(email) {
  const { rows } = await pool.query('SELECT id, nome, email, senha_hash FROM usuarios WHERE email = $1', [email]);
  return rows[0] ?? null;
}
