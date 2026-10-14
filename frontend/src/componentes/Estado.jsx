export function Carregando({ texto = 'Carregando...' }) {
  return <p className="carregando" role="status">{texto}</p>;
}

export function MensagemErro({ mensagem }) {
  if (!mensagem) return null;
  return <p className="erro" role="alert">{mensagem}</p>;
}
