// توابع خالصِ صرف فعل — بدون هیچ وابستگی، تا صفحه و تست هر دو از آن‌ها استفاده کنند.
// شکل داده همان چیزی است که endpoint ‏conjugation‏ در api/app.js برمی‌گرداند.

export type ConjugationSections = {
  indikativ: {
    praesens: string[];
    praeteritum: string[];
    perfekt: string[];
    plusquamperfekt: string[];
    futur1: string[];
    futur2: string[];
  };
  konjunktiv: {
    konjunktiv1: string[];
    konjunktiv2: string[];
    praeteritumWuerde: string[];
    plusquamperfektWuerde: string[];
  };
  imperativ: string[];
  infinitive: {
    infinitiv1: string | null;
    infinitiv2: string | null;
    partizip1: string | null;
    partizip2: string | null;
  };
};

export type Conjugation = {
  verb: string;
  aux: 'sein' | 'haben' | null;
  irregular: boolean;
  sections: ConjugationSections;
};

const asForms = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x && x !== '—');
};

const asText = (v: unknown): string | null => {
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) {
    const joined = v.filter((x): x is string => typeof x === 'string').join(', ').trim();
    return joined || null;
  }
  return null;
};

const emptySections = (): ConjugationSections => ({
  indikativ: { praesens: [], praeteritum: [], perfekt: [], plusquamperfekt: [], futur1: [], futur2: [] },
  konjunktiv: { konjunktiv1: [], konjunktiv2: [], praeteritumWuerde: [], plusquamperfektWuerde: [] },
  imperativ: [],
  infinitive: { infinitiv1: null, infinitiv2: null, partizip1: null, partizip2: null },
});

/** پاسخ خام سرور را به شکل امن و یکدست درمی‌آورد؛
 *  روی داده‌ی ناقص یا نامعتبر null برمی‌گرداند (نه خطا). */
export function normalizeConjugation(raw: unknown): Conjugation | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const verb = typeof r.verb === 'string' ? r.verb.trim() : '';
  if (!verb) return null;
  const s = (r.sections ?? {}) as Record<string, unknown>;
  const ind = (s.indikativ ?? {}) as Record<string, unknown>;
  const kon = (s.konjunktiv ?? {}) as Record<string, unknown>;
  const inf = (s.infinitive ?? {}) as Record<string, unknown>;
  const sections: ConjugationSections = {
    indikativ: {
      praesens: asForms(ind.praesens),
      praeteritum: asForms(ind.praeteritum),
      perfekt: asForms(ind.perfekt),
      plusquamperfekt: asForms(ind.plusquamperfekt),
      futur1: asForms(ind.futur1),
      futur2: asForms(ind.futur2),
    },
    konjunktiv: {
      konjunktiv1: asForms(kon.konjunktiv1),
      konjunktiv2: asForms(kon.konjunktiv2),
      praeteritumWuerde: asForms(kon.praeteritumWuerde),
      plusquamperfektWuerde: asForms(kon.plusquamperfektWuerde),
    },
    imperativ: asForms(s.imperativ),
    infinitive: {
      infinitiv1: asText(inf.infinitiv1),
      infinitiv2: asText(inf.infinitiv2),
      partizip1: asText(inf.partizip1),
      partizip2: asText(inf.partizip2),
    },
  };
  const hasAny =
    Object.values(sections.indikativ).some((t) => t.length) ||
    Object.values(sections.konjunktiv).some((t) => t.length) ||
    sections.imperativ.length > 0 ||
    Object.values(sections.infinitive).some((x) => x !== null);
  if (!hasAny) return null;
  return {
    verb,
    aux: r.aux === 'sein' || r.aux === 'haben' ? r.aux : null,
    irregular: r.irregular === true,
    sections,
  };
}

export function emptyConjugation(verb: string): Conjugation {
  return { verb, aux: null, irregular: false, sections: emptySections() };
}

/** طولانی‌ترین پیشوند مشترک همه‌ی فرم‌ها — برای رنگ‌کردن ریشه‌ی فعل.
 *  اگر کوتاه‌تر از ۲ حرف باشد خالی برمی‌گرداند (رنگی نمی‌شود). */
export function commonPrefix(forms: string[]): string {
  if (forms.length < 2) return '';
  let prefix = forms[0];
  for (const f of forms.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < f.length && prefix[i] === f[i]) i++;
    prefix = prefix.slice(0, i);
    if (!prefix) break;
  }
  return prefix.length >= 2 ? prefix : '';
}

/** خط فرم‌های اصلی بالای صفحه: «geht · ging · ist gegangen» —
 *  سوم‌شخص مفرد حال + سوم‌شخص مفرد گذشته + کمکی + وجه وصفی دوم. */
export function mainFormsLine(c: Conjugation): string {
  const parts: string[] = [];
  const praesens3 = c.sections.indikativ.praesens[2];
  const praeteritum3 = c.sections.indikativ.praeteritum[2];
  if (praesens3) parts.push(praesens3);
  if (praeteritum3) parts.push(praeteritum3);
  const partizip2 = c.sections.infinitive.partizip2;
  if (partizip2) {
    parts.push(`${c.aux === 'sein' ? 'ist' : 'hat'} ${partizip2}`);
  } else {
    const perfekt3 = c.sections.indikativ.perfekt[2];
    if (perfekt3) parts.push(perfekt3);
  }
  return parts.join(' · ');
}
