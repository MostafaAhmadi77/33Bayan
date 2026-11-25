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

// ---- پیشنهاد کلمه (تکمیل خودکار) — هم‌زمان و بدون شبکه ----

// کلیدهای دیکشنری با صورت کوچک‌شده‌شان، یک‌بار ساخته و مرتب می‌شوند:
// اول کوتاه‌ترها، بعد الفبایی — تا «gehen» پیش از «Gehör» و «geht» بیاید.
let sortedKeys: { key: string; lower: string }[] | null = null;

function getSortedKeys(): { key: string; lower: string }[] {
  if (!sortedKeys) {
    sortedKeys = Object.keys(DICT).map((key) => ({ key, lower: key.toLowerCase() }));
    sortedKeys.sort(
      (a, b) => a.key.length - b.key.length || a.key.localeCompare(b.key),
    );
  }
  return sortedKeys;
}

export type GermanSuggestion = {
  word: string;
  persian: string;
  type: string | null;
  article: string | null;
};

/** پیشنهاد آلمانی→فارسی: کلمه‌هایی که با پیشوند شروع می‌شوند.
 *  «g» یا «geh» → gehen، gehören… ؛ پیشوند خالی یا ناموجود → [] */
export function suggestGerman(prefix: string, limit = 8): GermanSuggestion[] {
  const p = prefix.trim().toLowerCase();
  if (p.length < 1) return [];
  const out: GermanSuggestion[] = [];
  for (const { key, lower } of getSortedKeys()) {
    if (out.length >= limit) break;
    if (!lower.startsWith(p)) continue;
    const v = DICT[key];
    if (!v?.fa) continue;
    // نوع‌های «فرمی» ویکی‌واژه (صورت صرف‌شده/تصریف‌شده) برچسب مفیدی برای کاربر نیستند؛
    // فقط نوع‌های واقعی کلمه (فعل، اسم، صفت…) نشان داده می‌شوند.
    const type = v.t && !/^(Konjugierte|Deklinierte)/.test(v.t) ? v.t : null;
    out.push({ word: key, persian: v.fa, type, article: v.a ?? null });
  }
  return out;
}

export type PersianSuggestion = { fa: string; de: string[] };

/** کاف و یه‌ی عربی را به شکل فارسی تبدیل می‌کند (هماهنگ با explore) */
function normalizeFaToken(s: string): string {
  return s.replace(/[\u0643]/g, '\u06a9').replace(/[\u064a]/g, '\u06cc');
}

/** پیشنهاد فارسی→آلمانی: توکن‌های فارسیِ معنی‌ها که با پیشوند شروع می‌شوند.
 *  «خا» → خانه… ؛ هر مورد تا ۳ معادل آلمانی دارد.
 *  ترتیب: اول پرکاربردترین‌ها (بیشترین معادل آلمانی)، بعد کوتاه‌ترها، بعد الفبایی —
 *  تا «خانه» (۱۴ معادل) پیش از «خاک» و «خاص» بیاید. */
export function suggestPersian(prefix: string, limit = 8): PersianSuggestion[] {
  if (!reverseIndex) reverseIndex = buildReverseIndex();
  const p = normalizeFaToken(prefix.trim());
  if (p.length < 1) return [];
  const matches: { fa: string; words: string[] }[] = [];
  for (const [tok, words] of reverseIndex) {
    if (normalizeFaToken(tok).startsWith(p)) {
      matches.push({ fa: tok, words });
    }
  }
  matches.sort(
    (a, b) =>
      b.words.length - a.words.length ||
      a.fa.length - b.fa.length ||
      a.fa.localeCompare(b.fa, 'fa'),
  );
  return matches.slice(0, limit).map((m) => ({ fa: m.fa, de: m.words.slice(0, 3) }));
}
