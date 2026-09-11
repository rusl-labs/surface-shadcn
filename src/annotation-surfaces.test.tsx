import { afterEach, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import {
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
  type Schema,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createShadcnKit } from "../registry/surface/kit";
import { shadcnSchemas } from "./schemas";
import productAnnotation from "../example/src/annotations/product.annotation.json";
import contactAnnotation from "../example/src/annotations/contact-card.annotation.json";

const PRODUCT_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/commerce.product";
const CONTACT_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.card";


const productSchema = {
  $id: PRODUCT_ID,
  title: "Product",
  type: "object",
  required: ["name"],
  properties: {
    $kind: { const: PRODUCT_ID },
    name: { type: "string", minLength: 1 },
    sku: { type: "string" },
    status: { type: "string", enum: ["active", "archived"] },
    gtin: { type: "string" },
    description: { type: "string" },
    images: {
      type: "array",
      items: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", format: "uri" },
          alt: { type: "string" },
        },
      },
    },
    externalReferences: { type: "array", items: { type: "object" } },
    metadata: { type: "object" },
  },
} as Schema;

const contactSchema = {
  $id: CONTACT_ID,
  title: "Contact card",
  type: "object",
  required: ["name"],
  $defs: {
    emailEntry: {
      type: "object",
      required: ["value"],
      properties: {
        value: { type: "string", format: "email" },
        contexts: { type: "array", items: { type: "string" } },
        preference: { type: "integer" },
      },
    },
    phoneEntry: {
      type: "object",
      required: ["value"],
      properties: {
        value: { type: "string" },
        kind: { type: "string" },
        extension: { type: "string" },
        contexts: { type: "array", items: { type: "string" } },
        preference: { type: "integer" },
      },
    },
    linkEntry: {
      type: "object",
      required: ["value"],
      properties: {
        value: { type: "string", format: "uri" },
        kind: { type: "string" },
        contexts: { type: "array", items: { type: "string" } },
        preference: { type: "integer" },
      },
    },
  },
  properties: {
    $kind: { const: CONTACT_ID },
    name: { type: "string", minLength: 1 },
    organization: { type: "string" },
    title: { type: "string" },
    kind: { type: "string" },
    emails: { type: "array", items: { $ref: "#/$defs/emailEntry" } },
    phones: { type: "array", items: { $ref: "#/$defs/phoneEntry" } },
    links: { type: "array", items: { $ref: "#/$defs/linkEntry" } },
    nameComponents: { type: "object" },
    addresses: { type: "array", items: { type: "object" } },
    socialHandles: { type: "array", items: { type: "object" } },
    externalReferences: { type: "array", items: { type: "object" } },
    metadata: { type: "object" },
  },
} as Schema;

const laptop = {
  name: "Laptop",
  sku: "MBP-14",
  status: "active",
  description: "Portable workstation.",
  images: [
    {
      url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=640&h=480&q=80",
      alt: "Open laptop on a desk",
    },
    {
      url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=640&h=480&q=80",
      alt: "Laptop from above",
    },
  ],
};

const person = {
  name: "Alex Morgan",
  organization: "Rusl Labs",
  title: "Design partner",
  kind: "individual",
  emails: [{ value: "alex@example.com" }],
  phones: [{ value: "+14155550100", kind: "mobile" }],
  links: [{ value: "https://alex.example", kind: "website" }],
};

const REQUIRED_VIEWS = [
  "identity",
  "card",
  "row",
  "detail",
  "default",
] as const;

function mount(options: {
  schema: Schema;
  annotation: AnnotationDocument;
  data: unknown;
  mode: "input" | "display";
  view: string;
}) {
  const { Surface } = createSurfaceUi({
    schemaResolver: new InMemorySchemaFetchResolver({
      ...shadcnSchemas,
      [options.schema.$id as string]: options.schema,
    }),
    annotationResolver: new InMemoryAnnotationResolver({
      [options.annotation.subject]: options.annotation,
    }),
    validator: createAjvValidator(),
    kit: createShadcnKit(),
  });
  return render(
    <Surface
      id={options.schema.$id as string}
      schema={options.schema}
      data={options.data}
      mode={options.mode}
      view={options.view}
    />,
  );
}

afterEach(cleanup);

function viewNames(document: AnnotationDocument): string[] {
  return Object.keys(document.views ?? {});
}

test("shipped Product and Contact card annotations name the six required views", () => {
  for (const document of [productAnnotation, contactAnnotation]) {
    const names = viewNames(document as AnnotationDocument);
    for (const view of REQUIRED_VIEWS) {
      expect(names).toContain(view);
    }
  }
});

