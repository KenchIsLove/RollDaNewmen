// Flat rarity colors. One strong solid hue per tier — no glow, no gradient.
// Hex values are the source of truth; Tailwind class helpers reference the
// closest matching tailwind-500 (or named) color so utility classes stay valid.

export const RARITY_HEX = {
  Common:       '#6b7280',
  Unusual:      '#9ca3af',
  Uncommon:     '#22c55e',
  Superior:     '#14b8a6',
  Rare:         '#3b82f6',
  Mystic:       '#06b6d4',
  Epic:         '#eab308',
  Ancient:      '#f97316',
  Legendary:    '#ef4444',
  Divine:       '#fbbf24',
  Mythic:       '#a855f7',
  Celestial:    '#ec4899',
  Transcendent: '#f0abfc',
  Ethereal:     '#38bdf8',
  Cosmic:       '#818cf8',
  Omnipotent:   '#fde047',
  Singularity:  '#ffffff',
}

export const RARITY_TEXT = {
  Common:       'text-gray-500',
  Unusual:      'text-gray-400',
  Uncommon:     'text-green-500',
  Superior:     'text-teal-500',
  Rare:         'text-blue-500',
  Mystic:       'text-cyan-500',
  Epic:         'text-yellow-500',
  Ancient:      'text-orange-500',
  Legendary:    'text-red-500',
  Divine:       'text-amber-400',
  Mythic:       'text-purple-500',
  Celestial:    'text-pink-500',
  Transcendent: 'text-fuchsia-300',
  Ethereal:     'text-sky-400',
  Cosmic:       'text-indigo-400',
  Omnipotent:   'text-yellow-300',
  Singularity:  'text-white',
}

export const RARITY_BORDER = {
  Common:       'border-gray-500',
  Unusual:      'border-gray-400',
  Uncommon:     'border-green-500',
  Superior:     'border-teal-500',
  Rare:         'border-blue-500',
  Mystic:       'border-cyan-500',
  Epic:         'border-yellow-500',
  Ancient:      'border-orange-500',
  Legendary:    'border-red-500',
  Divine:       'border-amber-400',
  Mythic:       'border-purple-500',
  Celestial:    'border-pink-500',
  Transcendent: 'border-fuchsia-300',
  Ethereal:     'border-sky-400',
  Cosmic:       'border-indigo-400',
  Omnipotent:   'border-yellow-300',
  Singularity:  'border-white',
}

// Subtle flat-tinted background (very low opacity, no gradient, no blur).
export const RARITY_BG = {
  Common:       'bg-gray-500/5',
  Unusual:      'bg-gray-400/5',
  Uncommon:     'bg-green-500/8',
  Superior:     'bg-teal-500/8',
  Rare:         'bg-blue-500/10',
  Mystic:       'bg-cyan-500/10',
  Epic:         'bg-yellow-500/10',
  Ancient:      'bg-orange-500/10',
  Legendary:    'bg-red-500/10',
  Divine:       'bg-amber-400/10',
  Mythic:       'bg-purple-500/10',
  Celestial:    'bg-pink-500/10',
  Transcendent: 'bg-fuchsia-300/10',
  Ethereal:     'bg-sky-400/10',
  Cosmic:       'bg-indigo-400/10',
  Omnipotent:   'bg-yellow-300/10',
  Singularity:  'bg-white/10',
}

export const rarityHex    = r => RARITY_HEX[r]    ?? '#6b7280'
export const rarityText   = r => RARITY_TEXT[r]   ?? 'text-gray-500'
export const rarityBorder = r => RARITY_BORDER[r] ?? 'border-gray-500'
export const rarityBg     = r => RARITY_BG[r]     ?? 'bg-gray-500/5'
