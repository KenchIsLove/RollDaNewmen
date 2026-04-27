export const RARITY_TEXT = {
  Common:       'text-gray-400',
  Unusual:      'text-slate-300',
  Uncommon:     'text-green-400',
  Superior:     'text-cyan-400',
  Rare:         'text-blue-400',
  Mystic:       'text-teal-400',
  Epic:         'text-purple-400',
  Ancient:      'text-amber-500',
  Legendary:    'text-yellow-400',
  Divine:       'text-orange-400',
  Mythic:       'text-red-400',
  Celestial:    'text-pink-400',
  Transcendent: 'text-white',
  Ethereal:     'text-sky-200',
  Cosmic:       'text-violet-300',
  Omnipotent:   'text-yellow-200',
  Singularity:  'text-amber-50',
}

export const RARITY_BORDER = {
  Common:       'border-gray-600',
  Unusual:      'border-slate-500',
  Uncommon:     'border-green-600',
  Superior:     'border-cyan-600',
  Rare:         'border-blue-600',
  Mystic:       'border-teal-600',
  Epic:         'border-purple-600',
  Ancient:      'border-amber-600',
  Legendary:    'border-yellow-500',
  Divine:       'border-orange-500',
  Mythic:       'border-red-500',
  Celestial:    'border-pink-500',
  Transcendent: 'border-white',
  Ethereal:     'border-sky-300',
  Cosmic:       'border-violet-400',
  Omnipotent:   'border-yellow-300',
  Singularity:  'border-amber-100',
}

export const RARITY_BG = {
  Common:       'bg-gray-400/10',
  Unusual:      'bg-slate-400/10',
  Uncommon:     'bg-green-400/10',
  Superior:     'bg-cyan-400/10',
  Rare:         'bg-blue-400/10',
  Mystic:       'bg-teal-400/10',
  Epic:         'bg-purple-400/10',
  Ancient:      'bg-amber-500/10',
  Legendary:    'bg-yellow-400/10',
  Divine:       'bg-orange-400/10',
  Mythic:       'bg-red-400/10',
  Celestial:    'bg-pink-400/10',
  Transcendent: 'bg-white/10',
  Ethereal:     'bg-sky-400/10',
  Cosmic:       'bg-violet-400/10',
  Omnipotent:   'bg-yellow-200/10',
  Singularity:  'bg-amber-50/10',
}

export const rarityText   = r => RARITY_TEXT[r]   ?? 'text-gray-400'
export const rarityBorder = r => RARITY_BORDER[r]  ?? 'border-gray-600'
export const rarityBg     = r => RARITY_BG[r]      ?? 'bg-gray-400/10'
