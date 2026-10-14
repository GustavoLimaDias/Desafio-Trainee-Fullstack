import { Navigate, Route, Routes } from 'react-router-dom';
import RotaProtegida from './componentes/RotaProtegida.jsx';
import Login from './paginas/Login.jsx';
import Cadastro from './paginas/Cadastro.jsx';
import ListaDocumentos from './paginas/ListaDocumentos.jsx';
import DetalhesDocumento from './paginas/DetalhesDocumento.jsx';
import NovoDocumento from './paginas/NovoDocumento.jsx';
import EditarDocumento from './paginas/EditarDocumento.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route element={<RotaProtegida />}>
        <Route path="/documentos" element={<ListaDocumentos />} />
        <Route path="/documentos/novo" element={<NovoDocumento />} />
        <Route path="/documentos/:id" element={<DetalhesDocumento />} />
        <Route path="/documentos/:id/editar" element={<EditarDocumento />} />
      </Route>
      <Route path="*" element={<Navigate to="/documentos" replace />} />
    </Routes>
  );
}
