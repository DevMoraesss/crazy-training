import type { Modality } from '../workout';
import catalogData from './exercises.json';

/**
 * Exercício da base do app: seleção do free-exercise-db (domínio público) com nomes,
 * apelidos e instruções em pt-BR, mais alguns clássicos que o dataset não tem.
 */
export type CatalogExercise = {
  /** Slug estável em pt-BR, ex.: "supino-reto-barra". */
  id: string;
  name: string;
  /** Outras formas de escrever o nome, inclusive em inglês. Cada apelido pertence a um só exercício. */
  aliases: string[];
  modality: Modality;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  /** ID no free-exercise-db; null quando o exercício não existe lá. */
  sourceId: string | null;
  /** Caminhos relativos a EXERCISE_IMAGE_BASE_URL. */
  images: string[];
};

export const EXERCISE_CATALOG: readonly CatalogExercise[] = catalogData as CatalogExercise[];

export const EXERCISE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const byId = new Map(EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise]));

export function getExercise(id: string): CatalogExercise | undefined {
  return byId.get(id);
}

export function exerciseImageUrls(exercise: CatalogExercise): string[] {
  return exercise.images.map((path) => EXERCISE_IMAGE_BASE_URL + path);
}

/** Minúsculas, sem acento e sem pontuação: "Leg Press 45°" → "leg press 45". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ─── Busca (campo de busca do app) ───────────────────────────────────────────

const searchIndex = EXERCISE_CATALOG.map((exercise) => ({
  exercise,
  name: fold(exercise.name),
  aliases: exercise.aliases.map(fold),
}));

/** Cada palavra da busca é começo de alguma palavra do texto ("sup inc" acha "supino inclinado"). */
function matchesWords(text: string, queryWords: string[]): boolean {
  const words = text.split(' ');
  return queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)));
}

/** 0 = nome começa com a busca; 1 = palavras do nome; 2 = palavras de um apelido; 3 = trecho qualquer. */
function searchRank(entry: (typeof searchIndex)[number], query: string, queryWords: string[]): number | null {
  if (entry.name.startsWith(query)) return 0;
  if (matchesWords(entry.name, queryWords)) return 1;
  if (entry.aliases.some((alias) => matchesWords(alias, queryWords))) return 2;
  if ([entry.name, ...entry.aliases].some((text) => text.includes(query))) return 3;
  return null;
}

/** Busca por nome e apelidos, sem diferenciar acento e maiúsculas. Busca vazia retorna []. */
export function searchExercises(query: string, limit = 20): CatalogExercise[] {
  const folded = fold(query);
  if (folded === '') return [];
  const queryWords = folded.split(' ');
  return searchIndex
    .map((entry) => ({ exercise: entry.exercise, rank: searchRank(entry, folded, queryWords) }))
    .filter((result): result is { exercise: CatalogExercise; rank: number } => result.rank !== null)
    .sort((a, b) => a.rank - b.rank) // sort estável: dentro do mesmo nível vale a ordem do catálogo
    .slice(0, limit)
    .map((result) => result.exercise);
}

// ─── Reconhecimento de nomes importados (planilhas, PDFs, IA) ────────────────

/** Palavras que não mudam o exercício: "supino reto com barra" = "supino reto barra". */
const FILLER_WORDS = new Set([
  'a', 'o', 'e', 'as', 'os', 'ao', 'aos', 'com', 'de', 'da', 'do', 'das', 'dos', 'na', 'no', 'nas', 'nos',
  'em', 'para', 'pra', 'por', 'pela', 'pelo', 'grau', 'pegada', 'the', 'with', 'on', 'of', 'and',
]);

/** Grafias equivalentes (já no singular). */
const SYNONYMS = new Map([
  ['haltere', 'halter'],
  ['maq', 'maquina'],
  ['pes', 'pe'],
  ['adutore', 'adutor'],
  ['abdutore', 'abdutor'],
]);

/** Equipamento sobrando no texto indica outra variação: "stiff com halteres" não é o "stiff" com barra. */
const EQUIPMENT_WORDS = new Set(['barra', 'halter', 'maquina', 'smith', 'polia', 'cabo', 'corda', 'kettlebell', 'elastico', 'anilha']);

/** "halteres" → "haltere"; mantém "press" e palavras curtas como "pes". */
function singular(word: string): string {
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
}

function withoutParentheses(text: string): string {
  return text.replace(/\([^)]*\)/g, ' ');
}

