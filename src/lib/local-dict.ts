// دیکشنری محلی آلمانی→فارسی — باندل‌شده در اپ، بدون شبکه و بدون تاخیر.
// فایل داده: assets/data/de-fa-dict.json با قالب
//   {"Haus": {"fa": "خانه", "t": "Substantiv", "a": "das", "p": "Häuser"}, ...}
// کلیدها سرنام آلمانی‌اند (اسم‌ها با حرف بزرگ)؛ فیلدها ممکن است نباشند.
import dictData from '../../assets/data/de-fa-dict.json';

type DictValue = { fa?: string; t?: string; a?: string; p?: string };
type DictMap = Record<string, DictValue>;

const DICT = dictData as DictMap;

export type LocalEntry = {
  word: string;
  fa: string;
  type: string | null;
  article: string | null;
  plural: string | null;
};

/** شکل‌های قابل‌قبول پرس‌وجو: عین تایپ‌شده، حرف اول بزرگ، همه کوچک */
function normalizeForms(q: string): string[] {
  const t = q.trim();
  if (!t) return [];
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  const lower = t.toLowerCase();
  return [...new Set([t, cap, lower])];
}

/** جست‌وجوی محلی آلمانی→فارسی؛ اگر نبود null */
export function lookupLocal(q: string): LocalEntry | null {
  for (const form of normalizeForms(q)) {
    const v = DICT[form];
    if (v && v.fa) {
      return {
        word: form,
        fa: v.fa,
        type: v.t ?? null,
        article: v.a ?? null,
        plural: v.p ?? null,
      };
    }
  }
  return null;
}

// ---- ایندکس معکوس فارسی→آلمانی (در اولین استفاده ساخته می‌شود) ----
let reverseIndex: Map<string, string[]> | null = null;

function buildReverseIndex(): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  const add = (token: string, word: string) => {
    if (!token) return;
    const list = idx.get(token) ?? [];
    if (list.length < 8 && !list.includes(word)) list.push(word);
    idx.set(token, list);
  };
  for (const [word, v] of Object.entries(DICT)) {
    if (!v.fa) continue;
    // توکن‌های فارسیِ داخل معنی (جدا با فاصله و نشانه‌گذاری)
    for (const tok of v.fa.split(/[\s،,؛;()«»"']+/).map((s) => s.trim()).filter(Boolean)) {
      add(tok, word);
    }
  }
  return idx;
}

/** جست‌وجوی محلی فارسی→آلمانی: حداکثر ۸ کلمه‌ی آلمانیِ نامزد.
 *  اول تطابق دقیق توکن، بعد تطابق جزئی (شامل‌شدن). */
export function lookupLocalFa(q: string): string[] {
  if (!reverseIndex) reverseIndex = buildReverseIndex();
  const query = q.trim();
  if (!query) return [];
  const exact = reverseIndex.get(query);
  if (exact && exact.length) return [...exact];
  const out: string[] = [];
  for (const [tok, words] of reverseIndex) {
    if (tok.includes(query) || query.includes(tok)) {
      for (const w of words) {
        if (out.length >= 8) break;
        if (!out.includes(w)) out.push(w);
      }
    }
    if (out.length >= 8) break;
  }
  return out;
}
