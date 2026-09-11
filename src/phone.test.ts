import { test, expect } from "bun:test";
import {
  interpretPhoneDraft,
  parsePhoneValue,
  phoneCountryOptions,
  phoneFlagEmoji,
  resolvePhoneCountry,
} from "./phone";

// ---- interpretPhoneDraft: draft -> possible E.164 --------------------------

test("national draft under a region yields E.164 and region", () => {
  const r = interpretPhoneDraft("(415) 555-0100", "US");
  expect(r).toMatchObject({
    possible: true,
    e164: "+14155550100",
    country: "US",
  });
});

test("pasted +international resolves its own region, ignoring the picker", () => {
  const r = interpretPhoneDraft("+442071838750", "US");
  expect(r).toMatchObject({
    possible: true,
    e164: "+442071838750",
    country: "GB",
  });
});

test("incomplete national is not possible and stores nothing", () => {
  const r = interpretPhoneDraft("415", "US");
  expect(r.empty).toBe(false);
  expect(r.possible).toBe(false);
  expect(r.e164).toBeUndefined();
});

test("blank draft is flagged empty, not an issue", () => {
  expect(interpretPhoneDraft("   ", "US")).toMatchObject({
    empty: true,
    possible: false,
  });
});

test("garbage is not possible", () => {
  expect(interpretPhoneDraft("abc", "US").possible).toBe(false);
});

test("national digits with no region cannot resolve", () => {
  expect(interpretPhoneDraft("4155550100", undefined).possible).toBe(false);
});

test("extensions cannot be silently discarded from canonical phone data", () => {
  expect(interpretPhoneDraft("+1 415 555 0100 ext. 42", "US").possible).toBe(
    false,
  );
});

test("a phone embedded in prose is not silently extracted as the field value", () => {
  expect(interpretPhoneDraft("Call me at +1 415 555 0100", "US").possible).toBe(
    false,
  );
  expect(parsePhoneValue("Call me at +14155550100")).toBeUndefined();
});

// ---- parsePhoneValue: stored E.164 -> display parts ------------------------

test("stored E.164 exposes national, international, tel URI, region", () => {
  expect(parsePhoneValue("+14155550100")).toEqual({
    e164: "+14155550100",
    country: "US",
    national: "(415) 555-0100",
    international: "+1 415 555 0100",
    uri: "tel:+14155550100",
  });
});

test("non-string and empty values do not parse", () => {
  expect(parsePhoneValue(null)).toBeUndefined();
  expect(parsePhoneValue(undefined)).toBeUndefined();
  expect(parsePhoneValue("")).toBeUndefined();
});

// ---- resolvePhoneCountry: default-region precedence ------------------------

test("region of an existing value wins over every default", () => {
  expect(
    resolvePhoneCountry({
      value: "+442071838750",
      widgetDefault: "US",
      providerDefault: "AU",
      locale: "en-US",
    }),
  ).toBe("GB");
});

test("widget default beats provider default beats explicit locale region", () => {
  expect(
    resolvePhoneCountry({
      widgetDefault: "US",
      providerDefault: "AU",
      locale: "en-CA",
    }),
  ).toBe("US");
  expect(resolvePhoneCountry({ providerDefault: "AU", locale: "en-US" })).toBe(
    "AU",
  );
  expect(resolvePhoneCountry({ locale: "en-GB" })).toBe("GB");
});

test("a bare locale never invents a region", () => {
  expect(resolvePhoneCountry({ locale: "en" })).toBeUndefined();
  expect(resolvePhoneCountry({})).toBeUndefined();
});

test("allowed list clamps defaults but a permitted locale region passes", () => {
  expect(
    resolvePhoneCountry({
      providerDefault: "US",
      locale: "en-CA",
      allowed: ["AU", "GB"],
    }),
  ).toBeUndefined();
  expect(resolvePhoneCountry({ locale: "en-AU", allowed: ["AU", "GB"] })).toBe(
    "AU",
  );
});

// ---- phoneCountryOptions: the picker list ----------------------------------

test("options are filtered, localized, and sorted by name", () => {
  const opts = phoneCountryOptions({
    locale: "en",
    allowed: ["US", "GB", "AU"],
  });
  expect(opts).toHaveLength(3);
  expect(opts.map((o) => o.name)).toEqual([
    "Australia",
    "United Kingdom",
    "United States",
  ]);
  const us = opts.find((o) => o.code === "US");
  expect(us).toMatchObject({ callingCode: "1", flag: "🇺🇸" });
});

test("ensure force-includes the active region even when filtered out", () => {
  const opts = phoneCountryOptions({
    locale: "en",
    allowed: ["GB"],
    ensure: "FR",
  });
  expect(opts.some((o) => o.code === "FR")).toBe(true);
});

test("flag emoji derives from the ISO code and rejects non-codes", () => {
  expect(phoneFlagEmoji("GB")).toBe("🇬🇧");
  expect(phoneFlagEmoji("Z")).toBe("");
});
