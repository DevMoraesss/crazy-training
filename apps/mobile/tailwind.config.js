const { platformSelect } = require('nativewind/theme');

const tokens = require('./src/theme/tokens.json');

/**
 * Visual nativo do iOS: cores do sistema (claro e escuro), escala tipográfica da Apple
 * e SF Pro Rounded nos números de treino. Regras de uso: .claude/skills/ios-nativo/SKILL.md
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Cada cor aponta para a variável que src/theme troca entre claro e escuro.
      colors: Object.fromEntries(Object.keys(tokens.light).map((name) => [name, `var(--color-${name})`])),
      // Estilos de texto do iOS (Human Interface Guidelines): tamanho e altura de linha.
      fontSize: {
        'large-title': ['34px', '41px'],
        title1: ['28px', '34px'],
        title2: ['22px', '28px'],
        title3: ['20px', '25px'],
        headline: ['17px', '22px'],
        body: ['17px', '22px'],
        callout: ['16px', '21px'],
        subhead: ['15px', '20px'],
        footnote: ['13px', '18px'],
        caption: ['12px', '16px'],
        metric: ['64px', '72px'],
      },
      fontFamily: {
        // SF Pro Rounded, como nos números do app Fitness. Fora do iOS, a fonte padrão.
        rounded: platformSelect({ ios: 'ui-rounded', android: 'sans-serif', default: 'ui-rounded, system-ui, sans-serif' }),
      },
    },
  },
  plugins: [],
};
