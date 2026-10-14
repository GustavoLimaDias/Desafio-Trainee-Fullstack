// A ordem do array é a prioridade de desempate (Regra 3).
export const TERMOS_POR_TIPO = [
  { tipo: 'decisao', termos: ['sentença', 'julgo', 'condeno', 'publique-se', 'registre-se', 'intimem-se', 'trânsito em julgado'] },
  { tipo: 'peticao', termos: ['excelentíssimo', 'excelentíssima', 'vem respeitosamente', 'requerente', 'requerido', 'requerida', 'requer', 'nestes termos', 'pede deferimento'] },
  { tipo: 'notificacao', termos: ['notificação extrajudicial', 'notificante', 'notificado', 'notificada', 'notificamos'] },
  { tipo: 'contrato', termos: ['contratante', 'contratada', 'contratado', 'cláusula', 'pelo presente instrumento', 'vigência', 'locador', 'locadora', 'locatário', 'locatária'] },
];

export const TERMOS_DE_ATENCAO = [
  'multa', 'multas', 'prazo', 'prazos', 'rescisão', 'juros', 'correção monetária',
  'penalidade', 'indenização', 'despejo', 'honorários',
];