test("Product display identity, card, and row are not labeled forms and card shows the laptop image", async () => {
  for (const view of ["identity", "card", "row"] as const) {
    const screen = mount({
      schema: productSchema,
      annotation: productAnnotation as AnnotationDocument,
      data: laptop,
      mode: "display",
      view,
    });
    await waitFor(() => expect(screen.getByText("Laptop")).toBeTruthy());
    expect(screen.queryByText("$kind")).toBeNull();
    expect(screen.container.querySelector("dt")).toBeNull();
    expect(screen.container.querySelector("label")).toBeNull();
    cleanup();
  }

  const card = mount({
    schema: productSchema,
    annotation: productAnnotation as AnnotationDocument,
    data: laptop,
    mode: "display",
    view: "card",
  });
  await waitFor(() =>
    expect(card.container.querySelector("img")).toBeTruthy(),
  );
  const image = card.container.querySelector("img");
  expect(image?.getAttribute("src")).toContain(
    "photo-1517336714731-489689fd1ca8",
  );
  expect(image?.getAttribute("alt")).toBe("Open laptop on a desk");
});

test("Contact display identity shows the name with channels as a list, not a labeled form", async () => {
  const screen = mount({
    schema: contactSchema,
    annotation: contactAnnotation as AnnotationDocument,
    data: person,
    mode: "display",
    view: "identity",
  });
  await waitFor(() => expect(screen.getByText("Alex Morgan")).toBeTruthy());
  await waitFor(() => expect(screen.getByText("alex@example.com")).toBeTruthy());
  expect(screen.queryByText("$kind")).toBeNull();
  expect(screen.container.querySelector("dt")).toBeNull();
  expect(screen.container.querySelector("label")).toBeNull();
  expect(screen.container.querySelector("ul")).toBeTruthy();
  expect(screen.getByText("alex@example.com")).toBeTruthy();
  const text = screen.container.textContent ?? "";
  expect(text.indexOf("Alex Morgan")).toBeLessThan(
    text.indexOf("alex@example.com"),
  );
});

test("Contact display card and row omit stacked field labels on the name", async () => {
  for (const view of ["card", "row"] as const) {
    const screen = mount({
      schema: contactSchema,
      annotation: contactAnnotation as AnnotationDocument,
      data: person,
      mode: "display",
      view,
    });
    await waitFor(() => expect(screen.getByText("Alex Morgan")).toBeTruthy());
    expect(screen.container.querySelector("dt")).toBeNull();
    cleanup();
  }
});

test("Contact display card does not paint phone kind as a channel", async () => {
  const screen = mount({
    schema: contactSchema,
    annotation: contactAnnotation as AnnotationDocument,
    data: person,
    mode: "display",
    view: "card",
  });
  await waitFor(() => expect(screen.getByText("Alex Morgan")).toBeTruthy());
  await waitFor(() => expect(screen.getByText("+14155550100")).toBeTruthy());
  expect(screen.queryByText("mobile")).toBeNull();
});

test("Product display identity paints the name as a title and SKU as caption", async () => {
  const screen = mount({
    schema: productSchema,
    annotation: productAnnotation as AnnotationDocument,
    data: laptop,
    mode: "display",
    view: "identity",
  });
  await waitFor(() => expect(screen.getByText("Laptop")).toBeTruthy());
  const name = screen.getByText("Laptop");
  expect(name.closest("[data-slot=field-legend]")).toBeTruthy();
  expect(screen.getByText("MBP-14").closest("[data-slot=field-legend]")).toBeNull();
  expect(screen.queryByText("active")).toBeNull();
});

test("Contact input detail keeps extra channel fields collapsed and omits plaques", async () => {
  const screen = mount({
    schema: contactSchema,
    annotation: contactAnnotation as AnnotationDocument,
    data: person,
    mode: "input",
    view: "detail",
  });
  await waitFor(() =>
    expect(screen.getByDisplayValue("Alex Morgan")).toBeTruthy(),
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: /^More$/ }).length,
    ).toBeGreaterThan(0),
  );
  expect(screen.queryByText("The address itself.")).toBeNull();
  expect(screen.queryByText("The one name every contact has.")).toBeNull();
  expect(screen.queryByText("1 = primary email.")).toBeNull();
  expect(screen.queryByText("Extension")).toBeNull();
  expect(screen.queryByText("Priority")).toBeNull();
  expect(screen.queryByText("Identity")).toBeNull();
  expect(screen.queryByText("Channels")).toBeNull();
  expect(screen.queryByText("Email")).toBeNull();
  await waitFor(() =>
    expect(screen.getByPlaceholderText("Email")).toBeTruthy(),
  );
  expect(screen.getByPlaceholderText("Phone")).toBeTruthy();
});

