import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SectionProps = {
  title?: string;
  footer?: string;
  /** Recuo da linha divisória, alinhado ao início do texto das linhas. */
  separatorInset?: number;
  children: ReactNode;
};

/** Lista agrupada do iOS (inset grouped): cartão branco com linhas separadas por fio. */
export function Section({ title, footer, separatorInset = 20, children }: SectionProps) {
  const rows = Children.toArray(children);

  return (
    <View>
      {title ? (
        <Text accessibilityRole="header" className="mx-5 mb-2 text-title3 font-semibold text-label">
          {title}
        </Text>
      ) : null}
      <View className="mx-4 overflow-hidden rounded-[26px] bg-surface" style={{ borderCurve: 'continuous' }}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View className="bg-separator" style={{ height: StyleSheet.hairlineWidth, marginLeft: separatorInset }} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text className="mx-5 mt-2 text-footnote text-label-secondary">{footer}</Text> : null}
    </View>
  );
}
