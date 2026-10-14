import * as authService from '../services/authService.js';
import { emailValido, senhaValida, textoObrigatorio } from '../validacao.js';

export async function cadastro(req, res) {
  const corpo = req.body ?? {};
  const nome = textoObrigatorio(corpo.nome, 'nome', 100);
  const email = emailValido(corpo.email);
  const senha = senhaValida(corpo.senha);
  res.status(201).json(await authService.cadastrar({ nome, email, senha }));
}

export async function login(req, res) {
  const corpo = req.body ?? {};
  const email = textoObrigatorio(corpo.email, 'email').toLowerCase();
  const senha = textoObrigatorio(corpo.senha, 'senha');
  res.json(await authService.login({ email, senha, ip: req.ip }));
}
