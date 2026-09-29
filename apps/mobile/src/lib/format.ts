const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** "Segunda, 28 de setembro": mais curto que o Intl ("segunda-feira, …") para caber no topo. */
export function formatDayHeading(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

/** "Hoje", "Ontem" ou "Segunda, 28 de setembro". */
export function formatRelativeDay(date: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return formatDayHeading(date);
}

export function formatTime(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Relógio de timer: "1:24". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Tempo de treino corrido: "12:40" ou "1:02:05". */
export function formatElapsed(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** Duração em texto: "52 min" ou "1 h 5 min". */
export function formatDuration(milliseconds: number): string {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}

/** Número com vírgula decimal e ponto de milhar: 37,5 e 12.450. */
export function formatNumber(value: number, fractionDigits = 1): string {
  const [integer = '0', fraction] = (Math.round(value * 10 ** fractionDigits) / 10 ** fractionDigits)
    .toFixed(fractionDigits)
    .split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction && Number(fraction) !== 0 ? `${grouped},${fraction.replace(/0+$/, '')}` : grouped;
}

export function formatKg(value: number): string {
  return `${formatNumber(value)} kg`;
}

/** Lê "22,5" ou "22.5". Vazio vira null; texto inválido vira undefined. */
export function parseDecimalInput(text: string): number | null | undefined {
  const value = text.trim().replace(',', '.');
  if (value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Segunda-feira da semana da data, à meia-noite. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}
