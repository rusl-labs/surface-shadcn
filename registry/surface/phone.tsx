"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, ReactElement } from "react";
import {
  useSurface,
  type AnnotationWidget,
  type SurfaceProps,
} from "@rusl-labs/surface";
import {
  interpretPhoneDraft,
  isRecord,
  parsePhoneValue,
  phoneCountryName,
  phoneCountryOptions,
  phoneFlagEmoji,
  resolvePhoneCountry,
  useDraftField,
  useFieldState,
  useSurfaceDefaults,
  type CountryCode,
  type PhoneInterpretation,
} from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { FieldChrome } from "./chrome";

const PHONE_ISSUE = "Enter a valid phone number.";

/** A `tel` widget option read from `widget.<key>` or nested `widget.options.<key>`. */
function readWidget(
  widget: AnnotationWidget | undefined,
  key: string,
): unknown {
  if (!widget) return undefined;
  const top = widget[key];
  if (top !== undefined) return top;
  return isRecord(widget.options) ? widget.options[key] : undefined;
}

/**
 * `tel` widget (`surface.shadcn#/$defs/tel`). Stores E.164 and
 * shows a national/international draft beside a flag/country picker.
 *
 * The picker (region) and the input (national number) together resolve to an
 * E.164 value; a pasted `+international` number is parsed on its own and can
 * switch the picker. Text is kept verbatim while typing — no per-keystroke
 * reformatting — and only prettified on blur. Canonical data is written only
 * when the draft is a *possible* number (libphonenumber `isPossible`, not
 * allocation policing); any nonempty-but-not-possible draft registers a parse
 * issue through {@link useDraftField} so stale/partial input can't be saved.
 */