/** "SUPINO RETO C/ BARRA" → ["supino", "reto", "barra"] */
function toWords(text: string): string[] {
  const expanded = text.replace(/\bc\//gi, ' com ').replace(/\bs\//gi, ' sem ');
  return fold(expanded)
    .split(' ')
    .map((word) => singular(word))
    .map((word) => SYNONYMS.get(word) ?? word)
    .filter((word) => word !== '' && !FILLER_WORDS.has(word));
}

/** Mesma chave para as mesmas palavras em qualquer ordem. */
function signature(words: string[]): string {
  return [...new Set(words)].sort().join(' ');
}

type MatchEntry = { exercise: CatalogExercise; keys: string[][]; vocabulary: Set<string> };

const matchIndex: MatchEntry[] = EXERCISE_CATALOG.map((exercise) => {
  const texts = [exercise.name, withoutParentheses(exercise.name), ...exercise.aliases];
  const keys = texts.map(toWords).filter((words) => words.length > 0);
  // o próprio equipamento nunca conta como "outra variação": "remada curvada supinada com barra"
  return { exercise, keys, vocabulary: new Set([...keys.flat(), ...toWords(exercise.equipment)]) };
});

const exactIndex = new Map<string, CatalogExercise>();
for (const entry of matchIndex) {
  for (const key of entry.keys) exactIndex.set(signature(key), entry.exercise);
}

/** Palavras que abrem o nome de algum exercício: "prancha", "supino", "rosca"... */
const HEAD_WORDS = new Set(matchIndex.flatMap((entry) => entry.keys.map((key) => key[0]!)));

/**
 * Palavra sobrando no texto que aponta para outro exercício ou outra variação:
 * - equipamento diferente ("stiff com halteres" não é o stiff com barra);
 * - começo de outro nome ("prancha com elevação de perna" não é "elevação de pernas");
 * - palavra que um parente (nome que começa igual) usa para se diferenciar: em
 *   "supino inclinado halteres", o "inclinado" impede o match com "supino com halteres" (reto).
 */
function pointsElsewhere(word: string, key: string[], self: MatchEntry): boolean {
  if (EQUIPMENT_WORDS.has(word) || HEAD_WORDS.has(word)) return true;
  return matchIndex.some(
    (other) => other !== self && other.vocabulary.has(word) && other.keys.some((otherKey) => otherKey[0] === key[0]),
  );
}

/**
 * O texto contém um nome ou apelido inteiro de 2+ palavras, que explica pelo menos metade do texto,
 * e o que sobra não aponta para outra variação. Empate entre exercícios diferentes = incerto.
 */
function findByContainedKey(input: Set<string>): CatalogExercise | null {
  let best: CatalogExercise | null = null;
  let bestSize = 0;
  let tied = false;
  for (const entry of matchIndex) {
    for (const key of entry.keys) {
      if (key.length < 2 || key.length < bestSize || key.length * 2 < input.size) continue;
      if (!key.every((word) => input.has(word))) continue;
      const extra = [...input].filter((word) => !entry.vocabulary.has(word));
      if (extra.some((word) => pointsElsewhere(word, key, entry))) continue;
      if (key.length > bestSize) {
        best = entry.exercise;
        bestSize = key.length;
        tied = false;
      } else if (best !== entry.exercise) {
        tied = true;
      }
    }
  }
  return tied ? null : best;
}

/** O texto é um nome ou apelido com uma palavra a menos ("tríceps testa W"), e só um exercício serve. */
function findByShortenedKey(input: Set<string>): CatalogExercise | null {
  if (input.size < 2) return null;
  const found = matchIndex.filter((entry) =>
    entry.keys.some((key) => key.length - input.size === 1 && [...input].every((word) => key.includes(word))),
  );
  return found.length === 1 ? found[0]!.exercise : null;
}

/**
 * Para importações: liga um nome escrito livremente ("SUPINO RETO C/ BARRA", "Leg 45") a um exercício
 * do catálogo. Retorna null quando não tem certeza; errar com confiança é pior do que não reconhecer.
 */
export function matchExercise(name: string): { exercise: CatalogExercise; confidence: 'exact' | 'probable' } | null {
  const words = toWords(name);
  for (const variant of [words, toWords(withoutParentheses(name))]) {
    const exact = variant.length > 0 ? exactIndex.get(signature(variant)) : undefined;
    if (exact) return { exercise: exact, confidence: 'exact' };
  }
  const input = new Set(words);
  const probable = findByContainedKey(input) ?? findByShortenedKey(input);
  return probable ? { exercise: probable, confidence: 'probable' } : null;
}
