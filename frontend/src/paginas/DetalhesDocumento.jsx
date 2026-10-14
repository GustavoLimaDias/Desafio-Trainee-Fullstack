import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { requisitar } from '../api.js';
import { useRequisicao } from '../useRequisicao.js';
import { Carregando, MensagemErro } from '../componentes/Estado.jsx';
import EtiquetaTipo from '../componentes/EtiquetaTipo.jsx';
import { formatarData } from '../formatar.js';

export default function DetalhesDocumento() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const { dados: documento, carregando, erro, definirDados } = useRequisicao(`/documentos/${id}`);
  const [acao, setAcao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);

  if (carregando) return <Carregando />;
  if (erro) return <MensagemErro mensagem={erro} />;

  const ehAutor = documento.autor.id === usuario.id;
  const { analise } = documento;

  async function executar(nome, funcao) {
    setAcao(nome);
    setErroAcao(null);
    try {
      await funcao();
    } catch (e) {
      setErroAcao(e.message);
    } finally {
      setAcao(null);
    }
  }

  const analisar = () =>
    executar('analisar', async () => {
      const novaAnalise = await requisitar(`/documentos/${id}/analise`, { metodo: 'POST' });
      definirDados({ ...documento, analise: novaAnalise });
    });

  const remover = () => {
    const mensagem = `Remover o documento "${documento.titulo}"?\n\nA análise dele também será apagada. Esta ação não pode ser desfeita.`;
    if (!window.confirm(mensagem)) return;
    executar('remover', async () => {
      await requisitar(`/documentos/${id}`, { metodo: 'DELETE' });
      navegar('/documentos');
    });
  };

  return (
    <article>
      <Link to="/documentos" className="voltar">← Voltar para documentos</Link>
      <h1>{documento.titulo}</h1>
      <p className="item-info">
        Por {documento.autor.nome} · Criado em {formatarData(documento.criado_em)} · Atualizado em{' '}
        {formatarData(documento.atualizado_em)}
      </p>

      {ehAutor && (
        <div className="acoes">
          <button type="button" onClick={analisar} disabled={acao !== null}>
            {acao === 'analisar' ? 'Analisando...' : 'Analisar documento'}
          </button>
          <Link to={`/documentos/${id}/editar`} className="botao secundario">Editar</Link>
          <button type="button" className="perigo" onClick={remover} disabled={acao !== null}>
            {acao === 'remover' ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      )}
      <MensagemErro mensagem={erroAcao} />

      <section className="painel">
        <div className="painel-cabecalho">
          <h2>Análise</h2>
          {analise && <EtiquetaTipo tipo={analise.tipo} />}
        </div>
        {analise ? (
          <>
            <h3>Resumo</h3>
            <p>{analise.resumo || '(vazio)'}</p>
            <h3>Pontos de atenção ({analise.pontos_de_atencao.length})</h3>
            {analise.pontos_de_atencao.length > 0 ? (
              <ul className="pontos">
                {analise.pontos_de_atencao.map((ponto, i) => <li key={i}>{ponto}</li>)}
              </ul>
            ) : (
              <p className="dica">Nenhum ponto de atenção encontrado.</p>
            )}
            <p className="dica">Gerada pelo analisador "{analise.analisador}" em {formatarData(analise.criado_em)}</p>
          </>
        ) : (
          <p className="dica">
            Este documento ainda não foi analisado.{ehAutor && ' Use o botão "Analisar documento" para gerar a análise.'}
          </p>
        )}
      </section>

      <section className="painel">
        <h2>Conteúdo</h2>
        <pre className="texto-documento">{documento.conteudo}</pre>
      </section>
    </article>
  );
}
