"use client";

import { useMemo, useState, type ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FieldChrome } from "./chrome";
import { ArrayInput } from "./array";
import { widgetBoolean, widgetOption, widgetString } from "./widget";

function atPath(data: unknown, path: string): unknown {
  let value = data;
  for (const segment of path.split(".")) {
    if (!isRecord(value) || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

type Column = {
  field: string;
  label: string;
  align?: string;
  sortable: boolean;
};

function columnsFrom(
  widget: Parameters<typeof widgetOption>[0],
  rows: unknown[],
): Column[] {
  const raw = widgetOption(widget, "columns");
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.flatMap((column) => {
      if (!isRecord(column) || typeof column.field !== "string") return [];
      return [
        {
          field: column.field,
          label: typeof column.label === "string" ? column.label : column.field,
          align: typeof column.align === "string" ? column.align : undefined,
          sortable: column.sortable !== false,
        },
      ];
    });
  }
  const keys = new Set<string>();
  for (const row of rows) {
    if (isRecord(row)) for (const key of Object.keys(row)) keys.add(key);
  }
  return [...keys].map((field) => ({ field, label: field, sortable: true }));
}

export function TableDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { entry } = useSurface();
  const rows = Array.isArray(data) ? data : [];
  const columns = columnsFrom(entry?.widget, rows);
  const initial = widgetOption(entry?.widget, "sort");
  const [sort, setSort] = useState<
    { field: string; direction: "asc" | "desc" } | undefined
  >(
    isRecord(initial) && typeof initial.field === "string"
      ? {
          field: initial.field,
          direction: initial.direction === "desc" ? "desc" : "asc",
        }
      : undefined,
  );
  const ordered = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((left, right) => {
      const a = cellText(atPath(left, sort.field));
      const b = cellText(atPath(right, sort.field));
      return sort.direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });
  }, [rows, sort]);

  return (
    <FieldChrome state={fs}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.field}
                className={
                  column.align === "right"
                    ? "text-right"
                    : column.align === "center"
                      ? "text-center"
                      : undefined
                }
              >
                {column.sortable ? (
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() =>
                      setSort((current) => ({
                        field: column.field,
                        direction:
                          current?.field === column.field &&
                          current.direction === "asc"
                            ? "desc"
                            : "asc",
                      }))
                    }
                  >
                    {column.label}
                  </button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  className={
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                        ? "text-center"
                        : undefined
                  }
                >
                  {cellText(atPath(row, column.field))}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </FieldChrome>
  );
}

export const TableInput = ArrayInput;

export function ListDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { Surface, schema, mode, view, entry } = useSurface();
  const rows = Array.isArray(data) ? data : [];
  const items =
    isRecord(schema) && isRecord(schema.items) ? schema.items : undefined;
  const marker = widgetString(entry?.widget, "marker") ?? "disc";
  if (!Surface || !items) return <span className="text-sm">—</span>;
  return (
    <FieldChrome state={fs}>
      <ul
        className={
          marker === "none"
            ? "flex flex-col gap-2"
            : "flex list-disc flex-col gap-2 ps-5"
        }
      >
        {rows.map((row, index) => (
          <li key={index}>
            <Surface
              id={String(index)}
              schema={items}
              data={row}
              mode={mode}
              view={view}
            />
          </li>
        ))}
      </ul>
    </FieldChrome>
  );
}

export const ListInput = ArrayInput;

export function CarouselDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { Surface, schema, mode, view, entry } = useSurface();
  const rows = Array.isArray(data) ? data : [];
  const items =
    isRecord(schema) && isRecord(schema.items) ? schema.items : undefined;
  const orientation =
    widgetString(entry?.widget, "orientation") === "vertical"
      ? "vertical"
      : "horizontal";
  if (!Surface || !items) return <span className="text-sm">—</span>;
  return (
    <FieldChrome state={fs}>
      <Carousel
        orientation={orientation}
        opts={{ loop: widgetBoolean(entry?.widget, "loop") === true }}
        className="w-full"
      >
        <CarouselContent>
          {rows.map((row, index) => (
            <CarouselItem key={index}>
              <Surface
                id={String(index)}
                schema={items}
                data={row}
                mode={mode}
                view={view}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </FieldChrome>
  );
}

export const CarouselInput = ArrayInput;
