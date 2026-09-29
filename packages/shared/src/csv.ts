import {
  formatReps,
  parseDuration,
  parseReps,
  programSchema,
  workoutExerciseSchema,
  type Program,
  type WorkoutExercise,
} from './workout';

/**
 * CSV de treino: uma linha por exercício. Treinos são agrupados pela coluna
 * "treino", na ordem em que aparecem. É o formato da importação manual (a IA
 * externa devolve este CSV) e da exportação.
 */
export const CSV_COLUMNS = [
  'treino',
  'foco',
  'exercicio',
  'series',
  'repeticoes',
  'carga_kg',
  'descanso_s',
  'observacoes',
] as const;
type CsvColumn = (typeof CSV_COLUMNS)[number];

const REQUIRED_COLUMNS: readonly CsvColumn[] = ['treino', 'exercicio', 'series', 'repeticoes'];

// Cabeçalhos que planilhas reais costumam usar, já normalizados (sem acento, snake_case).
const HEADER_ALIASES: Record<string, CsvColumn> = {
  treino: 'treino',
  dia: 'treino',
  divisao: 'treino',
  foco: 'foco',
  grupo: 'foco',
  grupos: 'foco',
  grupo_muscular: 'foco',
  exercicio: 'exercicio',
  exercicios: 'exercicio',
  series: 'series',
  sets: 'series',
  repeticoes: 'repeticoes',
  reps: 'repeticoes',
  carga: 'carga_kg',
  carga_kg: 'carga_kg',
  peso: 'carga_kg',
  peso_kg: 'carga_kg',
  kg: 'carga_kg',
  descanso: 'descanso_s',
  descanso_s: 'descanso_s',
  intervalo: 'descanso_s',
  observacoes: 'observacoes',
  observacao: 'observacoes',
  obs: 'observacoes',
  notas: 'observacoes',
};

const FIELD_LABELS: Partial<Record<keyof WorkoutExercise, string>> = {
  name: 'exercício',
  sets: 'séries',
  reps: 'repetições',
  loadKg: 'carga',
  restSeconds: 'descanso',
  notes: 'observações',
};

export type CsvIssue = { line: number; message: string };
export type CsvParseResult = { ok: true; program: Program } | { ok: false; issues: CsvIssue[] };

export function parseProgramCsv(
  text: string,
  options: { name: string; source?: 'csv' | 'ai-import' },
): CsvParseResult {
  const clean = text.replace(/^﻿/, '');
  const rows = parseCsvRows(clean, detectDelimiter(clean.split(/\r?\n/, 1)[0] ?? ''));
  const [header, ...body] = rows;
  if (!header || header.every((cell) => cell.trim() === '')) {
    return { ok: false, issues: [{ line: 1, message: 'O arquivo está vazio.' }] };
  }

  const columns = header.map((cell) => HEADER_ALIASES[normalizeHeader(cell)]);
  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    return { ok: false, issues: [{ line: 1, message: `Faltam as colunas: ${missing.join(', ')}.` }] };
  }

  const issues: CsvIssue[] = [];
  const workouts = new Map<string, { name: string; focus?: string; exercises: WorkoutExercise[] }>();

  body.forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((cell) => cell.trim() === '')) return;

    const get = (column: CsvColumn) => {
      const position = columns.indexOf(column);
      return position === -1 ? '' : (cells[position] ?? '').trim();
    };

    const rowIssues: string[] = [];
    const workoutName = get('treino');
    if (workoutName === '') rowIssues.push('treino vazio');

    const reps = parseReps(get('repeticoes'));
    if (!reps) rowIssues.push(`repetições "${get('repeticoes')}" não reconhecidas`);

    const loadKg = parseDecimal(get('carga_kg'));
    if (Number.isNaN(loadKg)) rowIssues.push(`carga "${get('carga_kg')}" não é um número`);

    const restText = get('descanso_s');
    const restSeconds = restText === '' ? undefined : parseDuration(restText);
    if (restSeconds === null) rowIssues.push(`descanso "${restText}" não reconhecido`);

    const candidate = {
      name: get('exercicio'),
      sets: Number(get('series')),
      reps: reps ?? undefined,
      loadKg,
      restSeconds: restSeconds ?? undefined,
      notes: get('observacoes') || undefined,
    };
    const parsed = workoutExerciseSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof WorkoutExercise | undefined;
        // Repetições, carga e descanso ilegíveis já foram explicados acima.
        if (field === 'reps' && !reps) continue;
        if (field === 'loadKg' && Number.isNaN(loadKg)) continue;
        rowIssues.push(`valor inválido em ${(field && FIELD_LABELS[field]) ?? 'uma coluna'}`);
      }
    }

    if (rowIssues.length > 0 || !parsed.success) {
      issues.push({ line, message: capitalize(rowIssues.join('; ')) + '.' });
      return;
    }

    let workout = workouts.get(workoutName);
    if (!workout) {
      workout = { name: workoutName, exercises: [] };
      workouts.set(workoutName, workout);
    }
    const focus = get('foco');
    if (focus && !workout.focus) workout.focus = focus;
    workout.exercises.push(parsed.data);
  });

  if (issues.length > 0) return { ok: false, issues };
  if (workouts.size === 0) return { ok: false, issues: [{ line: 2, message: 'Nenhum exercício encontrado.' }] };

  const program = programSchema.safeParse({
    name: options.name,
    source: options.source ?? 'csv',
    workouts: [...workouts.values()],
  });
  if (!program.success) {
    return {
      ok: false,
      issues: program.error.issues.map((issue) => ({ line: 0, message: `${issue.path.join('.')}: ${issue.message}` })),
    };
  }
  return { ok: true, program: program.data };
}

export function serializeProgramCsv(program: Program): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const workout of program.workouts) {
    for (const exercise of workout.exercises) {
      lines.push(
        [
          workout.name,
          workout.focus ?? '',
          exercise.name,
          String(exercise.sets),
          formatReps(exercise.reps),
          exercise.loadKg === undefined ? '' : String(exercise.loadKg),
          exercise.restSeconds === undefined ? '' : String(exercise.restSeconds),
          exercise.notes ?? '',
        ]
          .map(quoteCsvField)
          .join(','),
      );
    }
  }
  return lines.join('\n') + '\n';
}

/** Parser CSV (RFC 4180): aspas, aspas escapadas, quebras de linha dentro de aspas, CRLF. */
export function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Excel em pt-BR exporta CSV com ";". Escolhe o separador mais frequente no cabeçalho. */
function detectDelimiter(headerLine: string): string {
  const counts = [';', ',', '\t'].map((delimiter) => ({
    delimiter,
    count: headerLine.split(delimiter).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0]?.count ? counts[0].delimiter : ',';
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** "22,5" e "22.5" viram 22.5. Vazio vira undefined; texto inválido vira NaN. */
function parseDecimal(text: string): number | undefined {
  const value = text.trim().replace(/\s*kg$/i, '');
  if (value === '') return undefined;
  if (!/^\d+([.,]\d+)?$/.test(value)) return Number.NaN;
  return Number(value.replace(',', '.'));
}

function quoteCsvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
