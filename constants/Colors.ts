export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;

  text: string;
  textStrong: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  white: string;

  border: string;
  borderSubtle: string;
  borderStrong: string;

  primary: string;
  primaryText: string;
  primaryStrongText: string;
  primarySoft: string;
  primaryMuted: string;
  primaryBorder: string;

  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  dangerStrong: string;

  warningSoft: string;
  warningStrong: string;

  successSoft: string;
  successStrong: string;

  pinkSoft: string;
}

const light: ThemeColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  surfaceStrong: '#E5E7EB',

  text: '#111827',
  textStrong: '#374151',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textDisabled: '#D1D5DB',
  white: '#FFFFFF',

  border: '#E5E7EB',
  borderSubtle: '#F3F4F6',
  borderStrong: '#D1D5DB',

  primary: '#2563EB',
  primaryText: '#2563EB',
  primaryStrongText: '#1E40AF',
  primarySoft: '#EFF6FF',
  primaryMuted: '#DBEAFE',
  primaryBorder: '#BFDBFE',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  dangerBorder: '#FECACA',
  dangerStrong: '#991B1B',

  warningSoft: '#FEF3C7',
  warningStrong: '#78350F',

  successSoft: '#D1FAE5',
  successStrong: '#065F46',

  pinkSoft: '#FCE7F3',
};

const dark: ThemeColors = {
  background: '#000000',
  surface: '#121212',
  surfaceMuted: '#1C1C1E',
  surfaceStrong: '#2C2C2E',

  text: '#F5F5F5',
  textStrong: '#D4D4D8',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textDisabled: '#52525B',
  white: '#FFFFFF',

  border: '#2C2C2E',
  borderSubtle: '#1F1F21',
  borderStrong: '#3A3A3C',

  primary: '#3B82F6',
  primaryText: '#60A5FA',
  primaryStrongText: '#93C5FD',
  primarySoft: '#0B1A33',
  primaryMuted: '#10264A',
  primaryBorder: '#1E3A6E',

  danger: '#F87171',
  dangerSoft: '#2A1215',
  dangerBorder: '#6B1D1D',
  dangerStrong: '#FCA5A5',

  warningSoft: '#2A1A05',
  warningStrong: '#FCD34D',

  successSoft: '#052E22',
  successStrong: '#6EE7B7',

  pinkSoft: '#3B0A1F',
};

export const Colors = { light, dark };

export type ColorScheme = keyof typeof Colors;
