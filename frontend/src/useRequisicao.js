import { useEffect, useState } from 'react';
import { requisitar } from './api.js';

// Carrega um recurso da API e expõe os estados de carregamento e erro.
export function useRequisicao(caminho) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });

  useEffect(() => {
    let ativo = true;
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));
    requisitar(caminho)
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => ativo && setEstado({ dados: null, carregando: false, erro: erro.message }));
    return () => {
      ativo = false;
    };
  }, [caminho]);

  const definirDados = (dados) => setEstado((atual) => ({ ...atual, dados }));
  return { ...estado, definirDados };
}
