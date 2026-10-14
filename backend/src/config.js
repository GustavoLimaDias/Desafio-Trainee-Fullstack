function obrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida. Veja o arquivo .env.example.`);
  return valor;
}

// Variáveis obrigatórias são lidas só quando usadas, para os testes sem banco não exigirem todas.
export const config = {
  porta: Number(process.env.PORT ?? 3000),
  origemFrontend: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  get databaseUrl() {
    return obrigatoria('DATABASE_URL');
  },
  get jwtSegredo() {
    return obrigatoria('JWT_SECRET');
  },
};
