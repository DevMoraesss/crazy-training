import { describe, expect, it } from 'vitest';
import { foodAnalysisOutputSchema, foodAnalysisRequestSchema, totalFoodItems } from './food';
import { dailyNutritionReport, EMPTY_NUTRITION_DAY, EMPTY_NUTRITION_TARGETS } from './nutrition';

const meal = { calories: 2250, proteinG: 100, carbsG: 300, fatG: 50 };
const targets = { ...EMPTY_NUTRITION_TARGETS, calories: 2000 };
const complete = {
  ...EMPTY_NUTRITION_DAY,
  complete: true,
  expenditureCalories: 2500,
};
describe('resumo diário sincero', () => {
  it('distingue acima da meta de superávit e não soma exercício novamente', () => {
    const report = dailyNutritionReport([meal], targets, complete);
    expect(report.targetDifference).toBe(250);
    expect(report.energyBalance).toBe(-250);
    expect(report).not.toHaveProperty('fatLost');
  });
  it('mostra saldo positivo para superávit e zero para equilíbrio', () => {
    expect(dailyNutritionReport([{ ...meal, calories: 2800 }], targets, complete).energyBalance).toBe(300);
    expect(dailyNutritionReport([{ ...meal, calories: 2500 }], targets, complete).energyBalance).toBe(0);
  });
  it('não fecha saldo com diário aberto, calorias ausentes ou gasto desconhecido', () => {
    expect(dailyNutritionReport([meal], targets, { ...complete, complete: false }).energyBalance).toBeNull();
    expect(dailyNutritionReport([{ ...meal, calories: null }], targets, complete).energyBalance).toBeNull();
    expect(
      dailyNutritionReport([meal], targets, {
        ...complete,
        expenditureCalories: null,
      }).energyBalance,
    ).toBeNull();
    expect(
      dailyNutritionReport([meal], targets, {
        ...complete,
        expenditureCalories: 0,
      }).energyBalance,
    ).toBeNull();
  });
  it('um diário vazio em aberto não equivale a zero calorias consumidas', () => {
    expect(dailyNutritionReport([], targets, EMPTY_NUTRITION_DAY).calories).toBeNull();
    expect(dailyNutritionReport([], targets, complete).calories).toBe(0);
  });
  it('não transforma soma parcial em total conhecido ou compara com a meta', () => {
    const report = dailyNutritionReport([meal, { ...meal, calories: null }], targets, complete);
    expect(report.total.calories).toBe(2250);
    expect(report.calories).toBeNull();
    expect(report.targetDifference).toBeNull();
    expect(report.status).toBe('incomplete');
  });
});
describe('análise de alimentos', () => {
  it('soma itens revisados preservando nutrientes desconhecidos e zero explícito', () => {
    const items = [
      {
        food: 'Arroz',
        portion: '100 g',
        calories: 130,
        proteinG: 2.5,
        carbsG: 28,
        fatG: 0,
      },
      {
        food: 'Molho',
        portion: 'não informado',
        calories: null,
        proteinG: 0,
        carbsG: null,
        fatG: 0,
      },
    ];
    expect(totalFoodItems(items)).toEqual({
      calories: null,
      proteinG: 2.5,
      carbsG: null,
      fatG: 0,
    });
    expect(totalFoodItems([])).toEqual(EMPTY_NUTRITION_TARGETS);
  });
  it('exige comida identificada para estimar e perguntas para esclarecer', () => {
    const result = {
      status: 'estimated',
      name: 'Almoço',
      summary: 'Estimativa',
      items: [],
      assumptions: [],
      questions: [],
    };
    expect(foodAnalysisOutputSchema.safeParse(result).success).toBe(false);
    expect(foodAnalysisOutputSchema.safeParse({ ...result, status: 'clarification' }).success).toBe(false);
    expect(
      foodAnalysisOutputSchema.safeParse({
        ...result,
        status: 'clarification',
        questions: ['Qual a quantidade?'],
      }).success,
    ).toBe(true);
    expect(foodAnalysisOutputSchema.safeParse({ ...result, status: 'unrecognized' }).success).toBe(true);
  });
  it('exige texto ou imagem e rejeita URLs remotas e tipos de arquivo não suportados', () => {
    const input = {
      description: '',
      image: null,
      context: {
        goal: null,
        preferences: '',
        allergies: '',
        targets: EMPTY_NUTRITION_TARGETS,
      },
    };
    expect(foodAnalysisRequestSchema.safeParse(input).success).toBe(false);
    expect(
      foodAnalysisRequestSchema.safeParse({
        ...input,
        description: 'Arroz, 100 g',
      }).success,
    ).toBe(true);
    expect(
      foodAnalysisRequestSchema.safeParse({
        ...input,
        image: { mimeType: 'image/svg+xml', base64: 'PHN2Zz4=' },
      }).success,
    ).toBe(false);
    expect(
      foodAnalysisRequestSchema.safeParse({
        ...input,
        image: { mimeType: 'image/png', base64: 'https://example.test/image' },
      }).success,
    ).toBe(false);
  });
});
