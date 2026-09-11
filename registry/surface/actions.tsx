"use client";

import type { ComponentProps, ReactElement, SVGProps } from "react";
import type { AnnotationWidget } from "@rusl-labs/surface";
import { isRecord } from "@rusl-labs/surface-shadcn";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { widgetOption } from "./widget";

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V5h6v2" />
    </svg>
  );
}
function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const icons = {
  plus: PlusIcon,
  trash: TrashIcon,
  x: XIcon,
} as const;
type Appearance = "label" | "icon" | "both" | "tooltip";

export function resolveItemAction(
  widget: AnnotationWidget | undefined,
  key: "add" | "remove",
  fallbackLabel: string,
): { appearance: Appearance; label: string; icon: keyof typeof icons } {
  const raw = widgetOption(widget, key);
  const record = isRecord(raw) ? raw : undefined;
  const appearance =
    record?.appearance === "icon" ||
    record?.appearance === "both" ||
    record?.appearance === "tooltip"
      ? record.appearance
      : "label";
  const icon =
    record?.icon === "plus" || record?.icon === "trash" || record?.icon === "x"
      ? record.icon
      : key === "add"
        ? "plus"
        : "trash";
  const label =
    typeof record?.label === "string" && record.label.length > 0
      ? record.label
      : fallbackLabel;
  return { appearance, label, icon };
}

export function ItemActionButton({
  action,
  widget,
  fallbackLabel,
  accessibleLabel,
  ...props
}: {
  action: "add" | "remove";
  widget: AnnotationWidget | undefined;
  fallbackLabel: string;
  accessibleLabel?: string;
} & ComponentProps<typeof Button>): ReactElement {
  const { appearance, label, icon } = resolveItemAction(
    widget,
    action,
    fallbackLabel,
  );
  const Icon = icons[icon];
  const name = accessibleLabel ?? label;
  const iconOnly = appearance === "icon" || appearance === "tooltip";
  const button = (
    <Button
      type="button"
      size={iconOnly ? "icon-sm" : "sm"}
      aria-label={name}
      {...props}
    >
      {appearance !== "label" ? (
        <Icon data-icon={appearance === "both" ? "inline-start" : undefined} />
      ) : null}
      {appearance === "label" || appearance === "both" ? label : null}
    </Button>
  );
  if (appearance !== "tooltip") return button;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {button}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
