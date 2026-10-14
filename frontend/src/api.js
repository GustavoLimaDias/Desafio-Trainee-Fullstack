const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let aoPerderAutenticacao = () => {};

// Chamado pelo AuthContext para deslogar quando a API recusar o token (ex.: expirado).
export function definirAoPerderAutenticacao(funcao) {
  aoPerderAutenticacao = funcao;
}

export async function requisitar(caminho, { metodo = 'GET', corpo } = {}) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(URL_API + caminho, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new Error('Não foi possível conectar à API.');
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (resposta.status === 401 && token) aoPerderAutenticacao();
  if (!resposta.ok) throw new Error(dados?.mensagem ?? 'Erro inesperado. Tente novamente.');
  return dados;
}
