import { CSV_COLUMNS } from './csv';

/**
 * Prompt da importação manual. A pessoa cola numa IA (ChatGPT, Gemini, Claude) junto com
 * o treino em PDF, imagem ou texto, e cola de volta no app o CSV que a IA responder.
 * O exemplo no fim é validado pelos testes contra o parser de CSV.
 */
export function buildImportPrompt(): string {
  return [
    'Converta o treino que estou enviando (PDF, imagem, planilha ou texto) para CSV, seguindo exatamente estas regras:',
    '',
    `1. A primeira linha é o cabeçalho: ${CSV_COLUMNS.join(',')}`,
    '2. Uma linha por exercício, na ordem em que aparecem no treino.',
    '3. treino: o nome do treino como está no original (ex.: "Treino A"). Linhas do mesmo treino repetem o nome.',
    '4. foco: os grupos musculares do treino (ex.: "Peito e tríceps"). Pode ficar vazio.',
    '5. exercicio: o nome do exercício em português, como se fala em academia no Brasil.',
    '6. series: número inteiro.',
    '7. repeticoes: um número ("10"), uma faixa ("8-12"), "falha" ou um tempo ("30s").',
    '8. carga_kg: número com ponto decimal, ou vazio se o treino não disser.',
    '9. descanso_s: descanso entre as séries, em segundos, ou vazio.',
    '10. observacoes: técnicas e detalhes (drop-set, cadência, bi-set), ou vazio.',
    '11. Coloque entre aspas os campos que tiverem vírgula.',
    '12. Se algo estiver ilegível, deixe o campo vazio. Não invente valores.',
    '13. Responda somente com o CSV, sem explicações e sem bloco de código.',
    '',
    'Exemplo de resposta:',
    CSV_COLUMNS.join(','),
    'Treino A,"Peito, ombro e tríceps",Supino reto com barra,4,10,40,90,',
    'Treino A,,Crucifixo na máquina,3,8-12,,60,Segurar 1 s no alongamento',
    'Treino B,Costas e bíceps,Barra fixa,3,falha,,120,',
  ].join('\n');
}
