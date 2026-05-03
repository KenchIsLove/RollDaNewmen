// Profile theme presets — only used to accent the profile page.
// `primary` is the main accent color (display title, section underline),
// `secondary` is used for gradients/swatches, `glow` is an rgba shadow color.

export const THEMES = {
  midnight: {
    label:     'Midnight',
    primary:   '#818cf8',
    secondary: '#6366f1',
    glow:      'rgba(99, 102, 241, 0.45)',
  },
  sunset: {
    label:     'Sunset',
    primary:   '#fb923c',
    secondary: '#ec4899',
    glow:      'rgba(251, 146, 60, 0.45)',
  },
  forest: {
    label:     'Forest',
    primary:   '#10b981',
    secondary: '#14b8a6',
    glow:      'rgba(16, 185, 129, 0.45)',
  },
  cherry: {
    label:     'Cherry',
    primary:   '#ef4444',
    secondary: '#ec4899',
    glow:      'rgba(239, 68, 68, 0.45)',
  },
  ocean: {
    label:     'Ocean',
    primary:   '#3b82f6',
    secondary: '#06b6d4',
    glow:      'rgba(59, 130, 246, 0.45)',
  },
  gold: {
    label:     'Gold',
    primary:   '#f59e0b',
    secondary: '#fbbf24',
    glow:      'rgba(245, 158, 11, 0.45)',
  },
}

export const DEFAULT_THEME = 'midnight'

export function getTheme(name) {
  return THEMES[name] || THEMES[DEFAULT_THEME]
}
