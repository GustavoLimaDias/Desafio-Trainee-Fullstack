import { NOMES_TIPO } from '../formatar.js';

// Etiqueta colorida com o tipo do documento; sem tipo, indica que ainda não foi analisado.
export default function EtiquetaTipo({ tipo }) {
  if (!tipo) return <span className="etiqueta etiqueta-vazia">Não analisado</span>;
  return <span className={`etiqueta etiqueta-${tipo}`}>{NOMES_TIPO[tipo]}</span>;
}
