// بعد از `expo export -p web`: مانیفست PWA، فونت فارسیِ هم‌شکلِ اندروید
// و ستونِ هم‌عرضِ گوشی روی دسکتاپ را به همه‌ی صفحه‌های HTML اضافه می‌کند.
const fs = require('fs');
const path = require('path');

const HEAD = `
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#FFFFFF">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap">
<style id="bayan-web">
body { margin: 0; background: #E9E7F2; }
@media (prefers-color-scheme: dark) { body { background: #08080F; } }
body, input, textarea, button { font-family: Roboto, 'Noto Sans Arabic', sans-serif; }
#root { max-width: 480px; margin: 0 auto; box-shadow: 0 0 24px rgba(0,0,0,0.08); }
</style>`;

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) {
      let html = fs.readFileSync(p, 'utf8');
      if (html.includes('id="bayan-web"')) continue;
      html = html.replace('<html lang="en">', '<html lang="fa" dir="rtl">').replace('</head>', HEAD + '</head>');
      fs.writeFileSync(p, html);
    }
  }
}
walk(path.join(__dirname, '..', 'dist'));
