/**
 * Headless money helpers for the shadcn `money` renderer. No React, no DOM —
 * pure `Intl` + string/BigInt arithmetic, mirroring `src/is-record.ts` etc.
 *
 * The canonical `money` shape (schemas/pragmatic/money.schema.json) stores
 * `amount` as an **integer count of the currency's ISO 4217 minor unit** and
 * `currency` as an ISO 4217 code. A person, however, reads and edits a
 * *major-unit* figure (dollars, not cents). These helpers convert between the
 * two exactly — never via `parseFloat` and never by blindly multiplying by 100.
 */

/** Metadata for interpreting one currency's amount, derived from `Intl`. */
export interface CurrencyUnit {
  /** Normalized (upper-case, 3-letter) ISO 4217 code used for `Intl` lookups. */
  readonly code: string;
  /** The runtime recognizes the code and we can convert its amounts. */
  readonly supported: boolean;
  /**
   * Minor units in one major unit. `10 ** n` for the decimal currencies; `5`
   * for the two non-decimal ISO 4217 currencies (see {@link NON_DECIMAL_FACTOR}).
   */
  readonly factor: bigint;
  /** Maximum fraction digits a person may type / see in the major unit. */
  readonly fractionDigits: number;
  /** Minimum fraction digits when formatting (trailing zeros for decimals). */
  readonly minDisplayDigits: number;
}

/**
 * ISO 4217's only non-decimal currencies: the Malagasy ariary (MGA) and
 * Mauritanian ouguiya (MRU) each subdivide into **5** (iraimbilanja / khoums),
 * not a power of ten. `Intl`/CLDR report 2 fraction digits for both, so
 * `10 ** digits` would wrongly imply 100 minor units per major — the canonical
 * money schema explicitly flags this. One sub-unit is `1/5 = 0.2`, so a single
 * decimal place represents it exactly (multiples of 0.2 are the only valid
 * major-unit values; 0.1 is half a sub-unit and is rejected).
 */
const NON_DECIMAL_FACTOR: Record<string, bigint> = {
  MGA: 5n,
  MRU: 5n,
};

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));
// SIX ISO 4217 list-one.xml (2026-01-01): these codes have minor unit N.A.
// Intl still formats them with two decimal places; that is not a storage unit.
const NO_MINOR_UNIT = new Set([
  "XAG",
  "XAU",
  "XBA",
  "XBB",
  "XBC",
  "XBD",
  "XDR",
  "XPD",
  "XPT",
  "XSU",
  "XTS",
  "XUA",
  "XXX",
]);

/**
 * Resolve a currency code to conversion/formatting metadata. Unknown or
 * malformed codes return `{ supported: false }` so callers can degrade without
 * throwing (`Intl` throws on a malformed currency code / a missing one).
 */
export function currencyUnit(currency: unknown, locale?: string): CurrencyUnit {
  const code =
    typeof currency === "string" ? currency.trim().toUpperCase() : "";
  if (
    !/^[A-Z]{3}$/.test(code) ||
    !SUPPORTED_CURRENCIES.has(code) ||
    NO_MINOR_UNIT.has(code)
  ) {
    return {
      code,
      supported: false,
      factor: 1n,
      fractionDigits: 0,
      minDisplayDigits: 0,
    };
  }
  let digits: number;
  try {
    digits = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).resolvedOptions().maximumFractionDigits!;
  } catch {
    return {
      code,
      supported: false,
      factor: 1n,
      fractionDigits: 0,
      minDisplayDigits: 0,
    };
  }
  if (Object.hasOwn(NON_DECIMAL_FACTOR, code)) {
    // Show the sub-unit only when present (`Ar 34`, but `Ar 34.2`).
    return {
      code,
      supported: true,
      factor: NON_DECIMAL_FACTOR[code],
      fractionDigits: 1,
      minDisplayDigits: 0,
    };
  }
  return {
    code,
    supported: true,
    factor: 10n ** BigInt(digits),
    fractionDigits: digits,
    minDisplayDigits: digits,
  };
}

/**
 * The currency's narrow symbol in `locale` (e.g. `$`, `¥`, `Ar`). Falls back to
 * the code when no distinct symbol exists (e.g. `BHD`) or lookup fails.
 */
export function currencySymbol(currency: unknown, locale?: string): string {
  const code =
    typeof currency === "string" ? currency.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(code)) return "";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .filter((part) => part.type === "currency")
      .map((part) => part.value)
      .join("");
  } catch {
    return code;
  }
}

/** The grouping and decimal separators `locale` uses for plain numbers. */
export interface LocaleSeparators {
  readonly group: string;
  readonly decimal: string;
}

