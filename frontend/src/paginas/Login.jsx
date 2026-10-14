import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { requisitar } from '../api.js';
import Campo from '../componentes/Campo.jsx';
import { MensagemErro } from '../componentes/Estado.jsx';

export default function Login() {
  const { usuario, aviso, entrar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [valores, setValores] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/documentos" replace />;

  const alterar = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      entrar(await requisitar('/auth/login', { metodo: 'POST', corpo: valores }));
      navegar('/documentos');
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <main className="cartao-autenticacao">
      <p className="marca-autenticacao">Analisador de Documentos</p>
      <h1>Entrar</h1>
      <p className="subtitulo">Acesse para cadastrar e analisar documentos.</p>
      {state?.mensagem && <p className="sucesso">{state.mensagem}</p>}
      {aviso && <p className="erro aviso" role="alert">{aviso}</p>}
      <form onSubmit={enviar} className="formulario">
        <Campo rotulo="E-mail" id="email" type="email" value={valores.email} onChange={alterar} required />
        <Campo rotulo="Senha" id="senha" type="password" value={valores.senha} onChange={alterar} required />
        <MensagemErro mensagem={erro} />
        <button type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
      </form>
      <p>Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
    </main>
  );
}
