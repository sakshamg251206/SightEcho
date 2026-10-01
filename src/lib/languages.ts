/** A language SightEcho can answer and speak in. */
export interface Language {
  /** BCP 47 tag used to pick a speech voice, e.g. "hi-IN". */
  code: string;
  /** English name, used inside the model prompt. */
  name: string;
  /** Name in the language itself, shown in the UI. */
  nativeName: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl-PL', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th-TH', name: 'Thai', nativeName: 'ไทย' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
];

export const DEFAULT_LANGUAGE = 'en-US';

/** Exact tag match first, then a match on the primary subtag ("pt-PT" → "pt-BR"). */
export function findLanguage(tag: string | undefined): Language | undefined {
  if (!tag) return undefined;
  const lower = tag.toLowerCase();
  const exact = LANGUAGES.find((lang) => lang.code.toLowerCase() === lower);
  if (exact) return exact;
  const primary = lower.split('-')[0];
  return LANGUAGES.find((lang) => lang.code.toLowerCase().split('-')[0] === primary);
}

/** Picks the first supported language from the browser's preference list. */
export function preferredLanguage(browserLanguages: readonly string[]): string {
  for (const tag of browserLanguages) {
    const match = findLanguage(tag);
    if (match) return match.code;
  }
  return DEFAULT_LANGUAGE;
}
