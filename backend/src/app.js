import express from 'express';
import { config } from './config.js';
import { authRotas } from './rotas/authRotas.js';
import { documentosRotas } from './rotas/documentosRotas.js';
import { rotaNaoEncontrada, tratarErros } from './middlewares/tratarErros.js';

export const app = express();

// O front-end roda em outra origem (Vite), então a API libera apenas essa origem.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', config.origemFrontend);
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// O limite padrão (100kb) não comporta 50.000 caracteres com acentos e emojis.
app.use(express.json({ limit: '1mb' }));

app.use('/auth', authRotas);
app.use('/documentos', documentosRotas);

app.use(rotaNaoEncontrada);
app.use(tratarErros);
