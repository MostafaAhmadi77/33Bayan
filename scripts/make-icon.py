# ساخت ست آیکون اپ از اثر اصلی برند (assets/images/brand-master.png)
# اثر: مونوگرام طلایی کتاب و B با نوارهای سه‌رنگ آلمان و حلقه فیروزه‌ای روی مشکی
from PIL import Image

master = Image.open("assets/images/brand-master.png").convert("RGB")
master.resize((1024, 1024), Image.LANCZOS).save("assets/images/icon.png")
master.resize((256, 256), Image.LANCZOS).save("assets/images/favicon.png")
master.resize((1024, 1024), Image.LANCZOS).save("assets/images/splash-icon.png")

fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
fg.paste(master.resize((778, 778), Image.LANCZOS), (123, 123))
fg.save("assets/images/android-icon-foreground.png")

gray = master.convert("L").resize((778, 778), Image.LANCZOS)
mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
mono.paste(Image.new("RGBA", (778, 778), (255, 255, 255, 255)), (123, 123), gray)
mono.save("assets/images/android-icon-monochrome.png")
print("icon set rebuilt from brand master")
