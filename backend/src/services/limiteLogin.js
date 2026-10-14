import { ErroApp } from '../erros.js';

export const MAX_FALHAS = 5;
const JANELA_MS = 15 * 60 * 1000;

// chave (ip + e-mail) -> { quantidade, inicio }. Só falhas são guardadas; um login certo limpa a chave.
// shortcut: memória de um único processo, zera ao reiniciar; com várias instâncias da API, guardar no banco ou Redis.
const falhas = new Map();

function atual(chave, agora) {
  const registro = falhas.get(chave);
  if (registro && agora - registro.inicio >= JANELA_MS) {
    falhas.delete(chave);
    return null;
  }
  return registro ?? null;
}

export function verificar(chave, agora = Date.now()) {
  if (atual(chave, agora)?.quantidade >= MAX_FALHAS) {
    throw new ErroApp(429, 'Muitas tentativas de login. Tente novamente em 15 minutos.');
  }
}

export function registrarFalha(chave, agora = Date.now()) {
  const registro = atual(chave, agora) ?? { quantidade: 0, inicio: agora };
  registro.quantidade += 1;
  falhas.set(chave, registro);
  // Evita que chaves antigas se acumulem indefinidamente.
  if (falhas.size > 10000) for (const c of falhas.keys()) atual(c, agora);
}

export function limpar(chave) {
  falhas.delete(chave);
}
