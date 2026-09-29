import type { Equipment, Goal, Level } from '@crazy-training/shared';

// Textos de interface das opções do perfil, centralizados para a tradução futura.

export const GOAL_OPTIONS: readonly { value: Goal; label: string; description: string }[] = [
  { value: 'hypertrophy', label: 'Ganhar massa muscular', description: 'Hipertrofia' },
  { value: 'strength', label: 'Ficar mais forte', description: 'Força' },
  { value: 'fat-loss', label: 'Emagrecer', description: 'Perder gordura mantendo os músculos' },
  { value: 'conditioning', label: 'Condicionamento', description: 'Fôlego e disposição' },
];

export const LEVEL_OPTIONS: readonly { value: Level; label: string }[] = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
];

export const EQUIPMENT_OPTIONS: readonly { value: Equipment; label: string }[] = [
  { value: 'gym', label: 'Academia' },
  { value: 'home', label: 'Casa' },
  { value: 'outdoor', label: 'Ao ar livre' },
];
