# آیکون برند 33Bayan: پس‌زمینه گرادیان بنفش + «33» سفید + کتاب باز + نوار طلایی
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

S = 2048  # بوم بزرگ برای آنتی‌الیاسینگ، خروجی نهایی 1024
VIOLET_TOP = (139, 113, 255)
VIOLET_BOT = (104, 69, 232)
WHITE = (255, 255, 255)
GOLD = (255, 206, 0)
PAGE_LINE = (178, 160, 255)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def gradient(size, top, bot):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        t = y / size
        r = int(top[0] + (bot[0] - top[0]) * t)
        g = int(top[1] + (bot[1] - top[1]) * t)
        b = int(top[2] + (bot[2] - top[2]) * t)
        for x in range(0, size, 8):
            for dx in range(8):
                if x + dx < size: px[x + dx, y] = (r, g, b)
    return img

def glyph(scale=1.0):
    """نشانه سفید (33 + کتاب) روی شفاف؛ برمی‌گرداند تصویر مربعی S×S که نشانه در مرکزش است و با scale کوچک شده."""
    g = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    cx = S // 2
    font = ImageFont.truetype(FONT_BOLD, int(560 * scale))
    txt = "33"
    bbox = d.textbbox((0, 0), txt, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    ty = int(S * 0.16)
    d.text((cx - tw / 2 - bbox[0], ty - bbox[1]), txt, font=font, fill=WHITE)
    # کتاب باز
    bw, bh = int(760 * scale), int(430 * scale)
    bx0, by0 = cx - bw // 2, int(S * 0.56)
    bx1, by1 = cx + bw // 2, by0 + bh
    def page(left):
        pts_top, pts_bot = [], []
        x0, x1 = (bx0, cx) if left else (cx, bx1)
        for i in range(21):
            t = i / 20
            x = x0 + (x1 - x0) * t
            ytop = by0 + int(math.sin(t * math.pi) * -26 * scale) + int((1 - t if left else t) * 30 * scale)
            ybot = by1 - int(math.sin(t * math.pi) * 44 * scale)
            pts_top.append((x, ytop)); pts_bot.append((x, ybot))
        return pts_top + pts_bot[::-1]
    d.polygon(page(True), fill=WHITE)
    d.polygon(page(False), fill=WHITE)
    d.line([(cx, by0 + 6), (cx, by1 - int(40 * scale))], fill=(150, 128, 245), width=int(10 * scale))
    # خطوط متن روی صفحات
    for side in (-1, 1):
        for i, yy in enumerate((0.30, 0.48, 0.66)):
            y = by0 + int(bh * yy)
            x_start = cx + side * int(70 * scale)
            x_end = cx + side * int((300 - i * 34) * scale)
            d.rounded_rectangle([min(x_start, x_end), y, max(x_start, x_end), y + int(20 * scale)],
                                radius=int(10 * scale), fill=PAGE_LINE)
    # نوار طلایی زیر کتاب
    gw = int(330 * scale)
    gy = by1 + int(64 * scale)
    d.rounded_rectangle([cx - gw // 2, gy, cx + gw // 2, gy + int(30 * scale)], radius=int(15 * scale), fill=GOLD)
    return g

# ۱) آیکون کامل iOS/استور
bg = gradient(S, VIOLET_TOP, VIOLET_BOT).convert("RGBA")
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([S*0.08, S*0.02, S*0.92, S*0.86], fill=(255, 255, 255, 46))
bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
bg.alpha_composite(glyph(1.0))
bg.convert("RGB").resize((1024, 1024), Image.LANCZOS).save("assets/images/icon.png")
bg.convert("RGB").resize((256, 256), Image.LANCZOS).save("assets/images/favicon.png")

# ۲) فورگراند تطبیقی اندروید (نشانه کوچک‌تر، در ناحیه امن) + مونوکروم + اسپلش
fg = glyph(0.60)
fg.resize((1024, 1024), Image.LANCZOS).save("assets/images/android-icon-foreground.png")
fg.resize((1024, 1024), Image.LANCZOS).save("assets/images/android-icon-monochrome.png")
glyph(0.92).resize((1024, 1024), Image.LANCZOS).save("assets/images/splash-icon.png")
print("icons written")
