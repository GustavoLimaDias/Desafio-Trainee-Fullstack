import { ErroApp } from '../erros.js';
import { verificarToken } from '../services/authService.js';

export function autenticar(req, res, next) {
  const [esquema, token] = (req.get('Authorization') ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) throw new ErroApp(401, 'Autenticação necessária.');
  req.usuario = verificarToken(token);
  next();
}
