import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { requisitar } from '../api.js';
import Campo from '../componentes/Campo.jsx';
import { MensagemErro } from '../componentes/Estado.jsx';

function validar({ nome, email, senha }) {
  if (/^\s*$/.test(nome)) return 'O nome é obrigatório.';
  if (Array.from(nome).length > 100) return 'O nome deve ter no máximo 100 caracteres.';
  // Mesmo formato aceito pela API.
  if (email.length > 254 || !/^[^\s@]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(email)) {
    return 'Informe um e-mail válido.';
  }
  if (Array.from(senha).length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (new TextEncoder().encode(senha).length > 72) return 'A senha deve ter no máximo 72 bytes (72 caracteres sem acentos).';
  return null;
}

export default function Cadastro() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [valores, setValores] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/documentos" replace />;

  const alterar = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  async function enviar(evento) {
    evento.preventDefault();
    const erroValidacao = validar(valores);
    setErro(erroValidacao);
    if (erroValidacao) return;
    setEnviando(true);
    try {
      await requisitar('/auth/cadastro', { metodo: 'POST', corpo: valores });
      navegar('/login', { state: { mensagem: 'Cadastro realizado. Faça login para continuar.' } });
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <main className="cartao-autenticacao">
      <p className="marca-autenticacao">Analisador de Documentos</p>
      <h1>Criar conta</h1>
      <p className="subtitulo">Use apenas dados fictícios.</p>
      <form onSubmit={enviar} className="formulario" noValidate>
        <Campo rotulo="Nome" id="nome" value={valores.nome} onChange={alterar} required />
        <Campo rotulo="E-mail" id="email" type="email" value={valores.email} onChange={alterar} required />
        <Campo rotulo="Senha (mínimo 8 caracteres)" id="senha" type="password" value={valores.senha} onChange={alterar} required />
        <MensagemErro mensagem={erro} />
        <button type="submit" disabled={enviando}>{enviando ? 'Cadastrando...' : 'Cadastrar'}</button>
      </form>
      <p>Já tem conta? <Link to="/login">Entrar</Link></p>
    </main>
  );
}
