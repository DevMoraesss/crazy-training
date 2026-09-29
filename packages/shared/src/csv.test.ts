import { describe, expect, it } from 'vitest';

import { parseCsvRows, parseProgramCsv, serializeProgramCsv } from './csv';

const CSV = `treino,foco,exercicio,series,repeticoes,carga_kg,descanso_s,observacoes
Treino A,"Peito, ombro e tríceps",Supino reto com barra,4,10,40,90,
Treino A,,Crucifixo na máquina,3,8-12,,60,"Segurar 1 s no alongamento"
Treino B,Costas e bíceps,Barra fixa,3,falha,,120,
Treino B,,Prancha,3,30s,,45,
`;

describe('parseProgramCsv', () => {
  it('agrupa exercícios por treino, na ordem do arquivo', () => {
    const result = parseProgramCsv(CSV, { name: 'Hipertrofia' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [a, b] = result.program.workouts;
    expect(result.program.source).toBe('csv');
    expect(result.program.formatVersion).toBe(1);
    expect(a?.name).toBe('Treino A');
    expect(a?.focus).toBe('Peito, ombro e tríceps');
    expect(a?.exercises).toHaveLength(2);
    expect(a?.exercises[0]).toEqual({
      name: 'Supino reto com barra',
      sets: 4,
      reps: { type: 'fixed', value: 10 },
      loadKg: 40,
      restSeconds: 90,
    });
    expect(a?.exercises[1]?.reps).toEqual({ type: 'range', min: 8, max: 12 });
    expect(a?.exercises[1]?.notes).toBe('Segurar 1 s no alongamento');
    expect(b?.exercises[0]?.reps).toEqual({ type: 'failure' });
    expect(b?.exercises[1]?.reps).toEqual({ type: 'time', seconds: 30 });
  });

  it('aceita o CSV do Excel em pt-BR: ponto e vírgula, vírgula decimal, acentos e BOM', () => {
    const excel = '﻿Treino;Exercício;Séries;Repetições;Carga (kg);Descanso\r\nA;Agachamento livre;4;8 a 10;22,5;1:30\r\n';
    const result = parseProgramCsv(excel, { name: 'Pernas' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.program.workouts[0]?.exercises[0]).toMatchObject({
      name: 'Agachamento livre',
      reps: { type: 'range', min: 8, max: 10 },
      loadKg: 22.5,
      restSeconds: 90,
    });
  });

  it('aponta a linha de cada problema', () => {
    const broken = `treino,exercicio,series,repeticoes,carga_kg
A,Supino,quatro,10,
A,Remada,3,muitas,
A,Rosca,3,10,pesado
`;
    const result = parseProgramCsv(broken, { name: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.line)).toEqual([2, 3, 4]);
    expect(result.issues[0]?.message).toContain('séries');
    expect(result.issues[1]?.message).toContain('"muitas"');
    expect(result.issues[2]?.message).toContain('"pesado"');
  });

  it('recusa arquivo sem as colunas obrigatórias', () => {
    const result = parseProgramCsv('nome,carga\nSupino,40\n', { name: 'x' });
    expect(result).toEqual({
      ok: false,
      issues: [{ line: 1, message: 'Faltam as colunas: treino, exercicio, series, repeticoes.' }],
    });
  });

  it('recusa arquivo vazio', () => {
    expect(parseProgramCsv('', { name: 'x' }).ok).toBe(false);
  });
});

describe('serializeProgramCsv', () => {
  it('exporta e reimporta sem perder nada', () => {
    const first = parseProgramCsv(CSV, { name: 'Hipertrofia' });
    if (!first.ok) throw new Error('CSV de exemplo inválido');

    const again = parseProgramCsv(serializeProgramCsv(first.program), { name: 'Hipertrofia' });
    expect(again).toEqual(first);
  });
});

describe('parseCsvRows', () => {
  it('lida com aspas escapadas e quebra de linha dentro de aspas', () => {
    expect(parseCsvRows('a,"dizia ""ok""","linha 1\nlinha 2"\n', ',')).toEqual([
      ['a', 'dizia "ok"', 'linha 1\nlinha 2'],
    ]);
  });
});
