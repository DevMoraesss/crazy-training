import { describe, expect, it } from 'vitest';

import { MODALITIES } from '../workout';
import {
  EXERCISE_CATALOG,
  EXERCISE_IMAGE_BASE_URL,
  exerciseImageUrls,
  getExercise,
  matchExercise,
  searchExercises,
} from './index';

const MUSCLES = [
  'peito', 'costas', 'ombros', 'trapézio', 'bíceps', 'tríceps', 'antebraço', 'abdômen', 'oblíquos', 'lombar',
  'glúteos', 'quadríceps', 'posterior de coxa', 'adutores', 'abdutores', 'panturrilha', 'pescoço', 'corpo inteiro',
];
const EQUIPMENT = [
  'barra', 'halteres', 'máquina', 'polia', 'smith', 'peso corporal', 'kettlebell', 'elástico', 'anilha', 'banco',
  'bola', 'esteira', 'bicicleta', 'remo', 'corda', 'outro',
];

const fold = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

describe('EXERCISE_CATALOG', () => {
  it('tem um catálogo enxuto, com ids únicos em kebab-case', () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThanOrEqual(140);
    expect(EXERCISE_CATALOG.length).toBeLessThanOrEqual(180);
    const ids = EXERCISE_CATALOG.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('não repete nome ou apelido entre exercícios', () => {
    const owner = new Map<string, string>();
    for (const exercise of EXERCISE_CATALOG) {
      for (const text of new Set([exercise.name, ...exercise.aliases].map(fold))) {
        expect(owner.get(text) ?? exercise.id, `"${text}"`).toBe(exercise.id);
        owner.set(text, exercise.id);
      }
    }
  });

  it('usa só o vocabulário fixo de músculos, equipamentos e modalidades', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(MODALITIES).toContain(exercise.modality);
      expect(EQUIPMENT).toContain(exercise.equipment);
      expect(exercise.primaryMuscles.length).toBeGreaterThan(0);
      for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) expect(MUSCLES).toContain(muscle);
    }
  });

  it('cobre todos os grupos musculares e as quatro modalidades', () => {
    const muscles = new Set(EXERCISE_CATALOG.flatMap((exercise) => exercise.primaryMuscles));
    for (const muscle of MUSCLES) expect(muscles, muscle).toContain(muscle);
    for (const modality of MODALITIES) {
      expect(EXERCISE_CATALOG.some((exercise) => exercise.modality === modality), modality).toBe(true);
    }
  });

  it('tem de 2 a 5 passos de instrução e imagens coerentes com o sourceId', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.instructions.length).toBeGreaterThanOrEqual(2);
      expect(exercise.instructions.length).toBeLessThanOrEqual(5);
      if (exercise.sourceId === null) expect(exercise.images).toEqual([]);
      for (const image of exercise.images) expect(image.startsWith(`${exercise.sourceId}/`)).toBe(true);
    }
  });
});

describe('getExercise / exerciseImageUrls', () => {
  it('acha pelo id e monta a URL das imagens', () => {
    const bench = getExercise('supino-reto-barra');
    expect(bench?.name).toBe('Supino reto com barra');
    expect(exerciseImageUrls(bench!)[0]).toBe(`${EXERCISE_IMAGE_BASE_URL}Barbell_Bench_Press_-_Medium_Grip/0.jpg`);
    expect(getExercise('nao-existe')).toBeUndefined();
  });
});

describe('searchExercises', () => {
  it('acha as variações de supino, com os nomes que começam pela busca primeiro', () => {
    const results = searchExercises('supino').map((exercise) => exercise.id);
    expect(results).toEqual(expect.arrayContaining(['supino-reto-barra', 'supino-inclinado-halteres', 'supino-fechado']));
    const startingWith = EXERCISE_CATALOG.filter((exercise) => fold(exercise.name).startsWith('supino')).length;
    for (const id of results.slice(0, startingWith)) expect(fold(getExercise(id)!.name)).toMatch(/^supino/);
  });

  it('coloca quem só bate pelo apelido depois de quem bate pelo nome', () => {
    const names = searchExercises('elevação').map((exercise) => exercise.name);
    const byName = names.map((name) => fold(name).startsWith('elevacao'));
    expect(byName).toEqual([...byName].sort((a, b) => Number(b) - Number(a))); // todos os true antes dos false
    expect(byName).toContain(false);
    expect(names).toContain('Ponte de glúteo'); // apelido "elevação pélvica no solo"
  });

  it('ignora acento e maiúsculas e aceita começo de palavras', () => {
    expect(searchExercises('TRICEPS').map((exercise) => exercise.id)).toContain('triceps-testa');
    expect(searchExercises('sup inc').map((exercise) => exercise.id)).toEqual([
      'supino-inclinado-barra',
      'supino-inclinado-halteres',
      'supino-inclinado-maquina',
    ]);
    expect(searchExercises('peck deck')[0]?.id).toBe('voador');
  });

  it('retorna vazio para busca vazia e respeita o limite', () => {
    expect(searchExercises('')).toEqual([]);
    expect(searchExercises('   ')).toEqual([]);
    expect(searchExercises('a', 5)).toHaveLength(5);
  });
});

