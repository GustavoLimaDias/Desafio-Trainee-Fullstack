import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function RotaProtegida() {
  const { usuario, sair } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <>
      <header className="topo">
        <Link to="/documentos" className="marca">Analisador de Documentos</Link>
        <div className="topo-usuario">
          <span>{usuario.nome}</span>
          <button type="button" className="secundario" onClick={sair}>Sair</button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </>
  );
}
