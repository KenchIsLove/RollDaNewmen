import pygame
import random
import math
import sys
import os
import json
from characters import CHARS

pygame.init()

# ── Logical canvas ────────────────────────────────────────────────────────────
LOGI_W, LOGI_H = 1050, 660
_logi_surf = pygame.Surface((LOGI_W, LOGI_H))
_fullscreen = False


def _make_screen(fullscreen):
    if fullscreen:
        return pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
    return pygame.display.set_mode((LOGI_W, LOGI_H), pygame.RESIZABLE)


screen = _make_screen(_fullscreen)
pygame.display.set_caption("Roll Da Newman")
clock = pygame.time.Clock()


def toggle_fullscreen():
    global screen, _fullscreen
    _fullscreen = not _fullscreen
    screen = _make_screen(_fullscreen)


def _viewport():
    """Return (scale, dest_w, dest_h, offset_x, offset_y) maintaining aspect ratio."""
    sw, sh = screen.get_size()
    scale  = min(sw / LOGI_W, sh / LOGI_H)
    dw, dh = int(LOGI_W * scale), int(LOGI_H * scale)
    return scale, dw, dh, (sw - dw) // 2, (sh - dh) // 2


def blit_logical():
    sw, sh = screen.get_size()
    if (sw, sh) == (LOGI_W, LOGI_H):
        screen.blit(_logi_surf, (0, 0))
    else:
        _, dw, dh, ox, oy = _viewport()
        screen.fill((0, 0, 0))
        screen.blit(pygame.transform.smoothscale(_logi_surf, (dw, dh)), (ox, oy))
    pygame.display.flip()


def logical_mouse():
    mx, my = pygame.mouse.get_pos()
    sw, sh = screen.get_size()
    if (sw, sh) == (LOGI_W, LOGI_H):
        return mx, my
    scale, _, _, ox, oy = _viewport()
    lx = int((mx - ox) / scale)
    ly = int((my - oy) / scale)
    return max(0, min(LOGI_W, lx)), max(0, min(LOGI_H, ly))


# ── Fonts ─────────────────────────────────────────────────────────────────────
def _load_font(names, size, bold=False):
    for n in names:
        try:
            return pygame.font.SysFont(n, size, bold=bold)
        except Exception:
            pass
    return pygame.font.SysFont(None, size, bold=bold)


TITLE_FONT = _load_font(["impact", "arialbold", "arial"], 50, bold=True)
LG_FONT    = _load_font(["arial", "helvetica", None], 30, bold=True)
MED_FONT   = _load_font(["arial", "helvetica", None], 24, bold=True)
SM_FONT    = _load_font(["arial", "helvetica", None], 17)
XS_FONT    = _load_font(["arial", "helvetica", None], 13)

# ── Rarity table ──────────────────────────────────────────────────────────────
RARITIES = {
    "Common":       {"color": (165, 185, 200), "weight": 50_000, "coins":          1},
    "Unusual":      {"color": ( 80, 200, 170), "weight": 25_000, "coins":          3},
    "Uncommon":     {"color": ( 60, 110, 255), "weight": 10_000, "coins":         10},
    "Superior":     {"color": (255, 145,  30), "weight":  5_000, "coins":         50},
    "Rare":         {"color": (115,  45, 210), "weight":  2_000, "coins":        100},
    "Mystic":       {"color": (  0, 200, 255), "weight":    700, "coins":        300},
    "Epic":         {"color": (215,  45, 175), "weight":    200, "coins":      1_000},
    "Ancient":      {"color": (200, 140,  40), "weight":     70, "coins":      3_500},
    "Legendary":    {"color": (255, 170,  20), "weight":     40, "coins":     10_000},
    "Divine":       {"color": (200, 200, 255), "weight":     15, "coins":     35_000},
    "Mythic":       {"color": (240,  30,  30), "weight":     10, "coins":    100_000},
    "Celestial":    {"color": ( 50, 255, 200), "weight":      4, "coins":    300_000},
    "Transcendent": {"color": (255, 255,  80), "weight":      1, "coins":  1_000_000},
}
TOTAL_WEIGHT = sum(r["weight"] for r in RARITIES.values())

# ── Image loading ─────────────────────────────────────────────────────────────
_IMAGE_CACHE: dict = {}
_IMG_DIR       = os.path.join(os.path.dirname(__file__), "images")
_CARD_IMG_SIZE = (108, 98)    # strip card
_INV_IMG_SIZE  = (138, 126)   # inventory card (larger)


def load_char_image(filename: str | None, size=_CARD_IMG_SIZE):
    if not filename:
        return None
    key = (filename, size)
    if key in _IMAGE_CACHE:
        return _IMAGE_CACHE[key]
    path = os.path.join(_IMG_DIR, filename)
    if not os.path.isfile(path):
        _IMAGE_CACHE[key] = None
        return None
    try:
        raw = pygame.image.load(path).convert_alpha()
        _IMAGE_CACHE[key] = pygame.transform.smoothscale(raw, size)
    except Exception:
        _IMAGE_CACHE[key] = None
    return _IMAGE_CACHE[key]


