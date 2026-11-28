// معنی‌به‌معنی (فاز ۱ بازسازی دیکشنری): assets/data/de-senses.json
// {"freuen":[{"fa":"…","r":"akk","p":"über+Akk","fr":"sich über etwas freuen","g":"umg","d":"law","pos":"verb","ex":"…","exf":"…"}]}
import sensesData from '../../assets/data/de-senses.json';
import formsData from '../../assets/data/de-forms.json';

export type Sense = {
  fa: string;
  r?: 'akk' | 'dat';
  p?: string;
  fr?: string;
  g?: string;
  d?: string;
  pos?: string;
  ex?: string;
  exf?: string;
};

const SENSES = sensesData as unknown as Record<string, Sense[]>;
const FORMS = formsData as Record<string, string>;

export function lookupSenses(word: string | null | undefined): Sense[] {
  if (!word) return [];
  const t = word.trim().replace(/^sich\s+/i, '');
  const cands = [t, t.charAt(0).toUpperCase() + t.slice(1), t.toLowerCase()];
  for (const c of cands) if (SENSES[c]?.length) return SENSES[c];
  for (const c of cands) {
    const l = FORMS[c];
    if (l && SENSES[l]?.length) return SENSES[l];
  }
  return [];
}

export const REG_FA: Record<string, string> = {
  umg: 'محاوره‌ای',
  geh: 'رسمی/ادبی',
  derb: 'عامیانه',
  'österr': 'اتریشی',
  schweiz: 'سوئیسی',
  veraltend: 'قدیمی',
  fach: 'تخصصی',
};
