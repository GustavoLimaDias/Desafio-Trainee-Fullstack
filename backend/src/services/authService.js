import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { ErroApp } from '../erros.js';
import * as usuarios from '../repositorios/usuariosRepositorio.js';
import * as limiteLogin from './limiteLogin.js';

const VIOLACAO_UNIQUE = '23505';

export async function cadastrar({ nome, email, senha }) {
  if (await usuarios.buscarPorEmail(email)) throw new ErroApp(409, 'E-mail já cadastrado.');
  const senhaHash = await bcrypt.hash(senha, 10);
  try {
    return await usuarios.criar({ nome, email, senhaHash });
  } catch (erro) {
    // Dois cadastros simultâneos com o mesmo e-mail: o UNIQUE do banco barra o segundo.
    if (erro.code === VIOLACAO_UNIQUE) throw new ErroApp(409, 'E-mail já cadastrado.');
    throw erro;
  }
}

export async function login({ email, senha, ip }) {
  const chave = `${ip}|${email}`;
  limiteLogin.verificar(chave);
  const usuario = await usuarios.buscarPorEmail(email);
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    limiteLogin.registrarFalha(chave);
    throw new ErroApp(401, 'E-mail ou senha inválidos.');
  }
  limiteLogin.limpar(chave);
  const dados = { id: usuario.id, nome: usuario.nome, email: usuario.email };
  const token = jwt.sign({ nome: usuario.nome }, config.jwtSegredo, { subject: String(usuario.id), expiresIn: '8h' });
  return { token, usuario: dados };
}

export function verificarToken(token) {
  try {
    const { sub, nome } = jwt.verify(token, config.jwtSegredo, { algorithms: ['HS256'] });
    return { id: Number(sub), nome };
  } catch {
    throw new ErroApp(401, 'Token inválido ou expirado.');
  }
}
