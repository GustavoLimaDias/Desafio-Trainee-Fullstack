import regras from './regras.js';

const analisadores = { regras };

export function obterAnalisador(nome = process.env.ANALISADOR ?? 'regras') {
  const analisador = analisadores[nome];
  if (!analisador) throw new Error(`Analisador desconhecido: ${nome}`);
  return analisador;
}
