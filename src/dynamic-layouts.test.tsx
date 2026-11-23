import { afterEach, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import Ajv2020 from "ajv/dist/2020";
import {
  createSurfaceUi, InMemoryAnnotationResolver, InMemorySchemaFetchResolver,
  type AnnotationDocument, type Schema, type SurfaceProps,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createShadcnKit } from "../registry/surface/kit";
import { SurfaceProvider, useSurfaceDefaults } from "./surface-provider";
import widgetSchema from "../schemas/rusl/surface.shadcn.schema.json";

// Generic regression fixtures, NOT the user's still-missing warranty request.
const id = "https://example.test/dynamic-layout";
const itemSchema = { type: "object", properties: { subject: { type: "string" }, description: { type: "string" } } };
// Proposed configuration from the recorded plan. Spreading the props
// lets these tests run against the current provider without inventing an export.
type Presentation = { locale?: string; density?: "comfortable" | "compact"; itemSeparators?: boolean };
function mount(schema: Schema, initial: unknown, options: {
  mode?: "input" | "display";
  annotation?: AnnotationDocument;
  entry?: SurfaceProps["entry"];
  presentation?: Presentation;
} = {}) {
  const document = { $id: id, ...schema };
  const { Surface } = createSurfaceUi({
    schemaResolver: new InMemorySchemaFetchResolver({ [id]: document }),
    annotationResolver: new InMemoryAnnotationResolver(options.annotation ? { [id]: options.annotation } : {}),
    validator: createAjvValidator(), kit: createShadcnKit(),
  });
  function Consumer() {
    const [data, setData] = useState(initial);
    return <SurfaceProvider locale="en-US" {...options.presentation}>
      <Surface id={id} data={data} onChange={setData} mode={options.mode ?? "display"} view="default" entry={options.entry} />
    </SurfaceProvider>;
  }
  return render(<Consumer />);
}
afterEach(cleanup);

const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ subject: `Issue ${index + 1}`, description: `Description ${index + 1}` }));

test("structured input items place Remove in a header, not beside the field body", async () => {
  const screen = mount({ type: "array", items: itemSchema }, rows(2), {
    mode: "input", entry: { itemLabel: "issue", addLabel: "Add issue" },
  });
  await screen.findAllByRole("textbox", { name: "subject" });
  for (const button of screen.getAllByRole("button", { name: /^Remove issue / })) {
    const header = button.closest("header");
    expect(header).not.toBeNull();
    expect(header!.textContent?.toLowerCase()).toContain("issue");
    expect(header!.querySelector("input, textarea")).toBeNull();
  }
});

test("Add issue follows item controls as a non-submit action", async () => {
  const screen = mount({ type: "array", items: itemSchema }, rows(2), {
    mode: "input", entry: { itemLabel: "issue", addLabel: "Add issue" },
  });
  await screen.findAllByRole("textbox", { name: "subject" });
  const add = screen.getByRole("button", { name: "Add issue" });
  expect(add.getAttribute("type")).toBe("button");
  for (const remove of screen.getAllByRole("button", { name: /^Remove issue / })) {
    expect(remove.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  }
});

test("each display label and value form an independent pair", async () => {
  const screen = mount({ type: "object", properties: { first: { type: "string" }, second: { type: "string" } } }, { first: "First value", second: "Second value" });
  await screen.findByText("Second value");
  const terms = screen.container.querySelectorAll("dt");
  expect(terms).toHaveLength(2);
  for (const term of terms) {
    const pair = term.parentElement!;
    expect(pair.tagName).not.toBe("DL");
    expect(pair.querySelectorAll("dt")).toHaveLength(1);
    expect(pair.querySelectorAll("dd")).toHaveLength(1);
    expect(pair.closest("dl")).not.toBeNull();
  }
});

test("default object arrays stay lists while tables require an explicit widget", async () => {
  const array = { type: "array", items: itemSchema };
  const plain = mount(array, rows(2));
  await plain.findByText("Issue 2");
  expect(plain.queryByRole("table")).toBeNull();
  expect(plain.container.querySelectorAll("li")).toHaveLength(2);
  cleanup();
  const table = mount(array, rows(2), { entry: { widget: { name: "table" } } });
  expect(await table.findByRole("table")).toBeTruthy();
});

test("optional empty values omit their labels while zero, false, and required empty fields remain", async () => {
  const schema = { type: "object", required: ["requiredEmpty"], properties: {
    missing: { type: "string" }, nil: { type: ["string", "null"] }, blank: { type: "string" },
    emptyList: { type: "array", items: { type: "string" } },
    count: { type: "number" }, enabled: { type: "boolean" }, requiredEmpty: { type: "string" },
  } };
  const screen = mount(schema, { nil: null, blank: "", emptyList: [], count: 0, enabled: false, requiredEmpty: "" });
  await screen.findByText("count");
  const terms = [...screen.container.querySelectorAll("dt")].map(node => node.textContent);
  expect(terms).toEqual(["count", "enabled", "requiredEmpty"]);
  expect(screen.getByText("0")).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "enabled" }).getAttribute("aria-checked")).toBe("false");
});

