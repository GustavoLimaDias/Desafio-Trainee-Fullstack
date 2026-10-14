import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { requisitar } from '../api.js';
import { useRequisicao } from '../useRequisicao.js';
import DocumentoForm from '../componentes/DocumentoForm.jsx';
import { Carregando, MensagemErro } from '../componentes/Estado.jsx';

export default function EditarDocumento() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const { dados: documento, carregando, erro } = useRequisicao(`/documentos/${id}`);

  if (carregando) return <Carregando />;
  if (erro) return <MensagemErro mensagem={erro} />;
  if (documento.autor.id !== usuario.id) {
    return <MensagemErro mensagem="Apenas o autor pode editar este documento." />;
  }

  async function salvar(valores) {
    await requisitar(`/documentos/${id}`, { metodo: 'PUT', corpo: valores });
    navegar(`/documentos/${id}`);
  }

  return (
    <>
      <Link to={`/documentos/${id}`} className="voltar">← Voltar para o documento</Link>
      <h1>Editar documento</h1>
      <DocumentoForm
        inicial={{ titulo: documento.titulo, conteudo: documento.conteudo }}
        textoBotao="Salvar alterações"
        aoEnviar={salvar}
      />
    </>
  );
}
