// کلاینت API اپ — بک‌اند همان پروژه‌ی ربات بله روی Vercel است (api/app.js)
import { getUid } from './storage';

export const BASE_URL = 'https://bale-german-dictionary-bot.vercel.app';

export type Entry = {
  word: string;
  type: string | null;
  article: string | null;
  plural: string | null;
  pluralFull: string;
  persian: string | null;
  english: string | null;
  ipa: string | null;
  definitions: string[];
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  dwdsExamples: string[];
  collocations: string[];
  imageUrl: string | null;
  speak: string;
  /** مدخل موقتِ ساخته‌شده از دیکشنری محلی، پیش از رسیدن داده‌ی سرور */
  local?: boolean;
};

export type CardEntry = {
  word: string;
  type: string | null;
  article: string | null;
  plural: string | null;
  persian: string | null;
  english: string | null;
  imageUrl: string | null;
  speak: string;
  example?: string | null;
};

export type LeitnerCard = {
  id: string;
  word: string;
  box: number;
  baseDays: number;
  createdAt: number;
  nextReviewAt: number;
  entry: CardEntry;
};

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function lookupGerman(q: string, fast = true) {
  const suffix = fast ? '&fast=1' : '';
  return call(`/api/app?action=lookup&dir=de&q=${encodeURIComponent(q)}${suffix}`) as Promise<
    { ok: boolean; found: boolean; entry?: Entry; word: string }
  >;
}

export async function lookupPersian(q: string, fast = true) {
  const suffix = fast ? '&fast=1' : '';
  return call(`/api/app?action=lookup&dir=fa&q=${encodeURIComponent(q)}${suffix}`) as Promise<{
    ok: boolean;
    found: boolean;
    word: string;
    equivalents: { de: string; entry: Entry | null }[];
  }>;
}

export type LevelExample = { de: string; fa: string };

/** مثال‌های سطح‌بندی‌شده برای یک کلمه (ساخته‌ی Gemini در سرور).
 *  روی هر خطایی {ok:false, examples:[]} برمی‌گرداند تا صفحه خراب نشود. */
export async function fetchLevelExamples(
  word: string,
  level: string,
  count: number,
): Promise<{ ok: boolean; examples: LevelExample[] }> {
  try {
    const r = (await call(
      `/api/app?action=examples&word=${encodeURIComponent(word)}&level=${level}&count=${count}`,
    )) as { ok: boolean; examples?: LevelExample[] };
    if (!r.ok || !Array.isArray(r.examples)) return { ok: false, examples: [] };
    return { ok: true, examples: r.examples.filter((e) => e && typeof e.de === 'string' && e.de.trim()) };
  } catch {
    return { ok: false, examples: [] };
  }
}

export async function translate(text: string) {
  return call('/api/app?action=translate', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }) as Promise<{ ok: boolean; failed: boolean; text: string; from: string; to: string }>;
}

export const ttsUrl = (text: string, slow = false) =>
  `${BASE_URL}/api/tts?t=${encodeURIComponent(text)}&raw=1&s=${slow ? 1 : 0}`;

export async function leitnerList() {
  const uid = await getUid();
  return call(`/api/app?action=leitner.list&uid=${uid}`) as Promise<{ ok: boolean; cards: LeitnerCard[] }>;
}

export async function leitnerDue() {
  const uid = await getUid();
  return call(`/api/app?action=leitner.due&uid=${uid}`) as Promise<{ ok: boolean; cards: LeitnerCard[] }>;
}

export async function leitnerAdd(entry: Entry, baseDays: 1 | 3 | 7) {
  const uid = await getUid();
  // سرور برای کارت، تصویر را در فیلد image می‌خواند
  const stored = { ...entry, image: entry.imageUrl };
  return call('/api/app?action=leitner.add', {
    method: 'POST',
    body: JSON.stringify({ uid, entry: stored, baseDays }),
  }) as Promise<{ ok: boolean; card: LeitnerCard }>;
}

export async function leitnerReview(cardId: string, known: boolean) {
  const uid = await getUid();
  return call('/api/app?action=leitner.review', {
    method: 'POST',
    body: JSON.stringify({ uid, cardId, known }),
  }) as Promise<{ ok: boolean; card: LeitnerCard | null }>;
}

export async function leitnerRemove(cardId: string) {
  const uid = await getUid();
  return call('/api/app?action=leitner.remove', {
    method: 'POST',
    body: JSON.stringify({ uid, cardId }),
  }) as Promise<{ ok: boolean }>;
}
