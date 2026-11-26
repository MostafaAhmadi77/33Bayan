// توابع مشترک بخش «تمرین‌ها»: مقایسه‌ی ملایم پاسخ آلمانی، ساخت مدخل لایتنر از
// دیکشنری محلی، برُ زدن، و افزودن دسته‌ای به جعبه‌ی لایتنر با محدودیت هم‌زمانی.
import { leitnerAdd, leitnerList, lookupGerman, type Entry } from './api';
import type { LocalEntry } from './local-dict';

/** پاسخ آلمانی را برای مقایسه‌ی ملایم یکدست می‌کند:
 *  حروف کوچک، ä/ö/ü/ß ⇄ ae/oe/ue/ss، حذف نشانه‌گذاری و فاصله‌های اضافه. */
export function normalizeGerman(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** آیا پاسخ کاربر با یکی از شکل‌های درست می‌خواند؟ (شکل‌های جایگزین با «/» یا «,» جدا می‌شوند) */
export function answerMatches(input: string, expected: string): boolean {
  const got = normalizeGerman(input);
  if (!got) return false;
  const options = expected.split(/\s*[/,]\s*/).map(normalizeGerman).filter(Boolean);
  return options.includes(got) || normalizeGerman(expected) === got;
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** مدخل حداقلیِ قابل‌ذخیره در لایتنر از دیکشنری محلی (بدون شبکه) */
export function entryFromLocal(l: LocalEntry): Entry {
  return {
    word: l.word,
    type: l.type,
    article: l.article,
    plural: l.plural,
    pluralFull: l.plural ?? '',
    persian: l.fa,
    english: null,
    ipa: null,
    definitions: [],
    examples: [],
    synonyms: [],
    antonyms: [],
    dwdsExamples: [],
    collocations: [],
    imageUrl: null,
    speak: `${l.article ? l.article + ' ' : ''}${l.word}`,
    cefr: l.cefr,
    frequency: l.frequency,
  };
}

/** افزودن یک کلمه به لایتنر: اول مدخل کامل سرور (تصویر، مثال)، و اگر نرسید مدخل محلی */
export async function addLocalWordToLeitner(l: LocalEntry): Promise<void> {
  let entry = entryFromLocal(l);
  try {
    const r = await lookupGerman(l.word, true);
    if (r.ok && r.found && r.entry && r.entry.word.toLowerCase() === l.word.toLowerCase()) {
      entry = {
        ...r.entry,
        persian: r.entry.persian || l.fa,
        article: r.entry.article ?? l.article,
        cefr: l.cefr,
      };
    }
  } catch {
    // شبکه نبود: همان مدخل محلی کافی است
  }
  await leitnerAdd(entry, 1);
}

/** مجموعه‌ی کلمه‌های موجود در جعبه‌ی لایتنر (حروف کوچک) */
export async function leitnerWordSet(): Promise<Set<string>> {
  const r = await leitnerList();
  return new Set((r.cards || []).map((c) => c.word.toLowerCase()));
}

export type BulkProgress = { done: number; failed: number; total: number };

/** افزودن دسته‌ای به لایتنر: حداکثر ۳ درخواست هم‌زمان با مکث کوتاه بین دسته‌ها،
 *  قابل لغو، و توقف خودکار اگر خطاهای پشت‌سرهم زیاد شد (مثلاً قطع اینترنت).
 *  کلمه‌هایی که با موفقیت اضافه شدند را برمی‌گرداند. */
export async function bulkAddToLeitner(
  words: LocalEntry[],
  onProgress: (p: BulkProgress) => void,
  isCancelled: () => boolean,
): Promise<{ added: string[]; failed: number; aborted: boolean }> {
  const CONCURRENCY = 3;
  const PAUSE_MS = 250;
  const MAX_FAIL_STREAK = 6;
  const added: string[] = [];
  let failed = 0;
  let failStreak = 0;
  for (let i = 0; i < words.length; i += CONCURRENCY) {
    if (isCancelled()) return { added, failed, aborted: true };
    const chunk = words.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map((w) => leitnerAdd(entryFromLocal(w), 1).then(() => w.word)),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        added.push(r.value);
        failStreak = 0;
      } else {
        failed += 1;
        failStreak += 1;
      }
    }
    onProgress({ done: added.length, failed, total: words.length });
    if (failStreak >= MAX_FAIL_STREAK) return { added, failed, aborted: true };
    await new Promise((res) => setTimeout(res, PAUSE_MS));
  }
  return { added, failed, aborted: false };
}

/** رنگ آرتیکل‌ها: der آبی، die قرمز، das سبز */
export const ARTICLE_COLORS: Record<'der' | 'die' | 'das', { light: string; dark: string }> = {
  der: { light: '#2F6FEB', dark: '#6EA0FF' },
  die: { light: '#E5484D', dark: '#FF7A7E' },
  das: { light: '#1F9D55', dark: '#4FD18B' },
};

/** اعداد فارسی برای نمایش */
export const faNum = (n: number) => n.toLocaleString('fa-IR');
