import { useState } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useColors } from '@/theme';

type FieldRowProps = {
  label: string;
  value: string;
  /** Chamado ao sair do campo, com o texto final. */
  onCommit: (text: string) => void;
  placeholder?: string;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
};

/** Linha de formulário do iOS: rótulo à esquerda, campo alinhado à direita. Salva ao sair do campo. */
export function FieldRow({ label, value, onCommit, placeholder, suffix, keyboardType }: FieldRowProps) {
  const colors = useColors();
  const [text, setText] = useState(value);
  const [savedValue, setSavedValue] = useState(value);

  // Se o valor salvo mudar por fora (outra tela), o campo acompanha.
  if (value !== savedValue) {
    setSavedValue(value);
    setText(value);
  }

  return (
    <View className="min-h-[52px] flex-row items-center gap-3 px-5">
      <Text className="shrink-0 text-body text-label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="flex-1 py-3 text-right text-body text-label"
        value={text}
        onChangeText={setText}
        onBlur={() => {
          if (text !== value) onCommit(text);
        }}
        onSubmitEditing={() => {
          if (text !== value) onCommit(text);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors['label-tertiary']}
        keyboardType={keyboardType}
        returnKeyType="done"
        selectTextOnFocus
      />
      {suffix ? <Text className="text-body text-label-secondary">{suffix}</Text> : null}
    </View>
  );
}