# ── Characters ────────────────────────────────────────────────────────────────
RARITY_CHARS: dict = {}
for _c in CHARS:
    RARITY_CHARS.setdefault(_c[1], []).append(_c)

for _c in CHARS:
    load_char_image(_c[3], _CARD_IMG_SIZE)
    load_char_image(_c[3], _INV_IMG_SIZE)


def _luck_price(level: int) -> int:
    return 500 * (2 ** level)


def _speed_price(level: int) -> int:
    return 500 * (2 ** level)


def _spin_secs(speed_level: int) -> float:
    return max(1.5, SPIN_SECS - 0.5 * speed_level)


def _build_weights(luck_level: int = 0) -> list[int]:
    result = []
    for rname, rdata in RARITIES.items():
        w = rdata["weight"]
        if rname == "Common":
            floor = rdata["weight"] // 10
            w = max(floor, rdata["weight"] - 2000 * luck_level)
        result.append(w)
    return result


def _common_pct(level: int) -> float:
    weights = _build_weights(level)
    return 100 * weights[0] / sum(weights)


def weighted_random(luck_level: int = 0):
    weights = _build_weights(luck_level)
    total   = sum(weights)
    roll    = random.randint(1, total)
    cum     = 0
    for (rname, _), w in zip(RARITIES.items(), weights):
        cum += w
        if roll <= cum:
            pool = RARITY_CHARS.get(rname)
            return random.choice(pool) if pool else random.choice(CHARS)
    return random.choice(CHARS)


# ── Strip constants ───────────────────────────────────────────────────────────
CARD_W    = 155
CARD_H    = 155
CARD_GAP  = 10
CARD_STEP = CARD_W + CARD_GAP
STRIP_H   = 178
STRIP_Y   = LOGI_H // 2 - STRIP_H // 2 - 30   # slightly above centre
STRIP_LEN = 75
RESULT_IDX = 63
SPIN_SECS  = 6.5


def build_strip(result, luck_level: int = 0):
    strip = [weighted_random(luck_level) for _ in range(STRIP_LEN)]
    strip[RESULT_IDX] = result
    return strip


# ── Inventory layout ──────────────────────────────────────────────────────────
INV_CARD_W   = 175
INV_CARD_H   = 198
INV_GAP      = 14
INV_COLS     = 5
INV_SIDE_PAD = (LOGI_W - (INV_COLS * INV_CARD_W + (INV_COLS - 1) * INV_GAP)) // 2
INV_TOP      = 98     # top of scrollable viewport (below header)cd
INV_BOT      = LOGI_H - 68
INV_VP_H     = INV_BOT - INV_TOP
INV_ROW_H    = INV_CARD_H + INV_GAP


# ── Pre-baked fades ───────────────────────────────────────────────────────────
def _make_horiz_fade(w, h, l2r):
    s = pygame.Surface((w, h), pygame.SRCALPHA)
    for i in range(w):
        a = int(255 * (i / w)) if l2r else int(255 * (1 - i / w))
        pygame.draw.line(s, (10, 10, 20, a), (i, 0), (i, h))
    return s


def _make_vert_fade(w, h, t2b):
    s = pygame.Surface((w, h), pygame.SRCALPHA)
    for i in range(h):
        a = int(255 * (i / h)) if t2b else int(255 * (1 - i / h))
        pygame.draw.line(s, (8, 8, 16, a), (0, i), (w, i))
    return s


_LEFT_FADE    = _make_horiz_fade(200, STRIP_H, False)
_RIGHT_FADE   = _make_horiz_fade(200, STRIP_H, True)
_INV_TOP_FADE = _make_vert_fade(LOGI_W, 24, False)
_INV_BOT_FADE = _make_vert_fade(LOGI_W, 24, True)


# ── Particles ─────────────────────────────────────────────────────────────────
class Particle:
    __slots__ = ("x", "y", "vx", "vy", "life", "decay", "color", "size")

    def __init__(self, x, y, color):
        self.x, self.y = float(x), float(y)
        angle = random.uniform(0, math.tau)
        speed = random.uniform(2, 9)
        self.vx    = math.cos(angle) * speed
        self.vy    = math.sin(angle) * speed - random.uniform(2, 5)
        self.life  = 1.0
        self.decay = random.uniform(0.008, 0.022)
        self.color = color
        self.size  = random.randint(3, 8)

    def update(self):
        self.x  += self.vx
        self.y  += self.vy
        self.vy += 0.18
        self.life -= self.decay

    def draw(self, surf):
        pygame.draw.circle(surf, self.color, (int(self.x), int(self.y)), self.size)


# ── Save / load ───────────────────────────────────────────────────────────────
_SAVE_FILE = os.path.join(os.path.dirname(__file__), "save.json")


