import { ErroApp } from '../erros.js';
import { transacao } from '../db/pool.js';
import { obterAnalisador } from '../analisadores/index.js';
import * as documentos from '../repositorios/documentosRepositorio.js';
import * as analises from '../repositorios/analisesRepositorio.js';

function formatarAnalise(linha) {
  return {
    tipo: linha.tipo,
    resumo: linha.resumo,
    pontos_de_atencao: linha.pontos_de_atencao,
    analisador: linha.analisador,
    criado_em: linha.criado_em,
  };
}

function formatarDocumento(linha) {
  return {
    id: linha.id,
    titulo: linha.titulo,
    conteudo: linha.conteudo,
    autor: { id: linha.autor_id, nome: linha.autor_nome },
    criado_em: linha.criado_em,
    atualizado_em: linha.atualizado_em,
    analise: linha.tipo === null ? null : formatarAnalise({ ...linha, criado_em: linha.analise_criada_em }),
  };
}

async function buscarExistente(id) {
  const linha = await documentos.buscarPorId(id);
  if (!linha) throw new ErroApp(404, 'Documento não encontrado.');
  return linha;
}

function exigirAutor(linha, usuarioId) {
  if (!linha) throw new ErroApp(404, 'Documento não encontrado.');
  if (linha.autor_id !== usuarioId) throw new ErroApp(403, 'Apenas o autor pode alterar este documento.');
  return linha;
}

export async function listar({ ordem, meus, busca, paginacao, usuarioId }) {
  const linhas = await documentos.listar({
    ordem,
    autorId: meus ? usuarioId : null,
    busca,
    limite: paginacao?.porPagina,
    deslocamento: paginacao ? (paginacao.pagina - 1) * paginacao.porPagina : 0,
  });
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    autor: { id: l.autor_id, nome: l.autor_nome },
    criado_em: l.criado_em,
    tipo: l.tipo,
  }));
}

export async function obter(id) {
  return formatarDocumento(await buscarExistente(id));
}

export async function criar({ titulo, conteudo, usuarioId }) {
  const id = await documentos.criar({ titulo, conteudo, autorId: usuarioId });
  return obter(id);
}

export async function atualizar(id, { titulo, conteudo, usuarioId }) {
  await transacao(async (cliente) => {
    const atual = exigirAutor(await documentos.buscarParaAlterar(id, cliente), usuarioId);
    // Conteúdo diferente invalida a análise; só o título mudando, ela continua válida.
    if (atual.conteudo !== conteudo) await analises.removerDoDocumento(id, cliente);
    await documentos.atualizar(id, { titulo, conteudo }, cliente);
  });
  return obter(id);
}

export async function remover(id, usuarioId) {
  exigirAutor(await documentos.buscarPorId(id), usuarioId);
  // A análise é removida pelo ON DELETE CASCADE.
  await documentos.remover(id);
}

// A análise roda com o documento travado: um PUT simultâneo não deixa salva a análise do conteúdo antigo.
export async function analisar(id, usuarioId) {
  const analisador = obterAnalisador();
  const linha = await transacao(async (cliente) => {
    const documento = exigirAutor(await documentos.buscarParaAlterar(id, cliente), usuarioId);
    const resultado = await analisador.analisar(documento.conteudo);
    return analises.salvar(id, resultado, analisador.nome, cliente);
  });
  return formatarAnalise(linha);
}
