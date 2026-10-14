import { ErroApp } from './erros.js';

// O enunciado conta caracteres como code points (emoji = 1), por isso Array.from.
const tamanho = (texto) => Array.from(texto).length;

export function textoObrigatorio(valor, campo, maximo) {
  if (typeof valor !== 'string' || /^\s*$/.test(valor)) {
    throw new ErroApp(400, `O campo '${campo}' é obrigatório.`);
  }
  if (maximo && tamanho(valor) > maximo) {
    throw new ErroApp(400, `O campo '${campo}' deve ter no máximo ${maximo} caracteres.`);
  }
  return valor;
}

// Confere só o formato (domínio com pontos e extensão de 2+ letras); não garante que o e-mail exista.
const FORMATO_EMAIL = /^[^\s@]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export function emailValido(valor) {
  textoObrigatorio(valor, 'email');
  if (tamanho(valor) > 254 || !FORMATO_EMAIL.test(valor)) {
    throw new ErroApp(400, "O campo 'email' deve ser um e-mail válido.");
  }
  return valor.toLowerCase();
}

export function senhaValida(valor) {
  textoObrigatorio(valor, 'senha');
  if (tamanho(valor) < 8) throw new ErroApp(400, "O campo 'senha' deve ter no mínimo 8 caracteres.");
  // O bcrypt ignora o que passa de 72 bytes; recusar evita descartar o final da senha sem aviso.
  if (Buffer.byteLength(valor, 'utf8') > 72) {
    throw new ErroApp(400, "O campo 'senha' deve ter no máximo 72 bytes (72 caracteres sem acentos).");
  }
  return valor;
}

// Parâmetro de texto opcional da query; vazio ou só espaços conta como não informado.
export function textoOpcional(valor, campo) {
  if (valor === undefined) return null;
  if (typeof valor !== 'string') throw new ErroApp(400, `O parâmetro '${campo}' deve aparecer uma vez só.`);
  return /^\s*$/.test(valor) ? null : valor;
}

export function inteiroOpcional(valor, campo, minimo, maximo) {
  if (valor === undefined) return null;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || Number(valor) < minimo || Number(valor) > maximo) {
    throw new ErroApp(400, `O parâmetro '${campo}' deve ser um número inteiro entre ${minimo} e ${maximo}.`);
  }
  return Number(valor);
}

export function opcao(valor, campo, permitidos, padrao) {
  if (valor === undefined) return padrao;
  if (!permitidos.includes(valor)) {
    throw new ErroApp(400, `O parâmetro '${campo}' deve ser ${permitidos.join(' ou ')}.`);
  }
  return valor;
}

// Ids fora do formato não podem existir no banco: tratados como 404.
export function idDocumento(valor) {
  const id = Number(valor);
  if (!/^\d+$/.test(valor) || id < 1 || id > 2147483647) {
    throw new ErroApp(404, 'Documento não encontrado.');
  }
  return id;
}