def _save(inventory: dict, coins: int, luck_level: int, speed_level: int):
    with open(_SAVE_FILE, "w") as f:
        json.dump({"inventory": inventory, "coins": coins,
                   "luck_level": luck_level, "speed_level": speed_level}, f)


def _load() -> tuple[dict, int, int, int]:
    # also handles the old flat-inventory format
    if not os.path.isfile(_SAVE_FILE):
        legacy = os.path.join(os.path.dirname(__file__), "inventory.json")
        if os.path.isfile(legacy):
            try:
                with open(legacy) as f:
                    return json.load(f), 0, 0, 0
            except Exception:
                pass
        return {}, 0, 0, 0
    try:
        with open(_SAVE_FILE) as f:
            data = json.load(f)
        if "inventory" in data:
            return (data["inventory"], int(data.get("coins", 0)),
                    int(data.get("luck_level", 0)), int(data.get("speed_level", 0)))
        return data, 0, 0, 0  # legacy flat format
    except Exception:
        return {}, 0, 0, 0


# ── Glow helper ───────────────────────────────────────────────────────────────
def draw_glow_rect(surf, x, y, w, h, color, layers=10):
    for i in range(layers, 0, -1):
        a  = int(35 * i / layers)
        gs = pygame.Surface((w + i * 4, h + i * 4), pygame.SRCALPHA)
        pygame.draw.rect(gs, (color[0], color[1], color[2], a),
                         (0, 0, w + i*4, h + i*4), border_radius=12 + i)
        surf.blit(gs, (x - i*2, y - i*2))


