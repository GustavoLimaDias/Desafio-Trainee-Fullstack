import { TERMOS_POR_TIPO, TERMOS_DE_ATENCAO } from './glossario.js';

const normalizar = (s) => s.normalize('NFD').replace(/[\u{300}-\u{36f}]/gu, '').toLowerCase();

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compilar = (termo) => new RegExp(`(?<![a-z0-9])${escaparRegex(normalizar(termo))}(?![a-z0-9])`);

const tipos = TERMOS_POR_TIPO.map(({ tipo, termos }) => ({ tipo, regexes: termos.map(compilar) }));
const regexesAtencao = TERMOS_DE_ATENCAO.map(compilar);

function dividirEmFrases(conteudo) {
  const texto = conteudo.normalize('NFC').replace(/\r\n?/g, '\n');
  return texto
    .split('\n')
    .flatMap((linha) => linha.split(/(?<=[.!?])[^\S\n]+/))
    .map((f) => f.replace(/^[^\S\n]+|[^\S\n]+$/g, '').replace(/[^\S\n]+/g, ' '))
    .filter((f) => f !== '');
}

function classificar(normalizadas) {
  let melhor = 'outro';
  let max = 0;
  for (const { tipo, regexes } of tipos) {
    const n = regexes.filter((re) => normalizadas.some((f) => re.test(f))).length;
    if (n > max) {
      max = n;
      melhor = tipo;
    }
  }
  return melhor;
}

function resumir(frases) {
  const r = frases.slice(0, 2).join(' ');
  const pontos = Array.from(r);
  if (pontos.length <= 300) return r;
  return pontos.slice(0, 297).join('').replace(/[^\S\n]+$/, '') + '...';
}

function pontosDeAtencao(frases, normalizadas) {
  const achadas = frases.filter((_, i) => regexesAtencao.some((re) => re.test(normalizadas[i])));
  return [...new Set(achadas)];
}

function analisar(conteudo) {
  const frases = dividirEmFrases(conteudo);
  const normalizadas = frases.map(normalizar);
  return {
    tipo: classificar(normalizadas),
    resumo: resumir(frases),
    pontos_de_atencao: pontosDeAtencao(frases, normalizadas),
  };
}

export default { nome: 'regras', analisar };
