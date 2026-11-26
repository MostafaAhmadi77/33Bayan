// دیکشنری محلی آلمانی→فارسی — باندل‌شده در اپ، بدون شبکه و بدون تاخیر.
// فایل داده: assets/data/de-fa-dict.json با قالب
//   {"Haus": {"fa": "خانه", "t": "Substantiv", "a": "das", "p": "Häuser"}, ...}
// کلیدها سرنام آلمانی‌اند (اسم‌ها با حرف بزرگ)؛ فیلدها ممکن است نباشند.
import dictData from '../../assets/data/de-fa-dict.json';
import formsData from '../../assets/data/de-forms.json';

type DictValue = {
  fa?: string;
  t?: string;
  a?: string;
  p?: string;
  s?: string;
  /** کلاس بسامد DWDS (عدد بزرگ‌تر = پرکاربردتر) */
  f?: number;
  /** سطح CEFR از فهرست‌های Goethe/DWDS: فقط A1 تا B1 */
  c?: string;
};
type DictMap = Record<string, DictValue>;

const DICT = dictData as DictMap;
/** صورت‌های صرف‌شده/تصریف‌شده → شکل پایه (Kaikki/Wiktextract) */
const FORMS = formsData as Record<string, string>;

export type LocalEntry = {
  word: string;
  fa: string;
  type: string | null;
  article: string | null;
  plural: string | null;
  cefr: string | null;
  frequency: number | null;
};

/** شکل‌های قابل‌قبول پرس‌وجو: عین تایپ‌شده، حرف اول بزرگ، همه کوچک */
function normalizeForms(q: string): string[] {
  const t = q.trim();
  if (!t) return [];
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  const lower = t.toLowerCase();
  return [...new Set([t, cap, lower])];
}

function entryFrom(word: string, v: DictValue): LocalEntry {
  return {
    word,
    fa: v.fa ?? '',
    type: v.t ?? null,
    article: v.a ?? null,
    plural: v.p ?? null,
    cefr: v.c ?? null,
    frequency: v.f ?? null,
  };
}

/** جست‌وجوی محلی آلمانی→فارسی؛ اگر نبود null.
 *  صورت‌های صرف‌شده (ging، bekannte…) اول به شکل پایه می‌رسند تا معنی فوری
 *  درست باشد؛ جزئیات دستوری صورت را سرور در formOf می‌آورد. */