def _centre_text(surf, font, text, color, cx, y):
    """Render text centred on cx. Returns the surface width."""
    ts = font.render(text, True, color)
    surf.blit(ts, (cx - ts.get_width() // 2, y))
    return ts.get_width()


# ── Main game ─────────────────────────────────────────────────────────────────
class Game:
    IDLE      = 0
    SPINNING  = 1
    REVEAL    = 2
    INVENTORY = 3
    SHOP      = 4

    def __init__(self):
        self.state     = self.IDLE
        self.strip     = []
        self.result    = None
        self.strip_x   = 0.0
        self.start_x   = 0.0
        self.end_x     = 0.0
        self.spin_t    = 0.0
        self.reveal_t  = 0.0
        self.bg_flash  = 0.0
        self.shimmer_t = 0.0
        self.particles: list[Particle] = []
        self.history   = []

        self.inventory, self.coins, self.luck_level, self.speed_level = _load()
        self.inv_scroll    = 0
        self.inv_content_h = 0
        self._prev_state   = self.IDLE
        self._inv_cache: pygame.Surface | None = None
        self._inv_dirty    = True
        self.auto_roll     = False

    # ── Spin ──────────────────────────────────────────────────────────────────
    def start_spin(self):
        self.result   = weighted_random(self.luck_level)
        self.strip    = build_strip(self.result, self.luck_level)
        self.state    = self.SPINNING
        self.spin_t   = 0.0
        self.reveal_t = 0.0
        self.particles.clear()
        self.start_x  = LOGI_W // 2 - 4 * CARD_STEP - CARD_W // 2
        self.end_x    = LOGI_W // 2 - RESULT_IDX * CARD_STEP - CARD_W // 2
        self.strip_x  = self.start_x

    def open_inventory(self):
        self._prev_state = self.state
        self.state = self.INVENTORY
        self.inv_scroll = 0

    def close_inventory(self):
        self.state = self._prev_state

    def open_shop(self):
        self._prev_state = self.state
        self.state = self.SHOP

    def close_shop(self):
        self.state = self._prev_state

    def try_buy_luck(self):
        price = _luck_price(self.luck_level)
        if self.coins >= price:
            self.coins      -= price
            self.luck_level += 1
            _save(self.inventory, self.coins, self.luck_level, self.speed_level)

    def try_buy_speed(self):
        price = _speed_price(self.speed_level)
        if self.coins >= price:
            self.coins       -= price
            self.speed_level += 1
            _save(self.inventory, self.coins, self.luck_level, self.speed_level)

    # ── Update ────────────────────────────────────────────────────────────────
    @staticmethod
    def _ease_out_quint(t):
        return 1 - (1 - t) ** 5

    def update(self, dt):
        if self.state == self.SPINNING:
            self.spin_t += dt / _spin_secs(self.speed_level)
            if self.spin_t >= 1.0:
                self.spin_t  = 1.0
                self.strip_x = self.end_x
                self.state   = self.REVEAL
                self.reveal_t = 0.0
                self.bg_flash = 1.0
                self.shimmer_t = 0.0
                self._on_reveal()
            else:
                ease = self._ease_out_quint(self.spin_t)
                self.strip_x = self.start_x + (self.end_x - self.start_x) * ease

        if self.state == self.REVEAL:
            self.reveal_t  += dt * 1.2
            self.bg_flash   = max(0.0, self.bg_flash - dt * 1.8)
            self.shimmer_t += dt * 2.0
            if self.auto_roll and self.reveal_t >= 2.5:
                self.start_spin()

        for p in self.particles:
            p.update()
        self.particles = [p for p in self.particles if p.life > 0]

    def _on_reveal(self):
        cx = LOGI_W // 2
        cy = STRIP_Y + STRIP_H // 2
        rc = RARITIES[self.result[1]]["color"]
        for _ in range(180):
            self.particles.append(Particle(cx, cy, rc))
        self.history.append(self.result)
        name, rarity = self.result[0], self.result[1]
        self.inventory[name] = self.inventory.get(name, 0) + 1
        self.coins += RARITIES[rarity]["coins"]
        self._inv_dirty = True
        _save(self.inventory, self.coins, self.luck_level, self.speed_level)

    def scroll_inventory(self, delta):
        max_scroll = max(0, self.inv_content_h - INV_VP_H)
        self.inv_scroll = max(0, min(self.inv_scroll - delta * 32, max_scroll))

    # =========================================================================
    # Drawing — strip
    # =========================================================================

    def _draw_card(self, surf, char, x, y, highlighted=False):
        name, rarity, _d, img_file = char
        rc  = RARITIES[rarity]["color"]
        img = load_char_image(img_file, _CARD_IMG_SIZE)

        if highlighted:
            draw_glow_rect(surf, x, y, CARD_W, CARD_H, rc, layers=12)

        bg = (50, 50, 78) if highlighted else (38, 38, 60)
        pygame.draw.rect(surf, bg, (x, y, CARD_W, CARD_H), border_radius=10)
        pygame.draw.rect(surf, rc, (x, y, CARD_W, CARD_H),
                         4 if highlighted else 3, border_radius=10)

        if highlighted and self.state == self.REVEAL:
            sa = int(abs(math.sin(self.shimmer_t)) * 55)
            sh_surf = pygame.Surface((CARD_W, CARD_H), pygame.SRCALPHA)
            sh_surf.fill((rc[0], rc[1], rc[2], sa))
            surf.blit(sh_surf, (x, y))
            pygame.draw.rect(surf, rc, (x, y, CARD_W, CARD_H), 4, border_radius=10)

        if img:
            surf.blit(img, (x + CARD_W // 2 - img.get_width() // 2, y + 9))
        else:
            ls = MED_FONT.render(name[0], True, rc)
            surf.blit(ls, (x + CARD_W//2 - ls.get_width()//2, y + 30))

        # Name — truncate only if genuinely too wide
        short = name
        while XS_FONT.size(short)[0] > CARD_W - 8 and len(short) > 1:
            short = short[:-2] + "…"
        _centre_text(surf, XS_FONT, short, (215, 215, 235), x + CARD_W//2, y + CARD_H - 34)
        _centre_text(surf, XS_FONT, rarity, rc, x + CARD_W//2, y + CARD_H - 19)

    def _draw_strip(self, surf):
        pygame.draw.rect(surf, (22, 22, 40), (0, STRIP_Y, LOGI_W, STRIP_H))
        saved = surf.get_clip()
        surf.set_clip(pygame.Rect(0, STRIP_Y, LOGI_W, STRIP_H))
        card_y = STRIP_Y + STRIP_H // 2 - CARD_H // 2
        for i, char in enumerate(self.strip):
            cx = int(self.strip_x) + i * CARD_STEP
            if cx + CARD_W < 0 or cx > LOGI_W:
                continue
            self._draw_card(surf, char, cx, card_y,
                            highlighted=(i == RESULT_IDX and self.state == self.REVEAL))
        surf.set_clip(saved)
        surf.blit(_LEFT_FADE,  (0, STRIP_Y))
        surf.blit(_RIGHT_FADE, (LOGI_W - 200, STRIP_Y))
        mx = LOGI_W // 2
        pygame.draw.rect(surf, (255, 60, 60), (mx - 2, STRIP_Y, 4, STRIP_H))
        pygame.draw.polygon(surf, (255, 60, 60),
                            [(mx-8, STRIP_Y), (mx+8, STRIP_Y), (mx, STRIP_Y+14)])
        pygame.draw.polygon(surf, (255, 60, 60),
                            [(mx-8, STRIP_Y+STRIP_H), (mx+8, STRIP_Y+STRIP_H),
                             (mx, STRIP_Y+STRIP_H-14)])

    # ── Result panel ──────────────────────────────────────────────────────────
    def _draw_result_panel(self, surf):
        name, rarity, desc, _ = self.result
        rc    = RARITIES[rarity]["color"]
        e     = 1 - (1 - min(1.0, self.reveal_t)) ** 3
        slide = int((1 - e) * 20)

        # Base y: just below the strip
        py = STRIP_Y + STRIP_H + 14

        # Rarity  •  odds  (one compact line)
        odds_val  = TOTAL_WEIGHT // RARITIES[rarity]["weight"]
        top_line  = f"{rarity.upper()}   •   ~1 / {odds_val}"
        _centre_text(surf, SM_FONT, top_line, rc, LOGI_W // 2, py)

        # Character name — scale font down if name is very wide
        name_surf = TITLE_FONT.render(name, True, (255, 255, 255))
        if name_surf.get_width() > LOGI_W - 40:
            # Render with SM_FONT as fallback for very long names
            name_surf = MED_FONT.render(name, True, (255, 255, 255))
        surf.blit(name_surf,
                  (LOGI_W // 2 - name_surf.get_width() // 2, py + 28 + slide))

        # Description
        desc_y = py + 28 + name_surf.get_height() + 8 + slide
        _centre_text(surf, SM_FONT, f'"{desc}"', (160, 160, 205), LOGI_W // 2, desc_y)

        # Coins earned
        earned = RARITIES[rarity]["coins"]
        _centre_text(surf, SM_FONT, f"+ {earned:,} coins", (255, 210, 50),
                     LOGI_W // 2, desc_y + 22)

    # ── Buttons ───────────────────────────────────────────────────────────────
    # All bottom buttons share a vertical centre so they look aligned despite
    # the open button being taller.
    _BTN_CY = LOGI_H - 38          # shared vertical centre
    _GAP    = 14                    # gap between buttons

    def _open_button_rect(self):    # big centre button
        w, h = 250, 60
        return pygame.Rect(LOGI_W // 2 - w // 2, self._BTN_CY - h // 2, w, h)

    def _shop_button_rect(self):    # left of open
        w, h = 175, 50
        x = LOGI_W // 2 - 125 - self._GAP - w
        return pygame.Rect(x, self._BTN_CY - h // 2, w, h)

    def _inv_button_rect(self):     # right of open
        w, h = 175, 50
        x = LOGI_W // 2 + 125 + self._GAP
        return pygame.Rect(x, self._BTN_CY - h // 2, w, h)

    def _auto_btn_rect(self):
        w, h = 160, 34
        open_top = self._BTN_CY - 30   # top of the open button
        y = open_top - 8 - h
        return pygame.Rect(LOGI_W // 2 - w // 2, y, w, h)

    def _back_button_rect(self):
        w, h = 180, 50
        return pygame.Rect(LOGI_W // 2 - w // 2, self._BTN_CY - h // 2, w, h)

    def _luck_buy_rect(self):
        cx = LOGI_W // 2
        return pygame.Rect(cx - 230 + 15, 390, 190, 46)

    def _speed_buy_rect(self):
        cx = LOGI_W // 2
        return pygame.Rect(cx + 10 + 15, 390, 190, 46)

    def _draw_button(self, surf, rect, label, bg, border,
                     text_col=(255, 255, 255), font=None):
        lmx, lmy = logical_mouse()
        hover    = rect.collidepoint(lmx, lmy)
        r, g, b  = bg
        if hover:
            r, g, b = min(r+22, 255), min(g+22, 255), min(b+22, 255)
        pygame.draw.rect(surf, (r, g, b), rect, border_radius=9)
        pygame.draw.rect(surf, border, rect, 2, border_radius=9)
        f  = font or MED_FONT
        ls = f.render(label, True, text_col)
        surf.blit(ls, (rect.centerx - ls.get_width()//2,
                       rect.centery - ls.get_height()//2))

    def _draw_main_buttons(self, surf):
        # Auto roll toggle
        if self.auto_roll:
            auto_bg, auto_bdr, auto_txt = (30, 150, 60), (100, 255, 140), (200, 255, 210)
            auto_label = "AUTO ROLL: ON"
        else:
            auto_bg, auto_bdr, auto_txt = (50, 50, 70), (110, 110, 150), (170, 170, 200)
            auto_label = "AUTO ROLL: OFF"
        self._draw_button(surf, self._auto_btn_rect(), auto_label,
                          auto_bg, auto_bdr, auto_txt, font=SM_FONT)

        label = "OPEN CASE" if self.state == self.IDLE else "OPEN AGAIN"
        self._draw_button(surf, self._open_button_rect(), label,
                          (55, 185, 75), (160, 240, 160), (0, 0, 0), font=LG_FONT)
        self._draw_button(surf, self._shop_button_rect(), "SHOP",
                          (120, 60, 160), (200, 120, 255))
        self._draw_button(surf, self._inv_button_rect(), "INVENTORY",
                          (40, 60, 140), (110, 130, 240))

    # ── Shop screen ───────────────────────────────────────────────────────────
    def _draw_shop(self, surf):
        surf.fill((8, 8, 16))
        _centre_text(surf, TITLE_FONT, "SHOP", (255, 200, 50), LOGI_W // 2, 14)

        coin_surf = SM_FONT.render(f"Coins: {self.coins:,}", True, (255, 210, 50))
        surf.blit(coin_surf, (LOGI_W - coin_surf.get_width() - 14, 18))

        cx  = LOGI_W // 2
        cw  = 220   # each card width
        lx  = cx - 230   # left card x
        rx  = cx + 10    # right card x (lx + cw + 20)
        lcx = lx + cw // 2   # left card centre x
        rcx = rx + cw // 2   # right card centre x

        # ── Lucky Charm card ──────────────────────────────────────────────────
        luck_rc   = (180, 100, 255)
        luck_card = pygame.Rect(lx, 100, cw, 310)
        pygame.draw.rect(surf, (28, 22, 45), luck_card, border_radius=12)
        pygame.draw.rect(surf, luck_rc,      luck_card, 2, border_radius=12)

        _centre_text(surf, MED_FONT, "LUCKY CHARM", luck_rc, lcx, 118)
        _centre_text(surf, SM_FONT,  "Reduces Common drop chance,",
                     (160, 160, 210), lcx, 152)
        _centre_text(surf, SM_FONT,  "making rarer items more likely.",
                     (160, 160, 210), lcx, 174)

        cur_pct  = _common_pct(self.luck_level)
        next_pct = _common_pct(self.luck_level + 1)
        _centre_text(surf, SM_FONT, f"Luck Level: {self.luck_level}",
                     (220, 220, 255), lcx, 212)
        _centre_text(surf, XS_FONT,
                     f"Common: {cur_pct:.1f}%  →  {next_pct:.1f}%",
                     (140, 140, 200), lcx, 236)

        luck_price    = _luck_price(self.luck_level)
        luck_afford   = self.coins >= luck_price
        luck_price_c  = (255, 210, 50) if luck_afford else (160, 80, 80)
        _centre_text(surf, SM_FONT, f"Cost: {luck_price:,} coins",
                     luck_price_c, lcx, 268)

        luck_buy = self._luck_buy_rect()
        self._draw_button(surf, luck_buy, "UPGRADE",
                          (100, 50, 140) if luck_afford else (50, 40, 60),
                          (200, 120, 255) if luck_afford else (90, 70, 110),
                          (255, 255, 255) if luck_afford else (120, 100, 130))

        # ── Speed Boost card ──────────────────────────────────────────────────
        spd_rc   = (50, 200, 255)
        spd_card = pygame.Rect(rx, 100, cw, 310)
        pygame.draw.rect(surf, (16, 26, 40), spd_card, border_radius=12)
        pygame.draw.rect(surf, spd_rc,       spd_card, 2, border_radius=12)

        _centre_text(surf, MED_FONT, "SPEED BOOST", spd_rc, rcx, 118)
        _centre_text(surf, SM_FONT,  "Reduces the roll animation",
                     (160, 210, 230), rcx, 152)
        _centre_text(surf, SM_FONT,  "time for faster openings.",
                     (160, 210, 230), rcx, 174)

        cur_secs  = _spin_secs(self.speed_level)
        next_secs = _spin_secs(self.speed_level + 1)
        _centre_text(surf, SM_FONT, f"Speed Level: {self.speed_level}",
                     (220, 240, 255), rcx, 212)
        _centre_text(surf, XS_FONT,
                     f"Roll time: {cur_secs:.1f}s  →  {next_secs:.1f}s",
                     (140, 180, 200), rcx, 236)

        spd_price   = _speed_price(self.speed_level)
        spd_afford  = self.coins >= spd_price
        spd_price_c = (255, 210, 50) if spd_afford else (160, 80, 80)
        _centre_text(surf, SM_FONT, f"Cost: {spd_price:,} coins",
                     spd_price_c, rcx, 268)

        spd_buy = self._speed_buy_rect()
        self._draw_button(surf, spd_buy, "UPGRADE",
                          (20, 100, 140) if spd_afford else (30, 45, 55),
                          (80, 200, 255) if spd_afford else (50, 80, 100),
                          (255, 255, 255) if spd_afford else (100, 130, 140))

        self._draw_button(surf, self._back_button_rect(), "BACK",
                          (40, 60, 140), (110, 130, 240))

    # ── Side panels ───────────────────────────────────────────────────────────
    def _draw_odds_panel(self, surf):
        px = 18
        py = STRIP_Y + STRIP_H + 16
        surf.blit(SM_FONT.render("ODDS", True, (180, 180, 230)), (px, py))
        dy = 24
        for rname, rdata in RARITIES.items():
            odds = TOTAL_WEIGHT // rdata["weight"]
            surf.blit(XS_FONT.render(f"{rname}  1/{odds}", True, rdata["color"]),
                      (px, py + dy))
            dy += 15

    def _draw_history(self, surf):
        if not self.history:
            return
        px = LOGI_W - 210
        py = STRIP_Y + STRIP_H + 16
        surf.blit(SM_FONT.render("RECENT", True, (180, 180, 230)), (px, py))
        for i, (name, rarity, _d, _f) in enumerate(self.history[-8:][::-1]):
            rc    = RARITIES[rarity]["color"]
            label = name if XS_FONT.size(name)[0] <= 195 else name[:18] + "…"
            surf.blit(XS_FONT.render(label, True, rc), (px, py + 24 + i * 20))

    # =========================================================================
    # Inventory screen
    # =========================================================================

    def _build_inv_content(self) -> pygame.Surface:
        owned = sorted(
            [c for c in CHARS if self.inventory.get(c[0], 0) > 0],
            key=lambda c: RARITIES[c[1]]["weight"]
        )
        rows    = max(1, math.ceil(len(owned) / INV_COLS))
        total_h = max(rows * INV_ROW_H + 16, INV_VP_H + 1)
        content = pygame.Surface((LOGI_W, total_h))
        content.fill((8, 8, 16))

        for i, char in enumerate(owned):
            col    = i % INV_COLS
            row    = i // INV_COLS
            cx     = INV_SIDE_PAD + col * (INV_CARD_W + INV_GAP)
            card_y = 10 + row * INV_ROW_H
            self._draw_inv_card(content, char, cx, card_y, self.inventory[char[0]])

        return content

    def _draw_inv_card(self, surf, char, x, y, count: int):
        name, rarity, _d, img_file = char
        rc  = RARITIES[rarity]["color"]
        img = load_char_image(img_file, _INV_IMG_SIZE)

        pygame.draw.rect(surf, (40, 40, 62), (x, y, INV_CARD_W, INV_CARD_H), border_radius=10)
        pygame.draw.rect(surf, rc,            (x, y, INV_CARD_W, INV_CARD_H), 2, border_radius=10)

        # Art
        if img:
            surf.blit(img, (x + INV_CARD_W//2 - img.get_width()//2, y + 10))
        else:
            ls = MED_FONT.render(name[0], True, rc)
            surf.blit(ls, (x + INV_CARD_W//2 - ls.get_width()//2, y + 30))

        # Name — measure and truncate only if needed
        short = name
        while XS_FONT.size(short)[0] > INV_CARD_W - 10 and len(short) > 1:
            short = short[:-2] + "…"
        _centre_text(surf, XS_FONT, short,  (215, 215, 235), x + INV_CARD_W//2,
                     y + INV_CARD_H - 32)
        _centre_text(surf, XS_FONT, rarity, rc,              x + INV_CARD_W//2,
                     y + INV_CARD_H - 17)

        # Count badge
        badge = XS_FONT.render(f"×{count}", True, (0, 0, 0))
        bw    = badge.get_width() + 8
        bx    = x + INV_CARD_W - bw - 4
        pygame.draw.rect(surf, rc, (bx, y + 4, bw, 17), border_radius=4)
        surf.blit(badge, (bx + 4, y + 5))

    def _draw_scrollbar(self, surf, max_scroll: int):
        if max_scroll <= 0:
            return
        bx = LOGI_W - 10
        bh = INV_VP_H
        pygame.draw.rect(surf, (28, 28, 48), (bx, INV_TOP, 6, bh), border_radius=3)
        thumb_h = max(28, int(bh * INV_VP_H / self.inv_content_h))
        thumb_y = INV_TOP + int((bh - thumb_h) * self.inv_scroll / max(1, max_scroll))
        pygame.draw.rect(surf, (90, 90, 150), (bx, thumb_y, 6, thumb_h), border_radius=3)

    def _draw_inventory(self, surf):
        surf.fill((8, 8, 16))

        # Header
        _centre_text(surf, TITLE_FONT, "INVENTORY", (255, 200, 50), LOGI_W // 2, 12)

        unlocked    = sum(1 for c in CHARS if self.inventory.get(c[0], 0) > 0)
        total_rolls = sum(self.inventory.values())
        prog_text   = f"{unlocked} / {len(CHARS)} collected   •   {total_rolls} rolls"
        _centre_text(surf, SM_FONT, prog_text, (130, 130, 170), LOGI_W // 2, 64)

        coin_surf = SM_FONT.render(f"Coins: {self.coins:,}", True, (255, 210, 50))
        surf.blit(coin_surf, (LOGI_W - coin_surf.get_width() - 14, 18))

        # Progress bar
        bx, bw, bh = LOGI_W//2 - 180, 360, 7
        by = 84
        pygame.draw.rect(surf, (28, 28, 48), (bx, by, bw, bh), border_radius=3)
        fw = int(bw * unlocked / len(CHARS))
        if fw:
            pygame.draw.rect(surf, (80, 185, 80), (bx, by, fw, bh), border_radius=3)

        # Rebuild content surface only when dirty
        if self._inv_dirty or self._inv_cache is None:
            self._inv_cache    = self._build_inv_content()
            self._inv_dirty    = False
            self.inv_content_h = self._inv_cache.get_height()

        max_scroll      = max(0, self.inv_content_h - INV_VP_H)
        self.inv_scroll = max(0, min(self.inv_scroll, max_scroll))

        saved = surf.get_clip()
        surf.set_clip(pygame.Rect(0, INV_TOP, LOGI_W, INV_VP_H))
        surf.blit(self._inv_cache, (0, INV_TOP), (0, self.inv_scroll, LOGI_W, INV_VP_H))
        surf.set_clip(saved)

        surf.blit(_INV_TOP_FADE, (0, INV_TOP))
        surf.blit(_INV_BOT_FADE, (0, INV_BOT - 24))

        self._draw_scrollbar(surf, max_scroll)

        # Empty state
        if not self.inventory:
            _centre_text(surf, MED_FONT, "Nothing here yet — open some cases!",
                         (80, 80, 110), LOGI_W // 2, LOGI_H // 2 - 12)

        self._draw_button(surf, self._back_button_rect(), "BACK",
                          (40, 60, 140), (110, 130, 240))

    # ── Main draw dispatcher ──────────────────────────────────────────────────
    def draw(self):
        s = _logi_surf

        if self.state == self.INVENTORY:
            self._draw_inventory(s)
            blit_logical()
            return

        if self.state == self.SHOP:
            self._draw_shop(s)
            blit_logical()
            return

        # Background flash on reveal
        br, bg_, bb = 10, 10, 20
        if self.bg_flash > 0 and self.result:
            rc  = RARITIES[self.result[1]]["color"]
            f   = self.bg_flash * 0.28
            br  = min(255, int(br  + rc[0] * f))
            bg_ = min(255, int(bg_ + rc[1] * f))
            bb  = min(255, int(bb  + rc[2] * f))
        s.fill((br, bg_, bb))

        _centre_text(s, TITLE_FONT, "ROLL DA NEWMAN", (255, 200, 50), LOGI_W // 2, 14)
        coin_surf = SM_FONT.render(f"Coins: {self.coins:,}", True, (255, 210, 50))
        s.blit(coin_surf, (LOGI_W - coin_surf.get_width() - 14, 18))

        if self.state in (self.SPINNING, self.REVEAL):
            self._draw_strip(s)
        else:
            pygame.draw.rect(s, (22, 22, 40), (0, STRIP_Y, LOGI_W, STRIP_H))
            _centre_text(s, MED_FONT, "Open a case to get started",
                         (130, 130, 190), LOGI_W // 2, STRIP_Y + STRIP_H//2 - 14)

        for p in self.particles:
            p.draw(s)

        if self.state == self.REVEAL:
            self._draw_result_panel(s)

        if self.state in (self.IDLE, self.REVEAL):
            self._draw_main_buttons(s)

        self._draw_odds_panel(s)
        self._draw_history(s)

        blit_logical()


# ── Main loop ─────────────────────────────────────────────────────────────────
def main():
    game = Game()
    while True:
        dt = clock.tick(60) / 1000.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    if game.state == Game.INVENTORY:
                        game.close_inventory()
                    elif game.state == Game.SHOP:
                        game.close_shop()
                    else:
                        pygame.quit()
                        sys.exit()
                elif event.key == pygame.K_F11:
                    toggle_fullscreen()
                elif event.key == pygame.K_i:
                    if game.state == Game.INVENTORY:
                        game.close_inventory()
                    elif game.state not in (Game.SPINNING, Game.SHOP):
                        game.open_inventory()
                elif event.key == pygame.K_s:
                    if game.state == Game.SHOP:
                        game.close_shop()
                    elif game.state not in (Game.SPINNING, Game.INVENTORY):
                        game.open_shop()
                elif event.key == pygame.K_SPACE:
                    if game.state in (Game.IDLE, Game.REVEAL):
                        game.start_spin()

            elif event.type == pygame.MOUSEWHEEL:
                if game.state == Game.INVENTORY:
                    game.scroll_inventory(event.y)

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                lmx, lmy = logical_mouse()
                if game.state == Game.INVENTORY:
                    if game._back_button_rect().collidepoint(lmx, lmy):
                        game.close_inventory()
                elif game.state == Game.SHOP:
                    if game._back_button_rect().collidepoint(lmx, lmy):
                        game.close_shop()
                    elif game._luck_buy_rect().collidepoint(lmx, lmy):
                        game.try_buy_luck()
                    elif game._speed_buy_rect().collidepoint(lmx, lmy):
                        game.try_buy_speed()
                elif game.state in (Game.IDLE, Game.REVEAL):
                    if game._auto_btn_rect().collidepoint(lmx, lmy):
                        game.auto_roll = not game.auto_roll
                    elif game._open_button_rect().collidepoint(lmx, lmy):
                        game.start_spin()
                    elif game._shop_button_rect().collidepoint(lmx, lmy):
                        game.open_shop()
                    elif game._inv_button_rect().collidepoint(lmx, lmy):
                        game.open_inventory()

        game.update(dt)
        game.draw()


if __name__ == "__main__":
    main()
