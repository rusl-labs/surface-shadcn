"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  useSurface,
  type FieldChild,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { useFieldState } from "@rusl-labs/surface-shadcn";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FieldChrome } from "./chrome";
import { widgetBoolean, widgetString } from "./widget";

function panels(nodes: readonly FieldChild[]): FieldChild[] {
  return nodes.filter(
    (node) => node.kind === "section" || node.kind === "field",
  );
}

function PanelBody({ node }: { node: FieldChild }): ReactNode {
  const { Surface } = useSurface();
  if (!Surface) return null;
  if (node.kind === "field") return <Surface {...node.surface} />;
  if (node.kind === "section") {
    return (
      <div className="flex flex-col gap-3">
        {node
          .children()
          .map((child) =>
            child.kind === "field" ? (
              <Surface key={child.key} {...child.surface} />
            ) : child.kind === "section" ? (
              <PanelBody key={child.key} node={child} />
            ) : null,
          )}
      </div>
    );
  }
  return null;
}

function panelLabel(node: FieldChild): string {
  if (node.kind === "field" || node.kind === "section")
    return node.label || node.key;
  return node.key;
}

export function AccordionSurface(_props: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { helpers, entry } = useSurface();
  const items = panels(helpers?.fields() ?? []);
  const multiple = widgetString(entry?.widget, "type") !== "single";
  return (
    <FieldChrome state={fs}>
      <Accordion multiple={multiple}>
        {items.map((node) => (
          <AccordionItem key={node.key} value={node.key}>
            <AccordionTrigger>{panelLabel(node)}</AccordionTrigger>
            <AccordionContent>
              <PanelBody node={node} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </FieldChrome>
  );
}

export function CollapsibleSurface(_props: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { helpers, Surface, entry } = useSurface();
  const [open, setOpen] = useState(
    widgetBoolean(entry?.widget, "defaultOpen") !== false,
  );
  const nodes = helpers?.fields() ?? [];
  return (
    <FieldChrome state={fs}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={<Button variant="outline" size="sm" className="self-start" />}
        >
          {widgetString(entry?.widget, "label") ?? (open ? "Hide" : "Show")}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-3 pt-3">
            {nodes.map((node) =>
              node.kind === "field" && Surface ? (
                <Surface key={node.key} {...node.surface} />
              ) : node.kind === "section" ? (
                <PanelBody key={node.key} node={node} />
              ) : null,
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </FieldChrome>
  );
}
