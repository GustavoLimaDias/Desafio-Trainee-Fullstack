export const formatarData = (iso) => new Date(iso).toLocaleString('pt-BR');

export const NOMES_TIPO = {
  contrato: 'Contrato',
  peticao: 'Petição',
  decisao: 'Decisão',
  notificacao: 'Notificação',
  outro: 'Outro',
};
