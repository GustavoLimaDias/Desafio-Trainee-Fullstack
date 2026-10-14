import { app } from './app.js';
import { config } from './config.js';
import { obterAnalisador } from './analisadores/index.js';

// Falha ao subir, e não na primeira requisição, se ANALISADOR for desconhecido ou JWT_SECRET faltar.
obterAnalisador();
config.jwtSegredo;

// No Express 5, falhas ao abrir a porta (ex.: porta em uso) chegam como argumento do callback.
app.listen(config.porta, (erro) => {
  if (erro) {
    console.error(`Não foi possível iniciar a API na porta ${config.porta}: ${erro.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`API rodando em http://localhost:${config.porta}`);
});
