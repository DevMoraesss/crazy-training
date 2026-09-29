import { EmptyState } from '@/components/ui/empty-state';

export default function WorkoutsScreen() {
  return (
    <EmptyState
      symbol={{ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }}
      title="Nenhum treino ainda"
      description="Importe de um PDF ou planilha, monte do zero ou escolha um modelo pronto."
    />
  );
}
