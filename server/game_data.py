"""
Server-side RNG. All rolls are generated here — never trust the client.

Weights are scaled ×1000 from the original to allow ultra-rare tiers with
weights smaller than 1 of the old scale.
"""
import random

RARITIES: dict[str, dict] = {
    # ── Base tiers (weights ×1000 vs original) ─────────────────────────────
    "Common":       {"weight": 50_000_000, "coins":          1},
    "Unusual":      {"weight": 25_000_000, "coins":          3},
    "Uncommon":     {"weight": 10_000_000, "coins":         10},
    "Superior":     {"weight":  5_000_000, "coins":         50},
    "Rare":         {"weight":  2_000_000, "coins":        100},
    "Mystic":       {"weight":    700_000, "coins":        300},
    "Epic":         {"weight":    200_000, "coins":      1_000},
    "Ancient":      {"weight":     70_000, "coins":      3_500},
    "Legendary":    {"weight":     40_000, "coins":     10_000},
    "Divine":       {"weight":     15_000, "coins":     35_000},
    "Mythic":       {"weight":     10_000, "coins":    100_000},
    "Celestial":    {"weight":      4_000, "coins":    300_000},
    "Transcendent": {"weight":      1_000, "coins":  1_000_000},
    # ── Ultra-rare tiers ───────────────────────────────────────────────────
    "Ethereal":     {"weight":        500, "coins":  2_500_000},  # ~1 in 186,000
    "Cosmic":       {"weight":         93, "coins":  8_000_000},  # ~1 in 1,000,000
    "Omnipotent":   {"weight":          9, "coins": 25_000_000},  # ~1 in 10,000,000
    "Singularity":  {"weight":          1, "coins":100_000_000},  # ~1 in 93,000,000
}

RARE_THRESHOLD_WEIGHT = RARITIES["Rare"]["weight"]

RARITY_SCORES: dict[str, int] = {
    "Common":       1,
    "Unusual":      2,
    "Uncommon":     5,
    "Superior":     10,
    "Rare":         25,
    "Mystic":       71,
    "Epic":         250,
    "Ancient":      714,
    "Legendary":    1_250,
    "Divine":       3_333,
    "Mythic":       5_000,
    "Celestial":    12_500,
    "Transcendent": 50_000,
    "Ethereal":     100_000,
    "Cosmic":       500_000,
    "Omnipotent":   2_000_000,
    "Singularity":  10_000_000,
}

