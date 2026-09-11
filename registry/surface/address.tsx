"use client";

import { useMemo, type ChangeEvent, type ReactElement } from "react";
import {
  useSurface,
  type SurfaceContext,
  type SurfaceProps,
} from "@rusl-labs/surface";
import {
  isRecord,
  useFieldState,
  type FieldState,
} from "@rusl-labs/surface-shadcn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** Canonical `$id` for a US postal address. */
export const US_ADDRESS_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/us-address";

type Region = { readonly code: string; readonly name: string };

/** ISO 3166-2:US principal subdivisions, names for the picker only. */
const US_REGIONS: readonly Region[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "AS", name: "American Samoa" },
  { code: "GU", name: "Guam" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "PR", name: "Puerto Rico" },
  { code: "VI", name: "U.S. Virgin Islands" },
  { code: "UM", name: "U.S. Minor Outlying Islands" },
];

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatZip(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatAddress(data: unknown, oneLine: boolean): string {
  if (!isRecord(data)) return "";
  const street = [text(data.street1), text(data.street2)].filter(
    (line) => line.length > 0,
  );
  const city = text(data.city);
  const region = text(data.region);
  const zip = text(data.postalCode);
  const locality = [city, [region, zip].filter(Boolean).join(" ")]
    .filter((part) => part.length > 0)
    .join(", ");
  const parts = [...street, locality].filter((part) => part.length > 0);
  return parts.join(oneLine ? ", " : "\n");
}

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
 * USPS-style address editor: street, optional unit, then city / state / ZIP.
 * Country and `$kind` are consts — written, never shown. Chapel fields stay
 * in the payload if present.
 */
export function UsAddressInput({ data }: SurfaceProps): ReactElement {
  const surface = useSurface();
  const { dataApi, isRoot } = surface;
  const field = mergeChildIssues(useFieldState(), surface);
  const chrome: FieldState = {
    ...field,
    label: isRoot === true ? "" : field.label,
    description: "",
  };
  const record = isRecord(data) ? data : {};
  const street1 = text(record.street1);
  const street2 = text(record.street2);
  const city = text(record.city);
  const region = text(record.region);
  const postalCode = text(record.postalCode);
  const selected =
    US_REGIONS.find((item) => item.code === region) ??
    (region.length > 0 ? { code: region, name: region } : null);
  const regions = useMemo(() => [...US_REGIONS], []);

  const commit = (patch: Record<string, string>): void => {
    if (field.readOnly) return;
    const next: Record<string, unknown> = {
      ...record,
      $kind: US_ADDRESS_ID,
      countryCode: "US",
      ...patch,
    };
    for (const key of ["street1", "street2", "city", "region", "postalCode"]) {
      if (next[key] === "") delete next[key];
    }
    dataApi?.setData(next);
  };

  const onText =
    (key: string, format?: (raw: string) => string) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const raw = event.currentTarget.value;
      commit({ [key]: format ? format(raw) : raw });
    };

  return (
    <FieldChrome state={chrome}>
      <div className="flex w-full min-w-0 flex-col gap-2">
        <Input
          id={field.controlId}
          autoComplete="address-line1"
          placeholder="Street address"
          aria-label="Street address"
          maxLength={64}
          value={street1}
          required={field.required}
          readOnly={field.readOnly}
          aria-invalid={field.invalid || undefined}
          aria-describedby={field.describedBy}
          onChange={onText("street1")}
        />
        <Input
          id={`${field.controlId}-street2`}
          autoComplete="address-line2"
          placeholder="Apt, suite, unit"
          aria-label="Apartment, suite, or unit"
          maxLength={64}
          value={street2}
          readOnly={field.readOnly}
          onChange={onText("street2")}
        />
        <div className="flex min-w-0 flex-row gap-2">
          <Input
            id={`${field.controlId}-city`}
            className="min-w-0 flex-1"
            autoComplete="address-level2"
            placeholder="City"
            aria-label="City"
            maxLength={120}
            value={city}
            required={field.required}
            readOnly={field.readOnly}
            onChange={onText("city")}
          />
          <Combobox
            items={regions}
            value={selected}
            itemToStringLabel={(item) => `${item.name} ${item.code}`}
            itemToStringValue={(item) => item.code}
            disabled={field.readOnly}
            onValueChange={(item) => {
              commit({ region: item?.code ?? "" });
            }}
          >
            <ComboboxTrigger
              id={`${field.controlId}-region`}
              aria-label="State"
              disabled={field.readOnly}
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-36 shrink-0 justify-between"
                />
              }
            >
              <ComboboxValue>{selected?.code ?? "State"}</ComboboxValue>
            </ComboboxTrigger>
            <ComboboxContent className="min-w-64">
              <ComboboxInput
                showTrigger={false}
                aria-label="Search states"
                placeholder="Search states…"
              />
              <ComboboxEmpty>No states found.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.code} value={item}>
                    {item.name} {item.code}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <Input
            id={`${field.controlId}-postal`}
            className="w-28 shrink-0"
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="ZIP"
            aria-label="ZIP code"
            value={postalCode}
            required={field.required}
            readOnly={field.readOnly}
            onChange={onText("postalCode", formatZip)}
          />
        </div>
      </div>
    </FieldChrome>
  );
}

/** Postal block; row view is one scan line. Country is implied. */
export function UsAddressDisplay({ data }: SurfaceProps): ReactElement {
  const { isRoot, view } = useSurface();
  const field = useFieldState();
  const chrome: FieldState = {
    ...field,
    label: isRoot === true ? "" : field.label,
    description: "",
  };
  const oneLine = view === "row";
  const textValue = formatAddress(data, oneLine);
  return (
    <FieldChrome state={chrome}>
      <span className={oneLine ? "text-sm" : "text-sm whitespace-pre-wrap"}>
        {textValue}
      </span>
    </FieldChrome>
  );
}
