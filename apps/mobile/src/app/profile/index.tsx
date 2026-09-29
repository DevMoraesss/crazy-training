import { EmptyState } from '@/components/ui/empty-state';

export default function ProfileScreen() {
  return (
    <EmptyState
      symbol={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
      title="Complete seu perfil"
      description="Peso, altura, objetivo e equipamento disponível. É daqui que saem as calorias e os treinos gerados."
    />
  );
}
