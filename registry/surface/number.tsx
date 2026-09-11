"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { useDraftField, useFieldState } from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import { FieldChrome } from "./chrome";

/**
 * Numeric drafts stay text until complete: native number inputs erase a draft
 * such as `1e` to an empty value, which would let an optional field Save stale
 * or missing data. Schema bounds and integer/multipleOf checks remain validator-owned.
 */
export function NumberInput({ data }: SurfaceProps): ReactElement {
  const { dataApi } = useSurface();
  const [text, setText] = useState(() =>
    typeof data === "number" ? String(data) : "",
  );
  const [touched, setTouched] = useState(false);
  const lastEmitted = useRef(data);
  const complete =
    text === "" ||
    (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) &&
      Number.isFinite(Number(text)));
  const { field: fs, resetVersion } = useDraftField(
    complete ? undefined : "Enter a complete, finite number.",
    touched,
  );
  const previousReset = useRef(resetVersion);
  useEffect(() => {
    if (
      previousReset.current === resetVersion &&
      Object.is(data, lastEmitted.current)
    )
      return;
    previousReset.current = resetVersion;
    lastEmitted.current = data;
    setText(typeof data === "number" ? String(data) : "");
    setTouched(false);
  }, [data, resetVersion]);

  return (
    <FieldChrome state={fs}>
      <Input
        type="text"
        inputMode="decimal"
        id={fs.controlId}
        aria-label={fs.showLabels && fs.label ? undefined : fs.label || "Value"}
        value={text}
        required={fs.required}
        readOnly={fs.readOnly}
        aria-invalid={fs.invalid || undefined}
        aria-describedby={fs.describedBy}
        onBlur={() => setTouched(true)}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          setText(raw);
          if (
            raw === "" ||
            (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) &&
              Number.isFinite(Number(raw)))
          ) {
            const next = raw === "" ? undefined : Number(raw);
            lastEmitted.current = next;
            dataApi?.setData(next);
          }
        }}
      />
    </FieldChrome>
  );
}

export function NumberDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const value =
    typeof data === "number" ? new Intl.NumberFormat().format(data) : "";
  return (
    <FieldChrome state={fs}>
      <span className="text-sm">{value}</span>
    </FieldChrome>
  );
}
