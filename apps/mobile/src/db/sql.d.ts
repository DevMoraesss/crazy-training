// Migrações do Drizzle importadas como texto (babel-plugin-inline-import).
declare module '*.sql' {
  const content: string;
  export default content;
}
