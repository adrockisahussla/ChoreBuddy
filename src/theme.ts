// Design system — derived from the Figma styleguide at fileKey
// OTfDhkdrS55om8JpNboz4Z, frame "Improve screen design".
// Brand gradient: purple → pink → red. Light theme with white cards.

export const theme = {
  colors: {
    // Page background. `bg` is a flat solid (pink-tinted off-white) used
    // as a fallback before the real LinearGradient component lands.
    bg: '#fdf2f8',
    bgGradient: ['#faf5ff', '#fdf2f8', '#fef2f2'] as const,

    // Cards / surfaces
    card: '#ffffff',
    cardBorder: '#f3e8ff',
    cardBorderHover: '#e9d5ff',

    // Brand / accent. `accent` is the middle stop of the brand gradient
    // so it reads correctly when used as a flat fill (e.g. pill active,
    // primary button). Real gradient components should use `brandGradient`.
    accent: '#f6339a',
    accentText: '#ffffff',
    brandGradient: ['#ad46ff', '#f6339a', '#fb2c36'] as const,

    // Text
    text: '#1a1a2e',
    muted: '#7c7c8a',
    mutedDark: '#525261',

    // Status
    success: '#22c55e',
    successSoft: '#dcfce7',
    danger: '#fb2c36',
    dangerSoft: '#ffe4e6',
    warning: '#f59e0b',
    warningSoft: '#fef3c7',
    blue: '#3b82f6',
    blueSoft: '#dbeafe',
    purple: '#ad46ff',
    purpleSoft: '#f3e8ff',

    // Per-buddy accents
    k1: '#a855f7',
    k2: '#fb923c',

    // Difficulty badges
    easy: '#fbbf24',
    medium: '#f97316',
    hard: '#ef4444',

    overlay: 'rgba(15,17,23,0.5)',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  text: {
    h1: { fontSize: 24, fontWeight: '700' as const },
    h2: { fontSize: 20, fontWeight: '700' as const },
    h3: { fontSize: 18, fontWeight: '700' as const },
    label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    meta: { fontSize: 14, fontWeight: '500' as const },
    tiny: { fontSize: 12, fontWeight: '500' as const },
  },
  shadow: {
    // Subtle elevation for white cards on light bg
    card: {
      shadowColor: '#a855f7',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    button: {
      shadowColor: '#f6339a',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  },
};