# (name, rarity, description)
CHARS: list[tuple[str, str, str]] = [
    # ── Common ──────────────────────────────────────────────────────────────
    ("Grumpy Cat",           "Common",       "Perpetually annoyed"),
    ("Sleepy Sloth",         "Common",       "Has napped for 3 days"),
    ("Derpy Dog",            "Common",       "Chased its own tail"),
    ("Basic Bird",           "Common",       "Tweets without thinking"),
    ("Lazy Lizard",          "Common",       "Sunbathing champion"),
    ("Clumsy Chicken",       "Common",       "Can't cross the road"),
    ("Wobble Worm",          "Common",       "No legs, still confident"),
    ("Plain Penguin",        "Common",       "Lives in the wrong climate"),
    # ── Unusual ─────────────────────────────────────────────────────────────
    ("Weird Weasel",         "Unusual",      "Perpetually confused"),
    ("Odd Otter",            "Unusual",      "Slides for no reason"),
    # ── Uncommon ────────────────────────────────────────────────────────────
    ("Sneaky Snail",         "Uncommon",     "Slowly plotting revenge"),
    ("Wobbly Walrus",        "Uncommon",     "Balance: 2/10"),
    ("Confused Crab",        "Uncommon",     "Goes sideways on purpose"),
    ("Funky Frog",           "Uncommon",     "Ribbit goes hard"),
    ("Bouncy Bunny",         "Uncommon",     "Has 200 children"),
    ("Odd Octopus",          "Uncommon",     "8 arms, 0 direction"),
    # ── Superior ────────────────────────────────────────────────────────────
    ("Fancy Flamingo",       "Superior",     "Too good for standing"),
    ("Noble Newt",           "Superior",     "Self-proclaimed royalty"),
    # ── Rare ────────────────────────────────────────────────────────────────
    ("Mysterious Mongoose",  "Rare",         "Knows too much"),
    ("Peculiar Platypus",    "Rare",         "Evolution's mistake"),
    ("Spooky Spider",        "Rare",         "8 eyes, 0 social life"),
    ("Disco Duck",           "Rare",         "Born to boogie"),
    # ── Mystic ──────────────────────────────────────────────────────────────
    ("Cursed Cat",           "Mystic",       "Knows your search history"),
    ("Haunted Hamster",      "Mystic",       "Runs on a wheel to nowhere"),
    # ── Epic ────────────────────────────────────────────────────────────────
    ("Galaxy Goat",          "Epic",         "Plays 5D chess"),
    ("Turbo Turkey",         "Epic",         "GOBBLE AT MACH 5"),
    ("Neon Narwhal",         "Epic",         "Unicorn of the deep"),
    # ── Ancient ─────────────────────────────────────────────────────────────
    ("Fossil Fish",          "Ancient",      "Older than time itself"),
    ("Primordial Pig",       "Ancient",      "Invented mud"),
    # ── Legendary ───────────────────────────────────────────────────────────
    ("Cosmic Capybara",      "Legendary",    "Lord of all creatures"),
    ("The Eternal Egg",      "Legendary",    "It contains everything"),
    # ── Divine ──────────────────────────────────────────────────────────────
    ("Blessed Beetle",       "Divine",       "All prayers go through it"),
    ("Sacred Salamander",    "Divine",       "Touched by the universe"),
    # ── Mythic ──────────────────────────────────────────────────────────────
    ("THE ABSOLUTE UNIT",    "Mythic",       "1 in 9,304 — IT IS HERE"),
    # ── Celestial ───────────────────────────────────────────────────────────
    ("Astral Alpaca",        "Celestial",    "Exists on all planes at once"),
    ("Star Serpent",         "Celestial",    "The galaxy is its home"),
    # ── Transcendent ────────────────────────────────────────────────────────
    ("THE INFINITE VOID",    "Transcendent", "It is everything. It is nothing."),
    # ── Ethereal ─ ~1 in 186,000 ────────────────────────────────────────────
    ("Prismatic Specter",    "Ethereal",     "Refracts light into raw emotion"),
    ("The Dreaming Atlas",   "Ethereal",     "Has mapped every dream in existence"),
    # ── Cosmic ─ ~1 in 1,000,000 ────────────────────────────────────────────
    ("The Architect",        "Cosmic",       "Sneezed once and created the Milky Way"),
    ("Event Horizon",        "Cosmic",       "You have already been absorbed"),
    # ── Omnipotent ─ ~1 in 10,000,000 ───────────────────────────────────────
    ("THE OMNIPOTENT",       "Omnipotent",   "It stopped counting the universes it has built"),
    # ── Singularity ─ ~1 in 93,000,000 ──────────────────────────────────────
    ("THE SINGULARITY",      "Singularity",  "Before the Big Bang. After the heat death. It simply is."),
]

CHAR_MAP: dict[str, tuple[str, str, str]] = {c[0]: c for c in CHARS}

_RARITY_ORDER = list(RARITIES.keys())
_RARITY_POOL: dict[str, list[tuple[str, str, str]]] = {}
for _c in CHARS:
    _RARITY_POOL.setdefault(_c[1], []).append(_c)


def _build_weights(luck_level: int) -> list[int]:
    result = []
    for rname in _RARITY_ORDER:
        w = RARITIES[rname]["weight"]
        if rname == "Common":
            # Scale the luck reduction to match the ×1000 weight increase
            w = max(w // 10, w - 2_000_000 * luck_level)
        result.append(w)
    return result


def server_roll(luck_level: int = 0) -> tuple[str, str, str]:
    """Return (name, rarity, description). Generated server-side only."""
    weights = _build_weights(luck_level)
    total = sum(weights)
    pick = random.randint(1, total)
    cumulative = 0
    for rname, w in zip(_RARITY_ORDER, weights):
        cumulative += w
        if pick <= cumulative:
            pool = _RARITY_POOL.get(rname) or CHARS
            return random.choice(pool)
    return random.choice(CHARS)


def luck_upgrade_price(level: int) -> int:
    return 500 * (2 ** level)


def speed_upgrade_price(level: int) -> int:
    return 500 * (2 ** level)
