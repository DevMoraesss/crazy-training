import { EmptyState } from '@/components/ui/empty-state';

export default function HistoryScreen() {
  return (
    <EmptyState
      symbol={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }}
      title="Sem histórico ainda"
      description="Cada série que você concluir aparece aqui, com a carga e as repetições de cada semana."
    />
  );
}