export function localeSeparators(locale?: string): LocaleSeparators {
  try {
    const parts = new Intl.NumberFormat(locale, {
      useGrouping: true,
    }).formatToParts(11111.1);
    return {
      group: parts.find((part) => part.type === "group")?.value ?? ",",
      decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    };
  } catch {
    return { group: ",", decimal: "." };
  }
}

/** Outcome of parsing a major-unit draft into canonical minor units. */
export type ParseAmountResult =
  | { readonly kind: "empty" }
  | { readonly kind: "value"; readonly minor: number }
  | { readonly kind: "issue"; readonly message: string };

/**
 * Parse a human, locale-formatted major-unit string into exact minor units.
 *
 * Tolerant of transitional input (signs, the locale's group/decimal symbols,
 * spaces incl. NBSP, de-CH apostrophes). Precise by construction: BigInt math,
 * never `parseFloat`. Excess precision and amounts outside the safe-integer
 * range are **rejected** (an `issue`) rather than silently rounded, so the
 * caller can register the issue and refuse to emit stale-but-savable data.
 */
export function parseMajorToMinor(
  text: string,
  unit: CurrencyUnit,
  locale?: string,
  options: { readonly allowNegative?: boolean } = {},
): ParseAmountResult {
  const allowNegative = options.allowNegative !== false;
  let s = String(text ?? "").trim();
  if (s === "") return { kind: "empty" };
  if (!unit.supported)
    return {
      kind: "issue",
      message: unit.code
        ? `${unit.code} has no supported minor unit`
        : "Select a currency",
    };

  const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const localizedDigits = Array.from(formatter.format(9876543210));
  const digitMap = new Map(
    localizedDigits.map((digit, index) => [digit, String(9 - index)]),
  );
  s = Array.from(s, (char) => digitMap.get(char) ?? char)
    .join("")
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\u2212/g, "-");
  let negative = false;
  if (s.startsWith("+")) {
    s = s.slice(1);
  } else if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (negative && !allowNegative) {
    return { kind: "issue", message: "Amount cannot be negative" };
  }

  const { group, decimal } = localeSeparators(locale);
  if (/\s/.test(group)) s = s.replace(/\s/g, group);
  if (/['\u2019]/.test(group)) s = s.replace(/['\u2019]/g, group);
  const decimalParts = s.split(decimal);
  if (decimalParts.length > 2)
    return { kind: "issue", message: "Enter a valid amount" };
  let whole = decimalParts[0];
  if (group && whole.includes(group)) {
    const groups = whole.split(group);
    const sampleGroups = new Intl.NumberFormat(locale)
      .formatToParts(123456789)
      .filter((part) => part.type === "integer")
      .map((part) => Array.from(part.value).length);
    const primary = sampleGroups.at(-1) ?? 3;
    const secondary = sampleGroups.at(-2) ?? primary;
    if (
      groups[0].length < 1 ||
      groups[0].length > secondary ||
      groups.at(-1)!.length !== primary ||
      groups.slice(1, -1).some((part) => part.length !== secondary)
    ) {
      return { kind: "issue", message: "Enter a valid grouped amount" };
    }
    whole = groups.join("");
  }
  s = whole + (decimalParts.length === 2 ? `.${decimalParts[1]}` : "");

  if (!/^\d*\.?\d*$/.test(s) || !/\d/.test(s)) {
    return { kind: "issue", message: "Enter a valid amount" };
  }

  const dot = s.indexOf(".");
  const intPart = dot < 0 ? s : s.slice(0, dot);
  // Currency changes may carry old display padding (USD 34.00 -> JPY 34).
  // Discard insignificant zeros, never nonzero precision or partial sub-units.
  const fracPart = dot < 0 ? "" : s.slice(dot + 1).replace(/0+$/, "");
  if (fracPart.length > unit.fractionDigits) {
    return {
      kind: "issue",
      message:
        unit.fractionDigits === 0
          ? "This currency has no decimal places"
          : `Use at most ${unit.fractionDigits} decimal place${
              unit.fractionDigits === 1 ? "" : "s"
            }`,
    };
  }

  // major = numerator / 10^d ; minor = major * factor = numerator * factor / 10^d
  const numerator = BigInt((intPart === "" ? "0" : intPart) + fracPart);
  const denom = 10n ** BigInt(fracPart.length);
  const scaled = numerator * unit.factor;
  if (scaled % denom !== 0n) {
    return {
      kind: "issue",
      message: "Amount is more precise than this currency allows",
    };
  }
  let minor = scaled / denom;
  if (negative) minor = -minor;
  if (minor > MAX_SAFE || minor < -MAX_SAFE) {
    return { kind: "issue", message: "Amount is too large" };
  }
  return { kind: "value", minor: Number(minor) };
}

