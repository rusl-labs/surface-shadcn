import { expect, test } from "bun:test";
import {
  currencyUnit,
  formatMinor,
  minorToEditString,
  parseMajorToMinor,
  readMoneyParts,
} from "./money";

test("currency minor units determine precision without floating point rounding", () => {
  expect(parseMajorToMinor("34.23", currencyUnit("USD"), "en-US")).toEqual({
    kind: "value",
    minor: 3423,
  });
  expect(parseMajorToMinor("34", currencyUnit("JPY"), "en-US")).toEqual({
    kind: "value",
    minor: 34,
  });
  expect(parseMajorToMinor("1.234", currencyUnit("BHD"), "en-US")).toEqual({
    kind: "value",
    minor: 1234,
  });
  expect(parseMajorToMinor("34.1", currencyUnit("JPY"), "en-US").kind).toBe(
    "issue",
  );
  expect(parseMajorToMinor("34.231", currencyUnit("USD"), "en-US").kind).toBe(
    "issue",
  );
});

test("non-decimal ISO currencies reject partial minor units", () => {
  const unit = currencyUnit("MGA");
  expect(parseMajorToMinor("34.2", unit, "en-US")).toEqual({
    kind: "value",
    minor: 171,
  });
  expect(parseMajorToMinor("34.1", unit, "en-US").kind).toBe("issue");
  expect(
    parseMajorToMinor(minorToEditString(171, unit, "en-US"), unit, "en-US"),
  ).toEqual({ kind: "value", minor: 171 });
});

test("a foreign decimal separator cannot silently multiply a German amount", () => {
  const unit = currencyUnit("EUR");
  expect(parseMajorToMinor("34.23", unit, "de-DE").kind).toBe("issue");
  expect(parseMajorToMinor("1.234,56", unit, "de-DE")).toEqual({
    kind: "value",
    minor: 123456,
  });
  expect(parseMajorToMinor("12,34", unit, "en-US").kind).toBe("issue");
});

test("localized editing strings round-trip including non-Latin digits and grouping", () => {
  const unit = currencyUnit("USD");
  for (const locale of ["en-US", "de-DE", "fr-FR", "hi-IN", "ar-EG"]) {
    const text = minorToEditString(-123456789, unit, locale);
    expect(parseMajorToMinor(text, unit, locale)).toEqual({
      kind: "value",
      minor: -123456789,
    });
  }
});

test("safe integer boundaries retain every cent and reject overflow", () => {
  const unit = currencyUnit("USD");
  const maximum = Number.MAX_SAFE_INTEGER;
  expect(
    parseMajorToMinor(minorToEditString(maximum, unit, "en-US"), unit, "en-US"),
  ).toEqual({ kind: "value", minor: maximum });
  expect(parseMajorToMinor("90071992547409.92", unit, "en-US").kind).toBe(
    "issue",
  );
  expect(formatMinor(maximum, unit, "en-US")).toBe("$90,071,992,547,409.91");
  expect(formatMinor(1.5, unit, "en-US")).toBe("");
});

test("intermediate and unsupported values do not emit canonical amounts", () => {
  expect(parseMajorToMinor("-", currencyUnit("USD"), "en-US").kind).toBe(
    "issue",
  );
  expect(parseMajorToMinor(".", currencyUnit("USD"), "en-US").kind).toBe(
    "issue",
  );
  expect(parseMajorToMinor("12", currencyUnit("ZZZ"), "en-US").kind).toBe(
    "issue",
  );
  expect(parseMajorToMinor("1", currencyUnit("XAU"), "en-US").kind).toBe(
    "issue",
  );
});

test("changing currency accepts insignificant zeros without rounding the amount", () => {
  const dollars = minorToEditString(3400, currencyUnit("USD"), "en-US");
  expect(parseMajorToMinor(dollars, currencyUnit("JPY"), "en-US")).toEqual({
    kind: "value",
    minor: 34,
  });
  expect(parseMajorToMinor("34.20", currencyUnit("JPY"), "en-US").kind).toBe(
    "issue",
  );
});

test("canonical money rejects fractional and unsafe minor-unit amounts", () => {
  expect(
    readMoneyParts({ amount: 34.5, currency: "USD" }).amount,
  ).toBeUndefined();
  expect(
    readMoneyParts({ amount: Number.MAX_SAFE_INTEGER + 1, currency: "USD" })
      .amount,
  ).toBeUndefined();
  expect(
    readMoneyParts({ amount: -Number.MAX_SAFE_INTEGER, currency: "USD" })
      .amount,
  ).toBe(-Number.MAX_SAFE_INTEGER);
});

test("zero is a real amount, not an empty draft or missing value", () => {
  // A truthiness read (`record.amount ? … : undefined`) would drop a $0.00.
  expect(readMoneyParts({ amount: 0, currency: "USD" }).amount).toBe(0);
  const usd = currencyUnit("USD");
  // $0.00 must round-trip as an editable draft and a formatted value, not "".
  expect(minorToEditString(0, usd, "en-US")).toBe("0.00");
  expect(formatMinor(0, usd, "en-US")).toBe("$0.00");
});
