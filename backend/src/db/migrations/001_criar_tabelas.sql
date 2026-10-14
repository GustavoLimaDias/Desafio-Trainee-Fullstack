CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  -- Sempre gravado em minúsculas pela aplicação, então o UNIQUE já não diferencia maiúsculas.
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  conteudo TEXT NOT NULL,
  autor_id INTEGER NOT NULL REFERENCES usuarios (id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX documentos_criado_em_idx ON documentos (criado_em, id);
CREATE INDEX documentos_autor_id_idx ON documentos (autor_id);

-- Uma análise por documento: o UNIQUE permite substituir com ON CONFLICT
-- e o ON DELETE CASCADE remove a análise junto com o documento.
CREATE TABLE analises (
  id SERIAL PRIMARY KEY,
  documento_id INTEGER NOT NULL UNIQUE REFERENCES documentos (id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('contrato', 'peticao', 'decisao', 'notificacao', 'outro')),
  resumo TEXT NOT NULL,
  pontos_de_atencao JSONB NOT NULL,
  analisador VARCHAR(50) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
