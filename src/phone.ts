/**
 * Headless phone helpers for the shadcn `tel` renderers. No React, no DOM: the
 * registry `phone.tsx` wrapper imports these from `@rusl-labs/surface-shadcn`
 * so `libphonenumber-js` (this package's dependency, bundled `min` metadata)
 * stays out of the copied component and its direct registry dependencies.
 *
 * Storage form is E.164 (`schemas/pragmatic/contact.scalars#/$defs/phone`);
 * national/international shaping is a presentation concern handled here.
 */
import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type { CountryCode };

/** One entry in the flag/country picker, localized for the active locale. */
export interface PhoneCountryOption {
  /** ISO 3166-1 alpha-2 region code. */
  readonly code: CountryCode;
  /** Localized region name; falls back to the ISO code. */
  readonly name: string;
  /** Country calling code digits, e.g. `"1"`, `"44"`. */
  readonly callingCode: string;
  /** Regional-indicator flag emoji, or `""` when it can't be derived. */
  readonly flag: string;
}

/** Interpretation of a raw draft under an active region. */
export interface PhoneInterpretation {
  /** True when the trimmed draft is empty. */
  readonly empty: boolean;
  /** `isPossible()` — length/shape plausibility, not allocation policing. */
  readonly possible: boolean;
  /** E.164 storage value; present only when {@link possible}. */
  readonly e164?: string;
  /** Region libphonenumber inferred, when any (drives +intl picker switching). */
  readonly country?: CountryCode;
}

/** Parts of a stored E.164 value for display and draft resync. */
export interface PhoneValueParts {
  /** Canonical E.164 (`+` and digits). */
  readonly e164: string;
  /** Region for this number, when known. */
  readonly country?: CountryCode;
  /** National grouping, e.g. `"(415) 555-0100"`. */
  readonly national: string;
  /** International grouping, e.g. `"+1 415 555 0100"`. */
  readonly international: string;
  /** `tel:` RFC 3966 URI. */
  readonly uri: string;
}

const FLAG_OFFSET = 0x1f1e6 - "A".charCodeAt(0);

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code. */
export function phoneFlagEmoji(code: string): string {
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(
    cc.charCodeAt(0) + FLAG_OFFSET,
    cc.charCodeAt(1) + FLAG_OFFSET,
  );
}

const regionNamesCache = new Map<string, Intl.DisplayNames | null>();

function regionNames(locale: string): Intl.DisplayNames | null {
  const cached = regionNamesCache.get(locale);
  if (cached !== undefined) return cached;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    names = null;
  }
  regionNamesCache.set(locale, names);
  return names;
}

/** Localized country display name; falls back to the ISO code. */
export function phoneCountryName(code: string, locale: string): string {
  const cc = code.toUpperCase();
  try {
    return regionNames(locale)?.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

function normalizeAllowed(
  allowed: readonly string[] | undefined,
): ReadonlySet<CountryCode> | undefined {
  if (!allowed || allowed.length === 0) return undefined;
  const out = new Set<CountryCode>();
  for (const raw of allowed) {
    if (typeof raw !== "string") continue;
    const cc = raw.toUpperCase();
    if (isSupportedCountry(cc)) out.add(cc);
  }
  return out.size > 0 ? out : undefined;
}

function toSupported(code: string | undefined): CountryCode | undefined {
  if (!code) return undefined;
  const cc = code.toUpperCase();
  return isSupportedCountry(cc) ? cc : undefined;
}

/**
 * Explicit region subtag of a locale, when present. Never maximizes — an
 * unqualified locale like `"en"` yields `undefined` rather than inventing a
 * region (so a bare `"en"` does not silently become `US`).
 */
function regionFromLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    return new Intl.Locale(locale).region ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build the picker option list: every supported region (or just `allowed`
 * when the widget restricts them), localized and sorted by name. `ensure`
 * force-includes the active region even when it falls outside `allowed`, so a
 * stored number whose country is filtered out still has a matching option.
 */
export function phoneCountryOptions(input: {
  readonly locale: string;
  readonly allowed?: readonly string[];
  readonly ensure?: string;
}): PhoneCountryOption[] {
  const { locale, allowed, ensure } = input;
  const allowSet = normalizeAllowed(allowed);
  const codes = getCountries().filter(
    (code) => !allowSet || allowSet.has(code),
  );
  const ensureCode = toSupported(ensure);
  if (ensureCode && !codes.includes(ensureCode)) codes.push(ensureCode);
  const collator = new Intl.Collator(locale);
  return codes
    .map((code) => ({
      code,
      name: phoneCountryName(code, locale),
      callingCode: getCountryCallingCode(code),
      flag: phoneFlagEmoji(code),
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/**
 * Resolve the active region for parsing and the picker. Priority: the region
 * of an existing stored value (a fact, so it wins even outside `allowed`),
 * then the widget default, the app-provider default, and finally an explicit
 * locale region — each clamped to `allowed`. Returns `undefined` when nothing
 * qualifies rather than guessing a region.
 */
export function resolvePhoneCountry(input: {
  readonly value?: unknown;
  readonly widgetDefault?: string;
  readonly providerDefault?: string;
  readonly locale?: string;
  readonly allowed?: readonly string[];
}): CountryCode | undefined {
  const { value, widgetDefault, providerDefault, locale, allowed } = input;
  const parsed = parsePhoneValue(value);
  if (parsed?.country) return parsed.country;

  const allowSet = normalizeAllowed(allowed);
  for (const candidate of [
    widgetDefault,
    providerDefault,
    regionFromLocale(locale),
  ]) {
    const cc = toSupported(candidate);
    if (cc && (!allowSet || allowSet.has(cc))) return cc;
  }
  return undefined;
}

/**
 * Interpret a raw draft without reformatting or rejecting intermediate input.
 * A possible number yields its E.164; anything nonempty-but-not-possible is
 * reported so the caller can register an issue instead of storing garbage.
 */
export function interpretPhoneDraft(
  text: string,
  country?: CountryCode,
): PhoneInterpretation {
  const trimmed = text.trim();
  if (trimmed === "") return { empty: true, possible: false };
  // A leading "+" is an international number: parse it on its own so a pasted
  // +intl value resolves its own region regardless of the active picker.
  // Otherwise parse nationally under the active region.
  const parsed = parsePhoneNumberFromString(trimmed, {
    defaultCountry: country,
    extract: false,
  });
  if (parsed && !parsed.ext && parsed.isPossible()) {
    return {
      empty: false,
      possible: true,
      e164: parsed.number,
      country: parsed.country,
    };
  }
  return { empty: false, possible: false, country: parsed?.country };
}

/** Parse a stored E.164 into display/resync parts, or `undefined` when unparseable. */
export function parsePhoneValue(value: unknown): PhoneValueParts | undefined {
  if (typeof value !== "string" || !/^\+[1-9][0-9]{1,14}$/.test(value))
    return undefined;
  const parsed = parsePhoneNumberFromString(value, { extract: false });
  if (!parsed) return undefined;
  return {
    e164: parsed.number,
    country: parsed.country,
    national: parsed.formatNational(),
    international: parsed.formatInternational(),
    uri: parsed.getURI(),
  };
}
