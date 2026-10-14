import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequisicao } from '../useRequisicao.js';
import { Carregando, MensagemErro } from '../componentes/Estado.jsx';
import EtiquetaTipo from '../componentes/EtiquetaTipo.jsx';
import { formatarData } from '../formatar.js';

const POR_PAGINA = 10;

export default function ListaDocumentos() {
  const [ordem, setOrdem] = useState('desc');
  const [meus, setMeus] = useState(false);
  const [textoBusca, setTextoBusca] = useState('');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  // Pede um item a mais só para saber se existe próxima página.
  const { dados, carregando, erro } = useRequisicao(
    `/documentos?ordem=${ordem}&meus=${meus}&busca=${encodeURIComponent(busca)}&pagina=${pagina}&por_pagina=${POR_PAGINA + 1}`,
  );
  const documentos = dados?.slice(0, POR_PAGINA);
  const temProxima = dados?.length > POR_PAGINA;

  // Mudar um filtro volta para a primeira página.
  function filtrar(alteracao) {
    alteracao();
    setPagina(1);
  }

  function buscar(evento) {
    evento.preventDefault();
    filtrar(() => setBusca(textoBusca.trim()));
  }

  function mensagemVazia() {
    if (pagina > 1) return 'Não há mais documentos.';
    if (busca) return `Nenhum documento com "${busca}" no título.`;
    return meus ? 'Você ainda não cadastrou documentos.' : 'Nenhum documento cadastrado.';
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <h1>Documentos</h1>
        <Link to="/documentos/novo" className="botao">Novo documento</Link>
      </div>

      <form className="busca" role="search" onSubmit={buscar}>
        <label htmlFor="busca" className="visualmente-oculto">Buscar por título</label>
        <input
          id="busca"
          type="search"
          placeholder="Buscar por título"
          value={textoBusca}
          onChange={(e) => setTextoBusca(e.target.value)}
        />
        <button type="submit" className="secundario">Buscar</button>
      </form>

      <div className="filtros">
        <button type="button" className="secundario" onClick={() => filtrar(() => setOrdem(ordem === 'desc' ? 'asc' : 'desc'))}>
          {ordem === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'} ⇅
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={meus} onChange={(e) => filtrar(() => setMeus(e.target.checked))} />
          Apenas meus documentos
        </label>
      </div>

      {carregando && <Carregando />}
      <MensagemErro mensagem={erro} />
      {!carregando && !erro && documentos.length === 0 && (
        <div className="vazio">
          <p>{mensagemVazia()}</p>
          {pagina === 1 && !busca && <Link to="/documentos/novo">Cadastrar o primeiro documento</Link>}
        </div>
      )}
      {!carregando && !erro && documentos.length > 0 && (
        <ul className="lista">
          {documentos.map((doc) => (
            <li key={doc.id} className="item">
              <Link to={`/documentos/${doc.id}`} className="item-titulo">{doc.titulo}</Link>
              <span className="item-info">
                {doc.autor.nome} · {formatarData(doc.criado_em)}
              </span>
              <EtiquetaTipo tipo={doc.tipo} />
            </li>
          ))}
        </ul>
      )}

      {!erro && (pagina > 1 || temProxima) && (
        <nav className="paginacao" aria-label="Paginação">
          <button type="button" className="secundario" onClick={() => setPagina(pagina - 1)} disabled={carregando || pagina === 1}>
            ← Anterior
          </button>
          <span>Página {pagina}</span>
          <button type="button" className="secundario" onClick={() => setPagina(pagina + 1)} disabled={carregando || !temProxima}>
            Próxima →
          </button>
        </nav>
      )}
    </>
  );
}
