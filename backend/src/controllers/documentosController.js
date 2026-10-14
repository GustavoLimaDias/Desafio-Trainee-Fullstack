import * as documentosService from '../services/documentosService.js';
import { idDocumento, inteiroOpcional, opcao, textoObrigatorio, textoOpcional } from '../validacao.js';

function lerCampos(corpo = {}) {
  return {
    titulo: textoObrigatorio(corpo.titulo, 'titulo', 200),
    conteudo: textoObrigatorio(corpo.conteudo, 'conteudo', 50000),
  };
}

export async function listar(req, res) {
  const ordem = opcao(req.query.ordem, 'ordem', ['desc', 'asc'], 'desc');
  const meus = opcao(req.query.meus, 'meus', ['false', 'true'], 'false') === 'true';
  // Opcionais: sem eles a listagem responde exatamente como o enunciado define (todos os documentos).
  const busca = textoOpcional(req.query.busca, 'busca');
  const pagina = inteiroOpcional(req.query.pagina, 'pagina', 1, 1000000);
  const porPagina = inteiroOpcional(req.query.por_pagina, 'por_pagina', 1, 100);
  const paginacao = pagina || porPagina ? { pagina: pagina ?? 1, porPagina: porPagina ?? 10 } : null;
  res.json(await documentosService.listar({ ordem, meus, busca, paginacao, usuarioId: req.usuario.id }));
}

export async function obter(req, res) {
  res.json(await documentosService.obter(idDocumento(req.params.id)));
}

export async function criar(req, res) {
  const campos = lerCampos(req.body);
  res.status(201).json(await documentosService.criar({ ...campos, usuarioId: req.usuario.id }));
}

export async function atualizar(req, res) {
  const id = idDocumento(req.params.id);
  const campos = lerCampos(req.body);
  res.json(await documentosService.atualizar(id, { ...campos, usuarioId: req.usuario.id }));
}

export async function remover(req, res) {
  await documentosService.remover(idDocumento(req.params.id), req.usuario.id);
  res.status(204).end();
}

export async function analisar(req, res) {
  res.status(201).json(await documentosService.analisar(idDocumento(req.params.id), req.usuario.id));
}
