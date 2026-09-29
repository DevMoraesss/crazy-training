// Em desenvolvimento as variáveis vêm de apps/api/.env. Na Railway elas já estão no ambiente.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: segue com o que já está em process.env.
}
