// Cadastra usuários e documentos fictícios para demonstração. Pode ser executado de novo:
// usuários e documentos que já existem (mesmo e-mail / mesmo título do mesmo autor) são mantidos.
import { pool } from './pool.js';
import { cadastrar } from '../services/authService.js';
import { analisar } from '../services/documentosService.js';
import * as usuarios from '../repositorios/usuariosRepositorio.js';
import * as documentos from '../repositorios/documentosRepositorio.js';

const SENHA_DEMO = 'Demo@2026';

const USUARIOS = [
  { nome: 'Ana Souza', email: 'ana@exemplo.com' },
  { nome: 'Bruno Lima', email: 'bruno@exemplo.com' },
];

// Todos os nomes, endereços, valores e números de processo são inventados.
const DOCUMENTOS = [
  {
    autor: 'ana@exemplo.com',
    analisar: true,
    titulo: 'Contrato de prestação de serviços - Estúdio Aurora',
    conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESIGN

Pelo presente instrumento, Estúdio Aurora Design Ltda, doravante denominada CONTRATADA, e Padaria Pão do Vale Ltda, doravante denominada CONTRATANTE, ajustam o que segue.

CLÁUSULA PRIMEIRA - A CONTRATADA criará a identidade visual da CONTRATANTE, incluindo logotipo, cardápio e fachada.

CLÁUSULA SEGUNDA - O prazo de entrega é de 45 dias contados da assinatura, e a vigência deste contrato é de 6 meses.

CLÁUSULA TERCEIRA - O valor total é de R$ 9.000,00, pago em 3 parcelas. O atraso no pagamento gera multa de 2% e juros de 1% ao mês.

CLÁUSULA QUARTA - A rescisão sem justo motivo obriga a parte que a solicitar a pagar 20% do valor restante.

Contagem, 5 de agosto de 2026.`,
  },
  {
    autor: 'ana@exemplo.com',
    analisar: false,
    titulo: 'Notificação extrajudicial - Condomínio Jardim dos Ipês',
    conteudo: `NOTIFICAÇÃO EXTRAJUDICIAL

Notificante: Condomínio Residencial Jardim dos Ipês
Notificada: Juliana Prates Moura, unidade 204

Pela presente, notificamos Vossa Senhoria de que as reformas na unidade 204 vêm sendo realizadas fora do horário permitido pelo regimento interno.

Fica a notificada advertida a cumprir o horário das 8h às 17h no prazo de 5 dias, sob pena de multa equivalente a uma taxa condominial.

Betim, 20 de setembro de 2026.`,
  },
  {
    autor: 'ana@exemplo.com',
    analisar: true,
    titulo: 'Ata de reunião interna - organização da agenda',
    conteudo: `ATA DE REUNIÃO INTERNA

Aos 2 dias de outubro de 2026, reuniram-se os membros da equipe administrativa do escritório.

Foi definida a nova escala de atendimento ao público, com revezamento semanal entre os assistentes.

Também ficou decidido que as pastas físicas serão digitalizadas até o fim do ano.

Nada mais havendo a tratar, a reunião foi encerrada.`,
  },
  {
    autor: 'bruno@exemplo.com',
    analisar: true,
    titulo: 'Petição inicial - cobrança de serviços de reforma',
    conteudo: `EXCELENTÍSSIMO SENHOR JUIZ DE DIREITO DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE SABARÁ

Reformas Bom Lar Ltda, empresa fictícia com sede em Sabará, vem respeitosamente propor a presente AÇÃO DE COBRANÇA em face de Otávio Cardoso Neves.

A requerente executou a reforma da cozinha do requerido em junho de 2026, conforme orçamento aprovado, e não recebeu o pagamento combinado.

Diante do exposto, requer a condenação do requerido ao pagamento de R$ 6.300,00, com correção monetária e juros desde o vencimento.

Nestes termos, pede deferimento.

Sabará, 1 de outubro de 2026.`,
  },
  {
    autor: 'bruno@exemplo.com',
    analisar: false,
    titulo: 'Sentença - ação de obrigação de fazer',
    conteudo: `PODER JUDICIÁRIO - COMARCA DE NOVA LIMA
Processo 0009999-11.2026.0.00.0000

SENTENÇA

Trata-se de ação em que o autor pede que a construtora ré conclua a calçada do loteamento, conforme prometido no contrato de compra.

Ante o exposto, julgo procedente o pedido e condeno a ré a concluir a obra no prazo de 60 dias, sob pena de multa diária de R$ 200,00.

Condeno a ré também ao pagamento das custas e dos honorários advocatícios.

Publique-se. Registre-se. Intimem-se.`,
  },
];

function descreverBanco(url) {
  const { hostname, port, pathname } = new URL(url);
  return `${hostname}:${port || 5432}${pathname}`;
}

async function obterUsuario({ nome, email }) {
  const existente = await usuarios.buscarPorEmail(email);
  if (existente) {
    console.log(`Usuário ${email} já existe: mantido (a senha não é alterada).`);
    return existente.id;
  }
  const criado = await cadastrar({ nome, email, senha: SENHA_DEMO });
  console.log(`Usuário criado: ${email}`);
  return criado.id;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Recusado: NODE_ENV=production. Os dados de demonstração são só para desenvolvimento.');
  }
  // O banco de testes é apagado a cada execução dos testes; não faz sentido popular ele.
  if (process.env.DATABASE_URL === process.env.DATABASE_URL_TEST) {
    throw new Error('Recusado: DATABASE_URL aponta para o banco de testes.');
  }
  console.log(`Banco: ${descreverBanco(process.env.DATABASE_URL)}`);

  const ids = {};
  for (const usuario of USUARIOS) ids[usuario.email] = await obterUsuario(usuario);

  for (const doc of DOCUMENTOS) {
    const autorId = ids[doc.autor];
    const doAutor = await documentos.listar({ ordem: 'asc', autorId });
    if (doAutor.some((d) => d.titulo === doc.titulo)) {
      console.log(`Documento já existe: "${doc.titulo}"`);
      continue;
    }
    const id = await documentos.criar({ titulo: doc.titulo, conteudo: doc.conteudo, autorId });
    const analise = doc.analisar ? await analisar(id, autorId) : null;
    console.log(`Documento criado: "${doc.titulo}" (${analise ? `analisado: ${analise.tipo}` : 'sem análise'})`);
  }
}

try {
  await main();
} catch (erro) {
  console.error(erro.message || erro.code);
  process.exitCode = 1;
} finally {
  await pool.end();
}
