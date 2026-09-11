import type { AnnotationDocument } from "@rusl-labs/surface";
import { isRecord } from "@rusl-labs/surface-shadcn";
import type { SchemaSelection } from "./schema-source";
import demo from "./contact.annotation.json";
import product from "./annotations/product.annotation.json";
import externalReference from "./annotations/external-reference.annotation.json";
import contactCard from "./annotations/contact-card.annotation.json";
import money from "./annotations/money.annotation.json";
import contactScalars from "./annotations/contact-scalars.annotation.json";
import postalAddress from "./annotations/postal-address.annotation.json";
import auAddress from "./annotations/au-address.annotation.json";

// Authored presentation documents for the playground, not schema-derived UI logic.
export const exampleAnnotations: Record<string, AnnotationDocument> =
  Object.fromEntries(
    [
      demo,
      product,
      externalReference,
      contactCard,
      money,
      contactScalars,
      postalAddress,
      auAddress,
    ].map((annotation) => [annotation.subject, annotation]),
  );

export interface AnnotationContext {
  document: AnnotationDocument;
  views: Record<string, unknown>;
  definition: string | undefined;
}

export function annotationContext(
  selection: Pick<SchemaSelection, "documentUri" | "pointer">,
  document: AnnotationDocument | undefined = exampleAnnotations[
    selection.documentUri
  ],
): AnnotationContext | undefined {
  if (!document) return undefined;
  if (!selection.pointer)
    return document.views
      ? { document, views: document.views, definition: undefined }
      : undefined;
  const match = /^\/\$defs\/([^/]+)$/.exec(selection.pointer);
  if (!match) return undefined;
  const definition = match[1].replaceAll("~1", "/").replaceAll("~0", "~");
  const entry = document.defs?.[definition];
  if (!isRecord(entry) || !isRecord(entry.views)) return undefined;
  return { document, views: entry.views, definition };
}
