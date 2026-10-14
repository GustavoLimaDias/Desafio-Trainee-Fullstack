import { createContext, useContext, useEffect, useState } from 'react';
import { definirAoPerderAutenticacao } from './api.js';

const AuthContext = createContext(null);

function lerUsuarioSalvo() {
  try {
    return JSON.parse(localStorage.getItem('usuario'));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => (localStorage.getItem('token') ? lerUsuarioSalvo() : null));
  // Mensagem exibida no login quando a API recusa o token (ex.: sessão expirada).
  const [aviso, setAviso] = useState(null);

  function entrar({ token, usuario }) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
    setAviso(null);
  }

  function sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  useEffect(
    () =>
      definirAoPerderAutenticacao(() => {
        sair();
        setAviso('Sua sessão expirou. Entre novamente.');
      }),
    [],
  );

  return <AuthContext.Provider value={{ usuario, aviso, entrar, sair }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
