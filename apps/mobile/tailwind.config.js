const tokens = require('./src/theme/tokens.json');

/**
 * Identidade "lambe-lambe": cada treino é um cartaz de papel fluorescente colado num muro
 * de concreto, com tinta preta e letra condensada. Os valores vêm de src/theme/tokens.json,
 * a mesma fonte que o código usa quando precisa da cor em JS (SVG, sombras).
 * Regras de uso: .claude/skills/lambe-lambe/SKILL.md
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: Object.fromEntries(Object.entries(tokens.fonts).map(([name, family]) => [name, [family]])),
    },
  },
  plugins: [],
};