export function lookupLocal(q: string): LocalEntry | null {
  const forms = normalizeForms(q);
  for (const form of forms) {
    const lemma = FORMS[form];
    if (lemma && lemma !== form && DICT[lemma]?.fa) {
      return entryFrom(lemma, DICT[lemma]);
    }
  }
  for (const form of forms) {
    const v = DICT[form];
    if (v && v.fa) return entryFrom(form, v);
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

// کلیدهای دیکشنری و صورت‌های صرف‌شده با صورت کوچک‌شده‌شان، یک‌بار ساخته می‌شوند.
// رتبه‌بندی پیشنهادها: تطابق دقیق اول، بعد بسامد DWDS (پرکاربردترها جلوتر)،
// بعد کوتاه‌ترها — تا «gehen» پیش از کلمه‌های کم‌کاربردتر بیاید و «ging»
// هم به «gehen» برسد.
let lemmaKeys: { key: string; lower: string }[] | null = null;
let formKeys: { form: string; lower: string; lemma: string }[] | null = null;

function getLemmaKeys(): { key: string; lower: string }[] {
  if (!lemmaKeys) {
    lemmaKeys = Object.keys(DICT).map((key) => ({ key, lower: key.toLowerCase() }));
  }
  return lemmaKeys;
}

function getFormKeys(): { form: string; lower: string; lemma: string }[] {
  if (!formKeys) {
    formKeys = Object.entries(FORMS).map(([form, lemma]) => ({
      form,
      lower: form.toLowerCase(),
      lemma,
    }));
  }
  return formKeys;
}

export type GermanSuggestion = {
  word: string;
  persian: string;
  type: string | null;
  article: string | null;
};

/** پیشنهاد آلمانی→فارسی: شکل‌های پایه‌ای که خودشان یا صورت صرف‌شده‌شان با
 *  پیشوند شروع می‌شوند. «geh» → gehen؛ «ging» → gehen؛ پیشوند خالی → [] */
export function suggestGerman(prefix: string, limit = 8): GermanSuggestion[] {
  const p = prefix.trim().toLowerCase();
  if (p.length < 1) return [];
  const best = new Map<string, number>();
  const consider = (lemma: string, score: number) => {
    const prev = best.get(lemma);
    if (prev === undefined || score < prev) best.set(lemma, score);
  };
  for (const { key, lower } of getLemmaKeys()) {
    if (!lower.startsWith(p)) continue;
    const v = DICT[key];
    if (!v?.fa) continue;
    // خودِ صورت‌های صرف‌شده پیشنهاد نمی‌شوند؛ شکل پایه‌شان از مسیر FORMS می‌آید.
    if (FORMS[key] && FORMS[key] !== key) continue;
    if (v.t && /^(Konjugierte|Deklinierte)/.test(v.t)) continue;
    consider(key, (lower === p ? 0 : 1000) - (v.f ?? 0) * 20 + key.length);
  }
  for (const { form, lower, lemma } of getFormKeys()) {
    if (!lower.startsWith(p)) continue;
    const v = DICT[lemma];
    if (!v?.fa) continue;
    consider(lemma, 500 + (lower === p ? 0 : 1000) - (v.f ?? 0) * 20 + lemma.length + form.length / 100);
  }
  return [...best.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => {
      const v = DICT[word];
      // نوع‌های «فرمی» ویکی‌واژه برچسب مفیدی برای کاربر نیستند؛
      // فقط نوع‌های واقعی کلمه (فعل، اسم، صفت…) نشان داده می‌شوند.
      const type = v.t && !/^(Konjugierte|Deklinierte)/.test(v.t) ? v.t : null;
      return { word, persian: v.fa ?? '', type, article: v.a ?? null };
    });
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

// ---- داده‌ی بخش تمرین‌ها (آرتیکل، بسته‌های Goethe) ----

export type CefrLevel = 'A1' | 'A2' | 'B1';
export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1'];

/** نوع‌های «فرمی» ویکی‌واژه (صورت صرف‌شده/تصریف‌شده) مدخل مستقل حساب نمی‌شوند */
const isFormType = (t?: string) => !!t && /^(Konjugierte|Deklinierte)/.test(t);

const byFrequency = (a: LocalEntry, b: LocalEntry) =>
  (b.frequency ?? 0) - (a.frequency ?? 0) || a.word.localeCompare(b.word, 'de');

const levelCache = new Map<CefrLevel, LocalEntry[]>();

/** همه‌ی کلمه‌های یک سطح Goethe (A1/A2/B1) از دیکشنری محلی، پرکاربردترها اول */
export function wordsOfLevel(level: CefrLevel): LocalEntry[] {
  const hit = levelCache.get(level);
  if (hit) return hit;
  const list: LocalEntry[] = [];
  for (const [word, v] of Object.entries(DICT)) {
    if (v.c !== level || !v.fa || isFormType(v.t)) continue;
    list.push(entryFrom(word, v));
  }
  list.sort(byFrequency);
  levelCache.set(level, list);
  return list;
}

let nounCache: LocalEntry[] | null = null;

/** اسم‌های دارای آرتیکل der/die/das با سطح A1 تا B1 — برای تمرین آرتیکل */
export function articleNouns(level?: CefrLevel | null): LocalEntry[] {
  if (!nounCache) {
    nounCache = [];
    for (const [word, v] of Object.entries(DICT)) {
      if (!v.c || !v.fa || isFormType(v.t)) continue;
      if (v.a !== 'der' && v.a !== 'die' && v.a !== 'das') continue;
      // فقط اسم‌های تک‌کلمه‌ای با حرف اول بزرگ
      if (!/^[A-ZÄÖÜ][\p{L}-]*$/u.test(word)) continue;
      nounCache.push(entryFrom(word, v));
    }
    nounCache.sort(byFrequency);
  }
  return level ? nounCache.filter((n) => n.cefr === level) : nounCache;
}
