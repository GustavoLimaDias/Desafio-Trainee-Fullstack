import { useState } from 'react';
import Campo from './Campo.jsx';
import { MensagemErro } from './Estado.jsx';

// Mesmas regras da API; o tamanho é contado em caracteres Unicode, não em .length.
function validar({ titulo, conteudo }) {
  if (/^\s*$/.test(titulo)) return 'O título é obrigatório.';
  if (Array.from(titulo).length > 200) return 'O título deve ter no máximo 200 caracteres.';
  if (/^\s*$/.test(conteudo)) return 'O conteúdo é obrigatório.';
  if (Array.from(conteudo).length > 50000) return 'O conteúdo deve ter no máximo 50.000 caracteres.';
  return null;
}

const TAMANHO_MAXIMO_ARQUIVO = 1024 * 1024;

// Usado tanto na criação quanto na edição de documentos.
export default function DocumentoForm({ inicial = { titulo: '', conteudo: '' }, textoBotao, aoEnviar }) {
  const [valores, setValores] = useState(inicial);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  // Lê o .txt no navegador e coloca o texto no campo conteúdo; o arquivo não é enviado nem guardado.
  async function carregarArquivo(evento) {
    const arquivo = evento.target.files[0];
    evento.target.value = '';
    if (!arquivo) return;
    if (!arquivo.name.toLowerCase().endsWith('.txt')) return setErro('Selecione um arquivo .txt.');
    if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) return setErro('O arquivo deve ter no máximo 1 MB.');
    let conteudo;
    try {
      conteudo = await arquivo.text();
    } catch {
      return setErro('Não foi possível ler o arquivo.');
    }
    const titulo = valores.titulo || arquivo.name.replace(/\.txt$/i, '');
    setValores({ titulo, conteudo });
    setErro(validar({ titulo, conteudo }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    const erroValidacao = validar(valores);
    setErro(erroValidacao);
    if (erroValidacao) return;
    setEnviando(true);
    try {
      // O conteúdo vai exatamente como foi digitado, sem trim.
      await aoEnviar(valores);
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="formulario" noValidate>
      <Campo rotulo="Título" id="titulo" value={valores.titulo} onChange={alterar} required />
      <Campo rotulo="Conteúdo" id="conteudo" multilinha rows={16} value={valores.conteudo} onChange={alterar} required />
      <div className="linha-arquivo">
        <p className="dica">{Array.from(valores.conteudo).length.toLocaleString('pt-BR')} / 50.000 caracteres</p>
        <label className="botao secundario">
          Carregar arquivo .txt
          <input type="file" accept=".txt,text/plain" onChange={carregarArquivo} className="visualmente-oculto" />
        </label>
      </div>
      <MensagemErro mensagem={erro} />
      <button type="submit" disabled={enviando}>{enviando ? 'Salvando...' : textoBotao}</button>
    </form>
  );
}
