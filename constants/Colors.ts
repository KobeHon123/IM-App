export const Colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    primary: '#3B82F6',
    secondary: '#14B8A6',
    accent: '#8B5CF6',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    primary: '#60A5FA',
    secondary: '#34D399',
    accent: '#A78BFA',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: '#475569',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  }
};

export type ColorScheme = keyof typeof Colors;