test("display detail omits helper plaques and empty chapel fields", async () => {
  const product = mount({
    schema: productSchema,
    annotation: productAnnotation as AnnotationDocument,
    data: laptop,
    mode: "display",
    view: "detail",
  });
  await waitFor(() => expect(product.getByText("Laptop")).toBeTruthy());
  expect(product.queryByText("Shown to shoppers on listings and detail pages.")).toBeNull();
  expect(product.queryByText("Merchant-assigned inventory code.")).toBeNull();
  expect(product.queryByText("GS1 barcode: 8, 12, 13, or 14 digits.")).toBeNull();
  expect(product.queryByText("Codes")).toBeNull();
  expect(product.queryByText("Product name")).toBeNull();
  expect(product.container.querySelector("dt")).toBeNull();
  expect(product.getByText("Laptop").closest("[data-slot=field-legend]")).toBeTruthy();
  expect(product.getByText("Portable workstation.")).toBeTruthy();
  expect(product.container.querySelector("img")).toBeTruthy();
  cleanup();

  const contact = mount({
    schema: contactSchema,
    annotation: contactAnnotation as AnnotationDocument,
    data: person,
    mode: "display",
    view: "detail",
  });
  await waitFor(() => expect(contact.getByText("Alex Morgan")).toBeTruthy());
  expect(contact.queryByText("The one name every contact has.")).toBeNull();
  expect(contact.queryByText("Who this contact is.")).toBeNull();
  expect(contact.queryByText("Ways to reach this contact.")).toBeNull();
  expect(contact.queryByText("The address itself.")).toBeNull();
  expect(contact.queryByText("1 = primary email.")).toBeNull();
  expect(contact.queryByText("Identity")).toBeNull();
  expect(contact.queryByText("Channels")).toBeNull();
  expect(contact.queryByText("Emails")).toBeNull();
  expect(contact.queryByText("Phones")).toBeNull();
  expect(contact.queryByText("Links")).toBeNull();
  expect(contact.queryByText("mobile")).toBeNull();
  expect(contact.getByText("Alex Morgan").closest("[data-slot=field-legend]")).toBeTruthy();
  expect(contact.getByText("alex@example.com")).toBeTruthy();
  expect(contact.container.querySelector("ul")).toBeTruthy();
});

test("Product input default uses a switch for status and a textarea for description", async () => {
  const screen = mount({
    schema: productSchema,
    annotation: productAnnotation as AnnotationDocument,
    data: laptop,
    mode: "input",
    view: "default",
  });
  const status = await waitFor(() =>
    screen.getByRole("switch", { name: "Status: archived or active" }),
  );
  expect(
    status.getAttribute("data-checked") !== null ||
      status.getAttribute("aria-checked") === "true",
  ).toBe(true);
  expect(screen.getByText("archived")).toBeTruthy();
  expect(screen.getByText("active")).toBeTruthy();
  const description = screen.getByRole("textbox", { name: "Description" });
  expect(description.tagName).toBe("TEXTAREA");
  expect(screen.queryByText("alt")).toBeNull();
  expect(screen.queryByText("url")).toBeNull();
  expect(screen.getAllByPlaceholderText("Image URL").length).toBeGreaterThan(0);
  expect(screen.getAllByPlaceholderText("Alt text").length).toBeGreaterThan(0);
});

test("Contact input default uses placeholders on channel rows instead of nested labels", async () => {
  const screen = mount({
    schema: contactSchema,
    annotation: contactAnnotation as AnnotationDocument,
    data: person,
    mode: "input",
    view: "default",
  });
  await waitFor(() =>
    expect(screen.getByDisplayValue("Alex Morgan")).toBeTruthy(),
  );
  await waitFor(() =>
    expect(screen.getByDisplayValue("alex@example.com")).toBeTruthy(),
  );
  expect(screen.getByText("Emails")).toBeTruthy();
  expect(screen.getByText("Phones")).toBeTruthy();
  expect(screen.getByPlaceholderText("Email")).toBeTruthy();
  expect(screen.getByPlaceholderText("Phone")).toBeTruthy();
  expect(screen.getByPlaceholderText("URL")).toBeTruthy();
  expect(screen.queryByText("Email")).toBeNull();
  expect(screen.queryByText("Phone")).toBeNull();
  expect(screen.queryByText("Type")).toBeNull();
});
