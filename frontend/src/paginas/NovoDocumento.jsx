import { Link, useNavigate } from 'react-router-dom';
import { requisitar } from '../api.js';
import DocumentoForm from '../componentes/DocumentoForm.jsx';

export default function NovoDocumento() {
  const navegar = useNavigate();

  async function criar(valores) {
    const documento = await requisitar('/documentos', { metodo: 'POST', corpo: valores });
    navegar(`/documentos/${documento.id}`);
  }

  return (
    <>
      <Link to="/documentos" className="voltar">← Voltar para documentos</Link>
      <h1>Novo documento</h1>
      <DocumentoForm textoBotao="Criar documento" aoEnviar={criar} />
    </>
  );
}