export function PhoneInput({ data }: SurfaceProps): ReactElement {
  const { entry, dataApi } = useSurface();
  const defaults = useSurfaceDefaults();
  const widget = entry?.widget;

  const rawDefault = readWidget(widget, "defaultCountry");
  const widgetDefault = typeof rawDefault === "string" ? rawDefault : undefined;
  const rawShow = readWidget(widget, "showCountry");
  const showCountry = typeof rawShow === "boolean" ? rawShow : true;
  const rawPlaceholder = readWidget(widget, "placeholder");
  const placeholder =
    typeof rawPlaceholder === "string" && rawPlaceholder.length > 0
      ? rawPlaceholder
      : undefined;
  const rawAuto = readWidget(widget, "autocomplete");
  const autoComplete =
    typeof rawAuto === "string" && rawAuto.length > 0 ? rawAuto : "tel";
  const allowed = useMemo(() => {
    const raw = readWidget(widget, "countries");
    return Array.isArray(raw)
      ? raw.filter((code): code is string => typeof code === "string")
      : undefined;
  }, [widget]);

  const [country, setCountry] = useState<CountryCode | undefined>(() =>
    resolvePhoneCountry({
      value: data,
      widgetDefault,
      providerDefault: defaults.defaultCountry,
      locale: defaults.locale,
      allowed,
    }),
  );
  const [text, setText] = useState(() => {
    const parts = parsePhoneValue(data);
    return parts
      ? parts.country
        ? parts.national
        : parts.international
      : typeof data === "string"
        ? data
        : "";
  });
  const [touched, setTouched] = useState(false);
  const countryChosen = useRef(false);

  // The canonical value we last wrote, so external changes and root resets
  // resync the draft while our own commits leave the caret alone.
  const lastEmitted = useRef<unknown>(data);

  const interpreted = useMemo(
    () => interpretPhoneDraft(text, country),
    [text, country],
  );
  const issue =
    interpreted.empty || interpreted.possible ? undefined : PHONE_ISSUE;

  const { field, resetVersion } = useDraftField(issue, touched);

  // Resync from canonical data on genuine external changes and on root reset.
  // Never writes back: defaults and picker region shape the draft only, so an
  // existing (even null / non-canonical) value is never rewritten here.
  const prevReset = useRef(resetVersion);
  useEffect(() => {
    const resetBumped = prevReset.current !== resetVersion;
    prevReset.current = resetVersion;
    const canonical = typeof data === "string" ? data : undefined;
    if (!resetBumped && Object.is(data, lastEmitted.current)) return;
    lastEmitted.current = data;
    const parts = parsePhoneValue(canonical);
    setText(
      parts
        ? parts.country
          ? parts.national
          : parts.international
        : (canonical ?? ""),
    );
    setCountry(
      parts?.country ??
        resolvePhoneCountry({
          value: canonical,
          widgetDefault,
          providerDefault: defaults.defaultCountry,
          locale: defaults.locale,
          allowed,
        }),
    );
    setTouched(false);
    countryChosen.current = false;
  }, [
    data,
    resetVersion,
    widgetDefault,
    defaults.defaultCountry,
    defaults.locale,
    allowed,
  ]);

  useEffect(() => {
    if (data !== undefined || text !== "" || countryChosen.current) return;
    setCountry(
      resolvePhoneCountry({
        widgetDefault,
        providerDefault: defaults.defaultCountry,
        locale: defaults.locale,
        allowed,
      }),
    );
  }, [
    data,
    text,
    widgetDefault,
    defaults.defaultCountry,
    defaults.locale,
    allowed,
  ]);

  // The picker list depends only on locale / allowed / active region — not on
  // the number draft — so typing never triggers a ~250-country re-sort.
  const options = useMemo(
    () =>
      showCountry
        ? phoneCountryOptions({
            locale: defaults.locale,
            allowed,
            ensure: country,
          })
        : [],
    [showCountry, defaults.locale, allowed, country],
  );

  const commit = (
    raw: string,
    region: CountryCode | undefined,
  ): PhoneInterpretation => {
    const result = interpretPhoneDraft(raw, region);
    if (result.empty || result.possible) {
      const next = result.possible ? result.e164 : undefined;
      lastEmitted.current = next;
      dataApi?.setData(next);
    }
    return result;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const raw = event.currentTarget.value;
    setText(raw);
    const result = commit(raw, country);
    // A pasted / typed +international number can reveal a different region.
    if (
      raw.trim().startsWith("+") &&
      result.country &&
      result.country !== country
    ) {
      setCountry(result.country);
    }
  };

  const handleBlur = (_event: FocusEvent<HTMLInputElement>): void => {
    setTouched(true);
    const result = interpretPhoneDraft(text, country);
    if (!result.possible || !result.e164) return;
    // Prettify only completed values, once editing stops.
    const parts = parsePhoneValue(result.e164);
    if (!parts) return;
    setText(parts.country ? parts.national : parts.international);
    if (parts.country) setCountry(parts.country);
  };

  const inputProps = {
    id: field.controlId,
    type: "tel" as const,
    inputMode: "tel" as const,
    autoComplete,
    "aria-label":
      field.showLabels && field.label.length > 0
        ? undefined
        : field.label || placeholder || "Phone",
    value: text,
    required: field.required,
    readOnly: field.readOnly,
    "aria-invalid": field.invalid || undefined,
    "aria-describedby": field.describedBy,
    ...(placeholder ? { placeholder } : {}),
    onChange: handleChange,
    onBlur: handleBlur,
  };

  if (!showCountry) {
    return (
      <FieldChrome state={field}>
        <Input {...inputProps} />
      </FieldChrome>
    );
  }
  return (
    <FieldChrome state={field}>
      <InputGroup>
        <InputGroupInput {...inputProps} />
        <InputGroupAddon align="inline-start">
          <Combobox
            items={options}
            value={options.find((option) => option.code === country) ?? null}
            itemToStringLabel={(option) =>
              `${option.name} ${option.code} +${option.callingCode}`
            }
            itemToStringValue={(option) => option.code}
            disabled={field.readOnly}
            onValueChange={(option) => {
              if (!option) return;
              countryChosen.current = true;
              setCountry(option.code);
              // Keep an empty optional field mounted while choosing its country.
              if (text !== "") commit(text, option.code);
            }}
          >
            <ComboboxTrigger
              render={
                <InputGroupButton
                  aria-label={`${field.label || "Phone"} country`}
                />
              }
            >
              <ComboboxValue>
                {country
                  ? `${phoneFlagEmoji(country)} +${options.find((option) => option.code === country)?.callingCode ?? ""}`
                  : "Country"}
              </ComboboxValue>
            </ComboboxTrigger>
            <ComboboxContent className="min-w-64">
              <ComboboxInput
                showTrigger={false}
                aria-label="Search countries"
                placeholder="Search countries…"
              />
              <ComboboxEmpty>No countries found.</ComboboxEmpty>
              <ComboboxList>
                {(option) => (
                  <ComboboxItem key={option.code} value={option}>
                    {`${option.flag} ${option.name} ${option.code} +${option.callingCode}`}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </InputGroupAddon>
      </InputGroup>
    </FieldChrome>
  );
}

/**
 * Display: a `tel:` link with annotation-selected formatting, a flag for
 * quick visual country identification (aria-hidden), and an aria-label naming
 * the country for assistive tech. Read-only — never writes canonical data.
 */
export function PhoneDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { locale } = useSurfaceDefaults();
  const { entry } = useSurface();
  const format = readWidget(entry?.widget, "format");
  const parts = parsePhoneValue(data);
  const formatted =
    format === "national"
      ? parts?.national
      : format === "e164"
        ? parts?.e164
        : parts?.international;
  return (
    <FieldChrome state={fs}>
      {parts ? (
        <a
          className="text-sm underline underline-offset-4"
          href={parts.uri}
          aria-label={
            parts.country
              ? `${phoneCountryName(parts.country, locale)} ${formatted}`
              : undefined
          }
        >
          {parts.country ? (
            <span aria-hidden="true" className="mr-1">
              {phoneFlagEmoji(parts.country)}
            </span>
          ) : null}
          {formatted}
        </a>
      ) : (
        <span className="text-sm">{typeof data === "string" ? data : ""}</span>
      )}
    </FieldChrome>
  );
}
