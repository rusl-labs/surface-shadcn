"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import {
  useSurface,
  type AnnotationWidget,
  type SurfaceContext,
  type SurfaceProps,
} from "@rusl-labs/surface";
import {
  currencySymbol,
  currencyUnit,
  formatMinor,
  isRecord,
  minorToEditString,
  parseMajorToMinor,
  readMoneyParts,
  useDraftField,
  useFieldState,
  useSurfaceDefaults,
  type FieldState,
} from "@rusl-labs/surface-shadcn";
import {
  InputGroup,
  InputGroupButton,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
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

/**
 * A `money` widget option read from `widget.<key>` or nested
 * `widget.options.<key>`; the top-level key wins, mirroring the `tel` widget.
 */
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
 * The default currency to seed a *missing* canonical value: the requested
 * schema/provider default when it is offered, else the first offered code.
 * When a constraint (schema enum / widget allowlist) leaves no offered code,
 * returns undefined so the field requires a currency instead of emitting an
 * excluded default. Unconstrained, any requested default stands.
 */
function allowedDefaultCurrency(
  wanted: string | undefined,
  allowedCodes: readonly string[],
  constrained: boolean,
): string | undefined {
  if (!constrained) return wanted;
  if (wanted !== undefined) {
    const match = allowedCodes.find(
      (code) => code.toUpperCase() === wanted.toUpperCase(),
    );
    if (match !== undefined) return match;
  }
  return allowedCodes.length > 0 ? allowedCodes[0] : undefined;
}

/**
 * Money renders as a single atomic control, so validation issues that AJV
 * reports under `['amount']` / `['currency']` are not in the node's own (`[]`)
 * field chrome. After a Save attempt, fold those descendant issues onto this
 * control. We never re-show whole-root validation — `surface.validity` is
 * already projected relative to this node, so every issue here is ours.
 */
function mergeChildIssues(
  field: FieldState,
  surface: SurfaceContext,
): FieldState {
  if (surface.formSubmitted !== true) return field;
  const descendant = (surface.validity?.issues ?? []).filter(
    (issue) => issue.path.length > 0,
  );
  if (descendant.length === 0) return field;
  const errorsId = `${field.controlId}-errors`;
  const describedBy = field.describedBy?.includes(errorsId)
    ? field.describedBy
    : [field.describedBy, errorsId].filter(Boolean).join(" ") || undefined;
  return {
    ...field,
    issues: [...field.issues, ...descendant],
    invalid: true,
    describedBy,
  };
}

/**
 * Canonical `money` renderer: an InputGroup whose addon shows the currency
 * (symbol + code, or a picker when none is configured) and whose input edits
 * the human, major-unit amount. Emits `{ amount, currency }` with `amount` in
 * exact integer minor units, preserving any `$kind` / extra keys already on the
 * value. Shared by every named view (identity/row/card/…).
 */
export function MoneyInput({ data }: SurfaceProps): ReactElement {
  const surface = useSurface();
  const { schema, dataApi, entry } = surface;
  const { locale, defaultCurrency } = useSurfaceDefaults();

  const parts = readMoneyParts(data);

  const props =
    isRecord(schema) && isRecord(schema.properties)
      ? schema.properties
      : undefined;
  const amountSchema =
    props && isRecord(props.amount) ? props.amount : undefined;
  const declaredMin =
    amountSchema && typeof amountSchema.minimum === "number"
      ? amountSchema.minimum
      : amountSchema && typeof amountSchema.exclusiveMinimum === "number"
        ? amountSchema.exclusiveMinimum
        : undefined;
  // Canonical `amount` may be negative; respect a composed non-negative bound.
  const allowNegative = !(typeof declaredMin === "number" && declaredMin >= 0);

  const currencySchema =
    props && isRecord(props.currency) ? props.currency : undefined;
  const currencyConst =
    currencySchema && typeof currencySchema.const === "string"
      ? currencySchema.const
      : undefined;
  const currencyDefault =
    currencySchema && typeof currencySchema.default === "string"
      ? currencySchema.default
      : undefined;
  const schemaEnum =
    currencySchema && Array.isArray(currencySchema.enum)
      ? currencySchema.enum.filter((v): v is string => typeof v === "string")
      : undefined;
  const schemaEnumKey = schemaEnum ? schemaEnum.join("|") : "";
  const providerDefault =
    typeof defaultCurrency === "string" && defaultCurrency.length > 0
      ? defaultCurrency
      : undefined;

  // Widget currency allowlist: top-level `currencies` wins over
  // `options.currencies`. Absent ⇒ no restriction; explicit [] ⇒ no options
  // (never widened to the full list). Authored order is preserved and deduped,
  // upper-cased so a selected value stays a valid ISO 4217 code.
  const allowlist = useMemo<readonly string[] | undefined>(() => {
    const raw = readWidget(entry?.widget, "currencies");
    if (!Array.isArray(raw)) return undefined;
    const codes: string[] = [];
    for (const value of raw) {
      if (typeof value !== "string") continue;
      const code = value.trim().toUpperCase();
      if (code.length === 0 || codes.includes(code)) continue;
      codes.push(code);
    }
    return codes;
  }, [entry?.widget]);

  // Offered currency codes: the widget allowlist (or schema enum, or the full
  // runtime list), always intersected with the schema enum and narrowed to
  // codes we can convert. Presentation only — never a new validation of data.
  const allowedCodes = useMemo<readonly string[]>(() => {
    if (currencyConst !== undefined) return [];
    const supportedValuesOf = (
      Intl as typeof Intl & {
        supportedValuesOf?: (key: string) => string[];
      }
    ).supportedValuesOf;
    const enumerated =
      schemaEnumKey.length > 0 ? schemaEnumKey.split("|") : undefined;
    let candidates: readonly string[];
    if (allowlist) {
      candidates = allowlist;
      if (enumerated) {
        const enumUpper = enumerated.map((code) => code.toUpperCase());
        candidates = candidates.filter((code) => enumUpper.includes(code));
      }
    } else if (enumerated) {
      candidates = enumerated;
    } else if (supportedValuesOf) {
      candidates = supportedValuesOf("currency");
    } else {
      candidates = [];
    }
    return candidates.filter((code) => currencyUnit(code, locale).supported);
  }, [currencyConst, allowlist, schemaEnumKey, locale]);

  // A schema enum or widget allowlist constrains which default may seed a
  // missing canonical currency; with neither, any schema/provider default holds.
  const constrained = allowlist !== undefined || schemaEnum !== undefined;
  const allowedDefault = allowedDefaultCurrency(
    currencyDefault ?? providerDefault,
    allowedCodes,
    constrained,
  );

  // Defaults choose the initial currency; only a schema const fixes it.
  const initialCurrency = currencyConst ?? parts.currency ?? allowedDefault;

  const [draft, setDraft] = useState<string>(() =>
    parts.amount !== undefined && initialCurrency !== undefined
      ? minorToEditString(
          parts.amount,
          currencyUnit(initialCurrency, locale),
          locale,
        )
      : "",
  );
  const [pickedCurrency, setPickedCurrency] = useState("");
  const [touched, setTouched] = useState(false);
  const [draftLocale, setDraftLocale] = useState(locale);
  const [issue, setIssue] = useState<string | undefined>(undefined);
  const lastEmittedRef = useRef<unknown>(data);
  const syncRef = useRef<{ data: unknown; reset: number } | null>(null);

  const storedAmountIssue =
    isRecord(data) &&
    data.amount !== undefined &&
    (typeof data.amount !== "number" || !Number.isSafeInteger(data.amount))
      ? "Amount must be a safe integer in minor units"
      : undefined;
  const { field, resetVersion } = useDraftField(
    issue ?? storedAmountIssue,
    touched,
  );

  if (syncRef.current === null) {
    syncRef.current = {
      data,
      reset: resetVersion,
    };
  }

  // Re-derive the draft from external data changes and root resets, but never
  // from our own echoed writes (that would reformat mid-keystroke / fight the
  // caret). Standard "adjust state during render" pattern, guarded by refs.
  const isEcho = Object.is(lastEmittedRef.current, data);
  const sync = syncRef.current;
  const externalChanged = !Object.is(sync.data, data);
  if (resetVersion !== sync.reset || (externalChanged && !isEcho)) {
    syncRef.current = {
      data,
      reset: resetVersion,
    };
    lastEmittedRef.current = data;
    const cur = initialCurrency;
    setDraft(
      parts.amount !== undefined && cur !== undefined
        ? minorToEditString(parts.amount, currencyUnit(cur, locale), locale)
        : "",
    );
    setPickedCurrency("");
    setTouched(false);
    setIssue(undefined);
    setDraftLocale(locale);
  } else if (externalChanged) {
    syncRef.current = {
      data,
      reset: resetVersion,
    };
  }

  // Invalid drafts retain their parsing locale until corrected; a formatting
  // change must not reinterpret separators or make old canonical data savable.
  const draftRef = useRef({
    issue,
    amount: parts.amount,
    currency: initialCurrency,
  });
  draftRef.current = { issue, amount: parts.amount, currency: initialCurrency };
  useEffect(() => {
    const current = draftRef.current;
    if (current.issue !== undefined) return;
    if (current.amount !== undefined && current.currency !== undefined) {
      setDraft(
        minorToEditString(
          current.amount,
          currencyUnit(current.currency, locale),
          locale,
        ),
      );
    }
    setDraftLocale(locale);
  }, [locale]);

  const pickable = currencyConst === undefined;
  // Keep a user's pending choice even when the amount needs correction for
  // its precision. Canonical data is updated only once both are valid.
  const effectiveCurrency =
    currencyConst ?? (pickedCurrency || parts.currency || allowedDefault);
  const unit = useMemo(
    () => currencyUnit(effectiveCurrency, locale),
    [effectiveCurrency, locale],
  );
  const symbol =
    effectiveCurrency !== undefined
      ? currencySymbol(effectiveCurrency, locale)
      : "";

  const currencyOptions = useMemo(() => {
    let names: Intl.DisplayNames | undefined;
    try {
      names = new Intl.DisplayNames([locale], { type: "currency" });
    } catch {
      names = undefined;
    }
    return allowedCodes.map((code) => {
      let label = code;
      try {
        const name = names?.of(code);
        if (name && name !== code) label = `${code} — ${name}`;
      } catch {
        /* keep bare code */
      }
      return { code, label };
    });
  }, [allowedCodes, locale]);

  const commit = (rawText: string, currency: string | undefined): void => {
    if (field.readOnly) return;
    const activeUnit =
      currency === effectiveCurrency ? unit : currencyUnit(currency, locale);
    const result = parseMajorToMinor(rawText, activeUnit, draftLocale, {
      allowNegative,
    });
    if (result.kind === "empty") {
      // A cleared amount removes the whole money node (optional field) or, when
      // required, surfaces as a missing-required issue at the root.
      setIssue(undefined);
      lastEmittedRef.current = undefined;
      dataApi?.setData(undefined);
      return;
    }
    if (result.kind === "issue") {
      // Do not write: registering the issue blocks Save so stale-but-valid
      // canonical data can't be saved behind an unparseable draft.
      setIssue(result.message);
      return;
    }
    // A parsed value implies a supported currency (else parse returns an issue).
    setIssue(undefined);
    const base = isRecord(data) ? data : {};
    const next = {
      ...base,
      amount: result.minor,
      currency: currency as string,
    };
    lastEmittedRef.current = next;
    dataApi?.setData(next);
  };

  const onAmountChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const raw = event.currentTarget.value;
    setDraft(raw); // verbatim — no reformat, so the caret never jumps
    if (raw === "") setPickedCurrency(effectiveCurrency ?? "");
    commit(raw, effectiveCurrency);
  };

  const onAmountBlur = (): void => {
    setTouched(true);
    const result = parseMajorToMinor(draft, unit, draftLocale, {
      allowNegative,
    });
    if (result.kind === "value") {
      setDraft(minorToEditString(result.minor, unit, locale));
      setDraftLocale(locale);
    }
  };

  const onCurrencyChange = (code: string): void => {
    setPickedCurrency(code);
    setTouched(true);
    // Selecting a unit is not clearing the optional field.
    if (draft !== "") commit(draft, code);
  };

  const chromeField = mergeChildIssues(field, surface);
  const placeholder = unit.supported
    ? minorToEditString(0, unit, locale, { grouping: false })
    : "0";
  const prefix =
    symbol.length > 0 && symbol !== unit.code
      ? `${symbol} ${unit.code}`
      : unit.code;

  return (
    <FieldChrome state={chromeField}>
      <InputGroup>
        <InputGroupInput
          id={chromeField.controlId}
          inputMode="decimal"
          autoComplete="off"
          aria-label={
            chromeField.showLabels && chromeField.label
              ? undefined
              : chromeField.label || "Amount"
          }
          value={draft}
          placeholder={placeholder}
          required={chromeField.required}
          readOnly={chromeField.readOnly}
          aria-invalid={chromeField.invalid || undefined}
          aria-describedby={chromeField.describedBy}
          onChange={onAmountChange}
          onBlur={onAmountBlur}
        />
        <InputGroupAddon align="inline-start">
          {pickable ? (
            <Combobox
              items={currencyOptions}
              value={
                currencyOptions.find(
                  (option) => option.code === effectiveCurrency,
                ) ?? null
              }
              itemToStringLabel={(option) => option.label}
              itemToStringValue={(option) => option.code}
              onValueChange={(option) => {
                if (option) onCurrencyChange(option.code);
              }}
              disabled={
                chromeField.readOnly || currencySchema?.readOnly === true
              }
            >
              <ComboboxTrigger
                render={<InputGroupButton aria-label="Currency" />}
              >
                <ComboboxValue>{prefix || "Currency"}</ComboboxValue>
              </ComboboxTrigger>
              <ComboboxContent className="min-w-64">
                <ComboboxInput
                  showTrigger={false}
                  aria-label="Search currencies"
                  placeholder="Search currencies…"
                />
                <ComboboxEmpty>No currencies found.</ComboboxEmpty>
                <ComboboxList>
                  {(option) => (
                    <ComboboxItem key={option.code} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          ) : (
            <InputGroupText>{prefix}</InputGroupText>
          )}
        </InputGroupAddon>
      </InputGroup>
    </FieldChrome>
  );
}

/**
 * Read-only money. Formats stored minor units for the browser locale, never
 * borrowing a provider default for a missing currency (that would mislabel the
 * value). Malformed data degrades to a best-effort string rather than crashing
 * `Intl`.
 */
export function MoneyDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { locale } = useSurfaceDefaults();
  const parts = readMoneyParts(data);

  let text = "";
  if (parts.amount !== undefined && parts.currency !== undefined) {
    const unit = currencyUnit(parts.currency, locale);
    text =
      formatMinor(parts.amount, unit, locale) ||
      `${parts.amount} ${parts.currency} (minor units)`;
  } else if (parts.amount !== undefined) {
    // Amount without a currency: show the bare number (no fabricated symbol).
    text = new Intl.NumberFormat(locale).format(parts.amount);
  }

  return (
    <FieldChrome state={fs}>
      <span className="text-sm">{text}</span>
    </FieldChrome>
  );
}
