import {
  foodAnalysisRequestSchema,
  foodAnalysisSchema,
  type FoodAnalysisRequest,
} from '@crazy-training/shared';
import { apiRequest } from './api';

export async function analyzeFood(input: FoodAnalysisRequest) {
  const response = await apiRequest('/food/analyze', {
    method: 'POST',
    body: JSON.stringify(foodAnalysisRequestSchema.parse(input)),
    signal: AbortSignal.timeout(75_000),
  });
  return foodAnalysisSchema.parse(response);
}
