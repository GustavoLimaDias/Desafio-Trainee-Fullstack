const CODIGOS = {
  400: 'VALIDACAO',
  401: 'NAO_AUTENTICADO',
  403: 'SEM_PERMISSAO',
  404: 'NAO_ENCONTRADO',
  409: 'CONFLITO',
  429: 'MUITAS_TENTATIVAS',
};

export class ErroApp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
    this.codigo = CODIGOS[status];
  }
}
