"""Run once to generate placeholder images in images/ — replace with real art anytime."""
import pygame, os, math

pygame.init()

CHARS = [
    ("grumpy_cat",          (180, 80,  80),  "😾"),
    ("sleepy_sloth",        (140, 120, 80),  "🦥"),
    ("derpy_dog",           (200, 160, 80),  "🐶"),
    ("basic_bird",          (80,  160, 200), "🐦"),
    ("lazy_lizard",         (80,  180, 80),  "🦎"),
    ("clumsy_chicken",      (220, 180, 60),  "🐔"),
    ("wobble_worm",         (180, 120, 100), "🪱"),
    ("plain_penguin",       (100, 120, 160), "🐧"),
    ("sneaky_snail",        (60,  100, 220), "🐌"),
    ("wobbly_walrus",       (80,  130, 220), "🦭"),
    ("confused_crab",       (220, 80,  60),  "🦀"),
    ("funky_frog",          (60,  200, 80),  "🐸"),
    ("bouncy_bunny",        (220, 160, 200), "🐰"),
    ("odd_octopus",         (120, 60,  200), "🐙"),
    ("mysterious_mongoose", (80,  60,  180), "🦦"),
    ("peculiar_platypus",   (60,  140, 160), "🦆"),
    ("spooky_spider",       (100, 50,  120), "🕷"),
    ("disco_duck",          (200, 100, 220), "🦢"),
    ("galaxy_goat",         (140, 40,  200), "🐐"),
    ("turbo_turkey",        (220, 100, 40),  "🦃"),
    ("neon_narwhal",        (40,  200, 220), "🐬"),
    ("cosmic_capybara",     (220, 160, 20),  "🦫"),
    ("eternal_egg",         (240, 200, 60),  "🥚"),
    ("absolute_unit",       (220, 30,  30),  "🐋"),
]

SIZE = 128
OUT = "images"

font_big = None
for fname in ["segoeuiemoji","notocoloremoji","symbola","unifont","dejavusans"]:
    try:
        f = pygame.font.SysFont(fname, 70)
        f.render("🎲", True, (0,0,0))
        font_big = f
        break
    except Exception:
        pass
if font_big is None:
    font_big = pygame.font.SysFont(None, 70)

font_letter = pygame.font.SysFont("arial", 52, bold=True)

for slug, color, emoji in CHARS:
    path = os.path.join(OUT, f"{slug}.png")
    surf = pygame.Surface((SIZE, SIZE), pygame.SRCALPHA)

    # Background circle
    r, g, b = color
    pygame.draw.circle(surf, (r, g, b, 230), (SIZE//2, SIZE//2), SIZE//2 - 4)
    pygame.draw.circle(surf, (255,255,255,120), (SIZE//2, SIZE//2), SIZE//2 - 4, 3)

    # Inner highlight
    pygame.draw.circle(surf, (255,255,255,40), (SIZE//2 - 8, SIZE//2 - 10), SIZE//4)

    # Try emoji, fallback to first letter
    rendered = False
    try:
        es = font_big.render(emoji, True, (255,255,255))
        if es.get_width() > 8:
            surf.blit(es, (SIZE//2 - es.get_width()//2, SIZE//2 - es.get_height()//2))
            rendered = True
    except Exception:
        pass

    if not rendered:
        initial = slug[0].upper()
        ls = font_letter.render(initial, True, (255, 255, 255))
        surf.blit(ls, (SIZE//2 - ls.get_width()//2, SIZE//2 - ls.get_height()//2))

    pygame.image.save(surf, path)
    print(f"  saved {path}")

print("Done. Replace any file in images/ with real art (128x128 PNG recommended).")
pygame.quit()
