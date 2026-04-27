export const CHARACTERS = [
  { name: 'Grumpy Cat',          rarity: 'Common',       image: '/images/grumpy_cat.png' },
  { name: 'Sleepy Sloth',        rarity: 'Common',       image: '/images/sleepy_sloth.png' },
  { name: 'Derpy Dog',           rarity: 'Common',       image: '/images/derpy_dog.png' },
  { name: 'Basic Bird',          rarity: 'Common',       image: '/images/basic_bird.png' },
  { name: 'Lazy Lizard',         rarity: 'Common',       image: '/images/lazy_lizard.png' },
  { name: 'Clumsy Chicken',      rarity: 'Common',       image: '/images/clumsy_chicken.png' },
  { name: 'Wobble Worm',         rarity: 'Common',       image: '/images/wobble_worm.png' },
  { name: 'Plain Penguin',       rarity: 'Common',       image: '/images/plain_penguin.png' },
  { name: 'Weird Weasel',        rarity: 'Unusual',      image: null },
  { name: 'Odd Otter',           rarity: 'Unusual',      image: null },
  { name: 'Sneaky Snail',        rarity: 'Uncommon',     image: '/images/sneaky_snail.png' },
  { name: 'Wobbly Walrus',       rarity: 'Uncommon',     image: '/images/wobbly_walrus.png' },
  { name: 'Confused Crab',       rarity: 'Uncommon',     image: '/images/confused_crab.png' },
  { name: 'Funky Frog',          rarity: 'Uncommon',     image: '/images/funky_frog.png' },
  { name: 'Bouncy Bunny',        rarity: 'Uncommon',     image: '/images/bouncy_bunny.png' },
  { name: 'Odd Octopus',         rarity: 'Uncommon',     image: '/images/odd_octopus.png' },
  { name: 'Fancy Flamingo',      rarity: 'Superior',     image: null },
  { name: 'Noble Newt',          rarity: 'Superior',     image: null },
  { name: 'Mysterious Mongoose', rarity: 'Rare',         image: '/images/mysterious_mongoose.png' },
  { name: 'Peculiar Platypus',   rarity: 'Rare',         image: '/images/peculiar_platypus.png' },
  { name: 'Spooky Spider',       rarity: 'Rare',         image: '/images/spooky_spider.png' },
  { name: 'Disco Duck',          rarity: 'Rare',         image: '/images/disco_duck.png' },
  { name: 'Cursed Cat',          rarity: 'Mystic',       image: null },
  { name: 'Haunted Hamster',     rarity: 'Mystic',       image: null },
  { name: 'Galaxy Goat',         rarity: 'Epic',         image: '/images/galaxy_goat.png' },
  { name: 'Turbo Turkey',        rarity: 'Epic',         image: '/images/turbo_turkey.png' },
  { name: 'Neon Narwhal',        rarity: 'Epic',         image: '/images/neon_narwhal.png' },
  { name: 'Fossil Fish',         rarity: 'Ancient',      image: null },
  { name: 'Primordial Pig',      rarity: 'Ancient',      image: null },
  { name: 'Cosmic Capybara',     rarity: 'Legendary',    image: '/images/cosmic_capybara.png' },
  { name: 'The Eternal Egg',     rarity: 'Legendary',    image: '/images/eternal_egg.png' },
  { name: 'Blessed Beetle',      rarity: 'Divine',       image: null },
  { name: 'Sacred Salamander',   rarity: 'Divine',       image: null },
  { name: 'THE ABSOLUTE UNIT',   rarity: 'Mythic',       image: '/images/absolute_unit.png' },
  { name: 'Astral Alpaca',       rarity: 'Celestial',    image: null },
  { name: 'Star Serpent',        rarity: 'Celestial',    image: null },
  { name: 'THE INFINITE VOID',   rarity: 'Transcendent', image: null },
  { name: 'Prismatic Specter',   rarity: 'Ethereal',     image: null },
  { name: 'The Dreaming Atlas',  rarity: 'Ethereal',     image: null },
  { name: 'The Architect',       rarity: 'Cosmic',       image: null },
  { name: 'Event Horizon',       rarity: 'Cosmic',       image: null },
  { name: 'THE OMNIPOTENT',      rarity: 'Omnipotent',   image: null },
  { name: 'THE SINGULARITY',     rarity: 'Singularity',  image: null },
]

// Weighted pool matching server-side weights — used for filler cards in the strip
const WEIGHTS = {
  Common: 50_000_000, Unusual: 25_000_000, Uncommon: 10_000_000, Superior: 5_000_000,
  Rare: 2_000_000, Mystic: 700_000, Epic: 200_000, Ancient: 70_000,
  Legendary: 40_000, Divine: 15_000, Mythic: 10_000, Celestial: 4_000,
  Transcendent: 1_000, Ethereal: 500, Cosmic: 93, Omnipotent: 9, Singularity: 1,
}

const _pool = []
for (const char of CHARACTERS) {
  const w = Math.round((WEIGHTS[char.rarity] ?? 1_000) / 500_000)
  for (let i = 0; i < Math.max(1, w); i++) _pool.push(char)
}

export function randomChar() {
  return _pool[Math.floor(Math.random() * _pool.length)]
}

// O(1) lookup: character name → { name, rarity, image }
export const CHAR_MAP = Object.fromEntries(CHARACTERS.map(c => [c.name, c]))