test.each([0, 1, 2, 3])("dynamic list renders n−1 separators, none trailing, for %i objects", async count => {
  const screen = mount({ type: "array", items: itemSchema }, rows(count), { entry: { widget: { name: "list", marker: "none", separators: true } } });
  await screen.findByRole("list");
  if (count) await screen.findByText(`Issue ${count}`);
  const separators = screen.container.querySelectorAll('[data-slot="separator"]');
  expect(separators).toHaveLength(Math.max(0, count - 1));
  const items = screen.container.querySelectorAll("li");
  expect(items).toHaveLength(count);
  if (count) {
    expect(items[0]!.querySelector('[data-slot="separator"]')).toBeNull();
    expect(items[count - 1]!.lastElementChild?.getAttribute("data-slot")).not.toBe("separator");
  }
});

test("provider itemSeparators also applies to the ordinary default array renderer", async () => {
  const screen = mount({ type: "array", items: itemSchema }, rows(3), { presentation: { itemSeparators: true } });
  await screen.findByText("Issue 3");
  expect(screen.container.querySelectorAll('[data-slot="separator"]')).toHaveLength(2);
});

test("nested list separator options work without top-level options", async () => {
  const screen = mount({ type: "array", items: itemSchema }, rows(2), { entry: { widget: { name: "list", options: { marker: "none", separators: true } } } });
  await screen.findByText("Issue 2");
  expect(screen.container.querySelectorAll('[data-slot="separator"]')).toHaveLength(1);
});

test("explicit false overrides nested and provider separator defaults", async () => {
  const screen = mount({ type: "array", items: itemSchema }, rows(2), {
    presentation: { itemSeparators: true },
    entry: { widget: { name: "list", separators: false, options: { separators: true } } },
  });
  await screen.findByText("Issue 2");
  expect(screen.container.querySelectorAll('[data-slot="separator"]')).toHaveLength(0);
});

test("the list vocabulary accepts boolean separators at both option locations", () => {
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  ajv.addSchema(widgetSchema);
  const validate = ajv.getSchema(`${widgetSchema.$id}#/$defs/list`)!;
  expect(validate({ name: "list", separators: true })).toBe(true);
  expect(validate({ name: "list", options: { separators: false } })).toBe(true);
  expect(validate({ name: "list", separators: "yes" })).toBe(false);
});

test("presentation defaults inherit through existing providers and support explicit overrides", async () => {
  function Defaults() { return <output>{JSON.stringify(useSurfaceDefaults())}</output>; }
  const outer: Presentation = { locale: "en-US", density: "compact", itemSeparators: true };
  const inner: Presentation = { density: "comfortable", itemSeparators: false };
  const screen = render(<SurfaceProvider {...outer}>
    <SurfaceProvider defaultCountry="US"><Defaults /></SurfaceProvider>
    <SurfaceProvider {...inner}><Defaults /></SurfaceProvider>
  </SurfaceProvider>);
  await waitFor(() => expect(screen.container.querySelectorAll("output")).toHaveLength(2));
  const values = [...screen.container.querySelectorAll("output")].map(node => JSON.parse(node.textContent!));
  expect(values[0]).toMatchObject({ density: "compact", itemSeparators: true, locale: "en-US", defaultCountry: "US" });
  expect(values[1]).toMatchObject({ density: "comfortable", itemSeparators: false, locale: "en-US" });
});
