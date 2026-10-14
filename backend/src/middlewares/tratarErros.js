import { ErroApp } from '../erros.js';

export function rotaNaoEncontrada(req, res, next) {
  next(new ErroApp(404, 'Rota não encontrada.'));
}

// Express identifica o middleware de erro pelos 4 parâmetros.
export function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroApp) {
    return res.status(erro.status).json({ erro: erro.codigo, mensagem: erro.message });
  }
  // Erros do express.json: corpo malformado ou acima do limite.
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'VALIDACAO', mensagem: 'JSON inválido no corpo da requisição.' });
  }
  if (erro.type === 'entity.too.large') {
    return res.status(400).json({ erro: 'VALIDACAO', mensagem: 'Corpo da requisição muito grande.' });
  }
  console.error(erro);
  res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno no servidor.' });
}