describe('matchExercise', () => {
  it('reconhece cada nome e apelido do catálogo como exato', () => {
    for (const exercise of EXERCISE_CATALOG) {
      for (const text of [exercise.name, ...exercise.aliases]) {
        expect(matchExercise(text), text).toEqual({ exercise, confidence: 'exact' });
      }
    }
  });

  it.each([
    ['SUPINO RETO C/ BARRA', 'supino-reto-barra'],
    ['Supino inclinado c/ halteres', 'supino-inclinado-halteres'],
    ['Supino c/ Halteres Inclinado', 'supino-inclinado-halteres'],
    ['Supino Reto Máquina', 'supino-maquina'],
    ['Crucifixo máquina', 'voador'],
    ['Puxada Frontal', 'puxada-frente'],
    ['Puxada frente pegada aberta', 'puxada-frente'],
    ['Remada baixa (triângulo)', 'remada-baixa'],
    ['Serrote', 'remada-unilateral'],
    ['Leg 45', 'leg-press-45'],
    ['Leg Press 45 Graus', 'leg-press-45'],
    ['Cadeira Extensora', 'cadeira-extensora'],
    ['Mesa flexora', 'mesa-flexora'],
    ['Stiff c/ barra', 'stiff'],
    ['Stiff com halteres', 'stiff-halteres'],
    ['Agachamento no Smith', 'agachamento-smith'],
    ['Búlgaro', 'agachamento-bulgaro'],
    ['Panturrilha Sentada', 'panturrilha-sentado'],
    ['Rosca Direta Barra W', 'rosca-direta-barra-w'],
    ['Rosca Scott Barra W', 'rosca-scott'],
    ['Triceps Corda', 'triceps-corda'],
    ['Tríceps Pulley', 'triceps-polia-barra'],
    ['Elevação Lateral c/ halteres', 'elevacao-lateral'],
    ['Desenvolvimento c/ halteres', 'desenvolvimento-halteres'],
    ['Abdominal Supra', 'abdominal-supra'],
    ['Cadeira Extensora (drop set)', 'cadeira-extensora'],
  ])('"%s" → %s (exato)', (input, id) => {
    expect(matchExercise(input)).toMatchObject({ exercise: { id }, confidence: 'exact' });
  });

  it.each([
    ['Leg press 45° unilateral', 'leg-press-45'],
    ['Cadeira extensora - drop set', 'cadeira-extensora'],
    ['Rosca direta com halteres alternada', 'rosca-alternada'],
    ['Rosca direta no cabo', 'rosca-polia'],
    ['Supino reto barra pegada fechada', 'supino-fechado'],
    ['Remada curvada supinada c/ barra', 'remada-curvada-supinada'],
    ['Tríceps testa W', 'triceps-testa'],
  ])('"%s" → %s (provável)', (input, id) => {
    expect(matchExercise(input)).toMatchObject({ exercise: { id }, confidence: 'probable' });
  });

  it.each([
    '',
    '   ',
    'asdf qwer',
    'Treino A',
    'Aquecimento 10 min',
    '4x12',
  ])('não inventa match para "%s"', (input) => {
    expect(matchExercise(input)).toBeNull();
  });

  it.each([
    'Supino',
    'Rosca',
    'Crucifixo',
    'Agachamento',
    'Remada',
    'Flexora',
    'Esteira',
    'Desenvolvimento sentado',
    'Supino declinado c/ halteres',
    'Remada curvada no smith',
    'Agachamento livre + panturrilha',
    'Prancha com elevação de perna',
  ])('prefere null a chutar em "%s"', (input) => {
    expect(matchExercise(input)).toBeNull();
  });
});
