"use client";

import { useState, type ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { useFieldState } from "@rusl-labs/surface-shadcn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FieldChrome } from "./chrome";
import { widgetBoolean, widgetString } from "./widget";

function parseDateOnly(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function captionLayout(widget: Parameters<typeof widgetString>[0]) {
  const value = widgetString(widget, "captionLayout");
  return value === "dropdown" ||
    value === "dropdown-months" ||
    value === "dropdown-years"
    ? value
    : "label";
}

function calendarDisabled(widget: Parameters<typeof widgetString>[0]) {
  const min = parseDateOnly(widgetString(widget, "min"));
  const max = parseDateOnly(widgetString(widget, "max"));
  const matchers = [
    ...(min !== undefined ? [{ before: min }] : []),
    ...(max !== undefined ? [{ after: max }] : []),
  ];
  return matchers.length > 0 ? matchers : undefined;
}

export function DateInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { dataApi, entry } = useSurface();
  const selected = parseDateOnly(data);
  return (
    <FieldChrome state={fs}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={fs.controlId}
              variant="outline"
              disabled={fs.readOnly}
              aria-invalid={fs.invalid || undefined}
              aria-describedby={fs.describedBy}
              className="w-full justify-start font-normal"
            />
          }
        >
          {selected ? formatDateOnly(selected) : "Pick a date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout={captionLayout(entry?.widget)}
            disabled={calendarDisabled(entry?.widget)}
            selected={selected}
            onSelect={(date) => {
              dataApi?.setData(date ? formatDateOnly(date) : undefined);
            }}
          />
        </PopoverContent>
      </Popover>
    </FieldChrome>
  );
}

export function DateDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const selected = parseDateOnly(data);
  return (
    <FieldChrome state={fs}>
      <span className="text-sm">
        {selected
          ? selected.toLocaleDateString(undefined, { dateStyle: "medium" })
          : ""}
      </span>
    </FieldChrome>
  );
}

function splitDateTime(value: unknown): { date?: string; time: string } {
  if (typeof value !== "string") return { time: "00:00" };
  const [date, rest = ""] = value.split("T");
  const time = rest.replace(/Z$/, "").slice(0, 8);
  return { date, time: time.length >= 5 ? time : "00:00" };
}

export function DateTimeInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { dataApi, entry } = useSurface();
  const parts = splitDateTime(data);
  const selected = parseDateOnly(parts.date);
  const showSeconds = widgetBoolean(entry?.widget, "showSeconds") === true;
  const [time, setTime] = useState(parts.time.slice(0, showSeconds ? 8 : 5));

  function commit(date: Date | undefined, nextTime: string) {
    if (!date) {
      dataApi?.setData(undefined);
      return;
    }
    const stamp = nextTime.length >= 5 ? nextTime : "00:00";
    dataApi?.setData(`${formatDateOnly(date)}T${stamp}`);
  }

  return (
    <FieldChrome state={fs}>
      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                id={fs.controlId}
                variant="outline"
                disabled={fs.readOnly}
                className="min-w-40 justify-start font-normal"
              />
            }
          >
            {selected ? formatDateOnly(selected) : "Pick a date"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              captionLayout={captionLayout(entry?.widget)}
              disabled={calendarDisabled(entry?.widget)}
              selected={selected}
              onSelect={(date) => commit(date, time)}
            />
          </PopoverContent>
        </Popover>
        <Input
          type={showSeconds ? "time" : "time"}
          step={showSeconds ? 1 : 60}
          value={time}
          disabled={fs.readOnly}
          aria-label="Time"
          className="w-36"
          onChange={(event) => {
            const next = event.currentTarget.value;
            setTime(next);
            commit(selected, next);
          }}
        />
      </div>
    </FieldChrome>
  );
}

export function DateTimeDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const text =
    typeof data === "string" && data.length > 0
      ? new Date(data).toString() === "Invalid Date"
        ? data
        : new Date(data).toLocaleString()
      : "";
  return (
    <FieldChrome state={fs}>
      <span className="text-sm">{text}</span>
    </FieldChrome>
  );
}