/**
 * Exact major-unit decimal string for `minorAbs` (absolute value), built with
 * BigInt so precision holds for the whole safe-integer range. `factor` divides
 * `10 ** displayDigits` for every unit {@link currencyUnit} produces (decimal:
 * `10^d | 10^d`; MGA/MRU: `5 | 10`), so the division is exact.
 */
function exactMajorString(minorAbs: bigint, unit: CurrencyUnit): string {
  const dd = Math.max(unit.fractionDigits, unit.minDisplayDigits);
  const scaled = (minorAbs * 10n ** BigInt(dd)) / unit.factor;
  const str = scaled.toString();
  if (dd === 0) return str;
  const padded = str.padStart(dd + 1, "0");
  return `${padded.slice(0, padded.length - dd)}.${padded.slice(
    padded.length - dd,
  )}`;
}

// ECMA-402 accepts exact decimal strings; TypeScript's Intl overload still
// omits them. Do not coerce to Number here: that would lose large cent values.
function formatDecimal(formatter: Intl.NumberFormat, decimal: string): string {
  return (formatter.format as (value: number | bigint | string) => string)(
    decimal,
  );
}

/**
 * Locale-format canonical minor units as a currency string (`$34.23`, `¥34`,
 * `Ar 34.2`). Returns `""` for an unsupported currency or non-finite amount so
 * a malformed value never crashes `Intl`. The exact major string is passed to
 * `Intl.NumberFormat` (which parses decimal strings without precision loss),
 * so large amounts stay exact.
 */
export function formatMinor(
  minor: unknown,
  unit: CurrencyUnit,
  locale?: string,
): string {
  if (
    !unit.supported ||
    typeof minor !== "number" ||
    !Number.isSafeInteger(minor)
  ) {
    return "";
  }
  const negative = minor < 0;
  const abs = BigInt(Math.abs(minor));
  const major = exactMajorString(abs, unit);
  try {
    return formatDecimal(
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: unit.code,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: unit.minDisplayDigits,
        maximumFractionDigits: unit.fractionDigits,
      }),
      `${negative ? "-" : ""}${major}`,
    );
  } catch {
    return "";
  }
}

/**
 * Editable major-unit string for a draft (no currency symbol — the symbol lives
 * in the input-group addon). Grouped for readability by default; the control
 * keeps keystrokes verbatim and only re-derives on blur / external change.
 */
export function minorToEditString(
  minor: unknown,
  unit: CurrencyUnit,
  locale?: string,
  options: { readonly grouping?: boolean } = {},
): string {
  if (
    !unit.supported ||
    typeof minor !== "number" ||
    !Number.isSafeInteger(minor)
  ) {
    return "";
  }
  const negative = minor < 0;
  const abs = BigInt(Math.abs(minor));
  const major = exactMajorString(abs, unit);
  try {
    const formatted = formatDecimal(
      new Intl.NumberFormat(locale, {
        useGrouping: options.grouping ?? true,
        minimumFractionDigits: unit.minDisplayDigits,
        maximumFractionDigits: unit.fractionDigits,
      }),
      major,
    );
    return `${negative ? "-" : ""}${formatted}`;
  } catch {
    return "";
  }
}

/** Amount/currency read out of possibly-noncanonical data, without fabrication. */
export interface MoneyParts {
  /** Finite integer amount in minor units, or `undefined` when absent/invalid. */
  readonly amount: number | undefined;
  /** Non-empty currency string as stored, or `undefined`. Never normalized. */
  readonly currency: string | undefined;
  /** `data` is a plain object we may spread to preserve `$kind` and extras. */
  readonly isRecord: boolean;
}

/**
 * Safely read the money fields from arbitrary `data`. `null`, primitives, and
 * arrays yield empty parts with `isRecord: false` so callers never mistake a
 * noncanonical value for editable money nor let a default rewrite it.
 */
export function readMoneyParts(data: unknown): MoneyParts {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { amount: undefined, currency: undefined, isRecord: false };
  }
  const record = data as Record<string, unknown>;
  const amount =
    typeof record.amount === "number" && Number.isSafeInteger(record.amount)
      ? record.amount
      : undefined;
  const currency =
    typeof record.currency === "string" && record.currency.length > 0
      ? record.currency
      : undefined;
  return { amount, currency, isRecord: true };
}
