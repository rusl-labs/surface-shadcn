import { afterEach, expect, test } from "bun:test";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  InMemoryAnnotationResolver,
  type Schema,
  type SurfaceProps,
  type SurfaceValidator,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createShadcnKit } from "../registry/surface/kit";
import { shadcnSchemas } from "./schemas";

function mount(
  schema: Schema,
  initial: unknown,
  options: {
    labels?: boolean;
    entry?: SurfaceProps["entry"];
    validator?: SurfaceValidator;
  } = {},
) {
  const saved: unknown[] = [];
  let replace!: (data: unknown) => void;
  let current: unknown;
  const { Surface } = createSurfaceUi({
    schemaResolver: new InMemorySchemaFetchResolver(shadcnSchemas),
    validator: options.validator ?? createAjvValidator(),
    kit: createShadcnKit(),
  });
  function Consumer() {
    const [data, setData] = useState(initial);
    current = data;
    replace = setData;
    return (
      <Surface
        id="urn:surface:mechanics"
        schema={schema}
        data={data}
        onChange={setData}
        onSubmit={({ data }) => {
          saved.push(data);
        }}
        labels={options.labels}
        entry={options.entry}
      />
    );
  }
  return {
    ...render(<Consumer />),
    saved,
    replace: (data: unknown) => replace(data),
    data: () => current,
  };
}
afterEach(cleanup);

test("hidden labels retain help and accessible description linkage", async () => {
  const screen = mount({ type: "string" }, "Alex", {
    labels: false,
    entry: { label: "Name", description: "Public name" },
  });
  const input = await screen.findByRole("textbox", { name: "Name" });
  const descriptionId = input.getAttribute("aria-describedby");
  expect(descriptionId).toBeTruthy();
  expect(document.getElementById(descriptionId!)?.textContent).toBe(
    "Public name",
  );
  expect(screen.container.querySelector("label")).toBeNull();
});

test("incomplete numeric drafts cannot save stale canonical values and Reset clears them", async () => {
  const screen = mount(
    { type: "object", properties: { count: { type: "number" } } },
    { count: 3 },
  );
  const input = await screen.findByRole("textbox", { name: "count" });
  fireEvent.change(input, { target: { value: "1e" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(input.getAttribute("aria-invalid")).toBe("true"));
  expect(screen.saved).toEqual([]);
  expect(screen.data()).toEqual({ count: 3 });
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "count" }) as HTMLInputElement)
        .value,
    ).toBe("3"),
  );
  fireEvent.change(screen.getByRole("textbox", { name: "count" }), {
    target: { value: "1e2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.saved).toEqual([{ count: 100 }]));
});

test("array removal preserves a surviving invalid draft and projects its new error path", async () => {
  const screen = mount({ type: "array", items: { type: "number" } }, [1, 2, 3]);
  await waitFor(() => expect(screen.getAllByRole("textbox").length).toBe(3));
  fireEvent.change(screen.getAllByRole("textbox")[1]!, {
    target: { value: "2e" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Remove item 1" }));
  await waitFor(() => expect(screen.getAllByRole("textbox").length).toBe(2));
  expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
    "2e",
  );
  expect((screen.getAllByRole("textbox")[1] as HTMLInputElement).value).toBe(
    "3",
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  const alerts = await screen.findAllByRole("alert");
  expect(alerts.some((alert) => alert.textContent?.includes("0:"))).toBe(true);
  expect(screen.saved).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: "Remove item 1" }));
  await waitFor(() => expect(screen.getAllByRole("textbox").length).toBe(1));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.saved).toEqual([[3]]));
});

test("array remove appearance icon keeps the accessible name and omits the visible Remove label", async () => {
  const screen = mount({ type: "array", items: { type: "string" } }, ["a"], {
    entry: {
      label: "Tags",
      itemLabel: "tag",
      addLabel: "Add tag",
      widget: { name: "list", remove: { appearance: "icon", icon: "trash" } },
    },
  });
  const remove = await screen.findByRole("button", { name: "Remove tag 1" });
  expect(remove.textContent?.includes("Remove")).toBe(false);
  fireEvent.click(await screen.findByRole("button", { name: "Add tag" }));
  await waitFor(() => expect(screen.getAllByRole("textbox").length).toBe(2));
});

test("external replacement during asynchronous validation cannot submit the old record", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const validator: SurfaceValidator = {
    async validate() {
      await gate;
      return { valid: true, issues: [] };
    },
  };
  const screen = mount({ type: "string" }, "before", {
    validator,
    entry: { label: "Name" },
  });
  await screen.findByRole("textbox", { name: "Name" });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByRole("button", { name: "Saving…" });
  act(() => screen.replace("replacement"));
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value,
    ).toBe("replacement"),
  );
  release();
  await screen.findByRole("button", { name: "Save" });
  expect(screen.saved).toEqual([]);
  expect(screen.data()).toBe("replacement");
});
test("readonly composition children remain readonly", async () => {
  const screen = mount(
    {
      readOnly: true,
      allOf: [{ type: "object", properties: { name: { type: "string" } } }],
    },
    { name: "Alex" },
  );
  expect(
    ((await screen.findByRole("textbox", { name: "name" })) as HTMLInputElement)
      .readOnly,
  ).toBe(true);
});

test("external null clears a phone draft without coercing null to missing", async () => {
  const screen = mount({ type: "string", format: "tel" }, undefined, {
    entry: { label: "Phone" },
  });
  const input = await screen.findByRole("textbox", { name: "Phone" });
  fireEvent.change(input, { target: { value: "not a phone" } });
  act(() => screen.replace(null));
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement)
        .value,
    ).toBe(""),
  );
  expect(screen.data()).toBeNull();
});

test("replacing money with a fresh equal record discards the old invalid draft", async () => {
  const screen = mount(
    { $ref: "https://resources.rusl.com/resources/pragmatic/schemas/money" },
    { amount: 100, currency: "USD" },
    { entry: { label: "Budget" } },
  );
  const input = await screen.findByRole("textbox", { name: "Budget" });
  fireEvent.change(input, { target: { value: "1e" } });
  act(() => screen.replace({ amount: 100, currency: "USD" }));
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "Budget" }) as HTMLInputElement)
        .value,
    ).toBe("1.00"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.saved).toEqual([{ amount: 100, currency: "USD" }]),
  );
});

test("readonly structured fields cannot be removed through presence controls", async () => {
  const screen = mount(
    {
      type: "object",
      properties: {
        locked: {
          type: "object",
          readOnly: true,
          properties: { name: { type: "string" } },
        },
      },
    },
    { locked: { name: "Alex" } },
  );
  expect(
    (
      (await screen.findByRole("button", {
        name: "Remove locked",
      })) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

test("child defaults do not materialize an object over explicit null", async () => {
  const screen = mount(
    {
      type: "object",
      properties: { name: { type: "string", default: "seeded" } },
    },
    null,
  );
  await screen.findByRole("alert");
  expect(screen.data()).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.getAllByRole("alert").length).toBe(2));
  expect(screen.saved).toEqual([]);
  expect(screen.data()).toBeNull();
});

test("Reset selects the initial union before a stale const branch can write back", async () => {
  const screen = mount(
    {
      oneOf: [
        { const: "a", title: "A" },
        { const: "b", title: "B" },
      ],
    },
    "a",
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("combobox", { name: "Variant" }));
  await user.click(await screen.findByRole("option", { name: "B" }));
  await waitFor(() => expect(screen.data()).toBe("b"));
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  await waitFor(() => expect(screen.data()).toBe("a"));
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("a");
});

test("a switch widget writes boolean true and false", async () => {
  const screen = mount({ type: "boolean" }, false, {
    entry: { label: "Enabled", widget: { name: "switch" } },
  });
  const control = await screen.findByRole("switch", { name: "Enabled" });
  expect(control.getAttribute("data-checked")).toBeNull();
  fireEvent.click(control);
  await waitFor(() => expect(screen.data()).toBe(true));
  fireEvent.click(screen.getByRole("switch", { name: "Enabled" }));
  await waitFor(() => expect(screen.data()).toBe(false));
  expect(screen.queryByText("true")).toBeNull();
  expect(screen.queryByText("false")).toBeNull();
});

test("a switch widget maps two enum values through on and off", async () => {
  const screen = mount(
    { type: "string", enum: ["archived", "active"] },
    "archived",
    {
      entry: {
        label: "Status",
        widget: { name: "switch", on: "active", off: "archived" },
      },
    },
  );
  fireEvent.click(
    await screen.findByRole("switch", { name: "Status: archived or active" }),
  );
  expect(screen.getByText("archived")).toBeTruthy();
  expect(screen.getByText("active")).toBeTruthy();
  await waitFor(() => expect(screen.data()).toBe("active"));
  fireEvent.click(
    screen.getByRole("switch", { name: "Status: archived or active" }),
  );
  await waitFor(() => expect(screen.data()).toBe("archived"));
});

test("a two-value enum switch without on/off uses the second member as on", async () => {
  const screen = mount({ type: "string", enum: ["no", "yes"] }, "no", {
    entry: { label: "Agree", widget: { name: "switch" } },
  });
  fireEvent.click(await screen.findByRole("switch", { name: "Agree: no or yes" }));
  expect(screen.getByText("no")).toBeTruthy();
  expect(screen.getByText("yes")).toBeTruthy();
  await waitFor(() => expect(screen.data()).toBe("yes"));
});

test("an open object without a widget edits JSON in a textarea", async () => {
  const screen = mount(
    { type: "object" },
    { color: "red" },
    { entry: { label: "Metadata" } },
  );
  const editor = await screen.findByRole("textbox", { name: "Metadata" });
  expect(editor.tagName).toBe("TEXTAREA");
  expect((editor as HTMLTextAreaElement).value).toContain("red");
  fireEvent.change(editor, { target: { value: '{"ok":true}' } });
  await waitFor(() => expect(screen.data()).toEqual({ ok: true }));
  expect(screen.container.querySelector("[data-language=json]")).toBeNull();
});

test("an optional open-map property is a textarea, not an Add control", async () => {
  const screen = mount(
    {
      type: "object",
      properties: { metadata: { type: "object" } },
    },
    {},
  );
  const editor = await screen.findByRole("textbox", { name: /metadata/i });
  expect(editor.tagName).toBe("TEXTAREA");
  expect(screen.queryByRole("button", { name: /Add/i })).toBeNull();
});

test("a code widget on an object renders JSON in an editor", async () => {
  const screen = mount(
    { type: "object" },
    { color: "red" },
    { entry: { label: "Metadata", widget: { name: "code", language: "json" } } },
  );
  await waitFor(() =>
    expect(screen.container.querySelector("[data-language=json]")).toBeTruthy(),
  );
  expect(screen.container.textContent).toContain("color");
  expect(screen.container.textContent).toContain("red");
});

test("a toggle-group widget writes the enum value and not the label", async () => {
  const screen = mount(
    { type: "string", enum: ["Partner", "Colleague"] },
    "Partner",
    { entry: { label: "Relationship", widget: { name: "toggle-group" } } },
  );
  fireEvent.click(await screen.findByRole("button", { name: "Colleague" }));
  await waitFor(() => expect(screen.data()).toBe("Colleague"));
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("inline image items bind their own URLs and dimensions while input remains editable", async () => {
  const schema = {
    $id: "urn:surface:image-items",
    type: "object",
    properties: {
      images: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            alt: { type: "string" },
            width: { type: "integer" },
            height: { type: "integer" },
          },
        },
      },
    },
  };
  const data = {
    images: [
      {
        url: "https://example.test/one.png",
        alt: "First product photo",
        width: 640,
        height: 480,
      },
      {
        url: "https://example.test/two.png",
        alt: "Second product photo",
        width: 320,
        height: 240,
      },
    ],
  };
  const { Surface } = createSurfaceUi({
    schemaResolver: new InMemorySchemaFetchResolver({ [schema.$id]: schema }),
    annotationResolver: new InMemoryAnnotationResolver({
      [schema.$id]: {
        subject: schema.$id,
        views: {
          default: {
            fields: [
              {
                name: "images",
                items: {
                  display: {
                    view: "card",
                    widget: {
                      name: "media",
                      src: { path: "url" },
                      alt: { path: "alt" },
                      width: { path: "width" },
                      height: { path: "height" },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    }),
    kit: createShadcnKit(),
    validator: createAjvValidator(),
  });
  const screen = render(
    <>
      <Surface id={schema.$id} data={data} mode="display" />
      <Surface id={schema.$id} data={data} mode="input" />
    </>,
  );
  const first = await screen.findByRole("img", { name: "First product photo" });
  const second = await screen.findByRole("img", {
    name: "Second product photo",
  });
  expect(first.getAttribute("src")).toBe(data.images[0].url);
  expect(first.getAttribute("width")).toBe("640");
  expect(first.getAttribute("height")).toBe("480");
  expect(second.getAttribute("src")).toBe(data.images[1].url);
  expect(second.getAttribute("width")).toBe("320");
  expect(second.getAttribute("height")).toBe("240");
  const urlInputs = screen.getAllByRole("textbox", { name: "url" });
  fireEvent.change(urlInputs[0], {
    target: { value: "https://example.test/replacement.png" },
  });
  expect((urlInputs[0] as HTMLInputElement).value).toBe(
    "https://example.test/replacement.png",
  );
  expect(first.getAttribute("src")).toBe(data.images[0].url);
});

// ---- money currency allowlist (annotation `widget.currencies`) --------------

const MONEY_REF =
  "https://resources.rusl.com/resources/pragmatic/schemas/money";

/** Codes an open currency picker offers, read from each `CODE — Name` option label. */
const offeredCodes = (options: HTMLElement[]): string[] =>
  options.map((option) => (option.textContent ?? "").split(" — ")[0] ?? "");

test("the currency allowlist offers its deduped authored order and stores each pick in that currency's minor units", async () => {
  const screen = mount(
    { $ref: MONEY_REF },
    { amount: 100, currency: "USD" },
    {
      entry: {
        label: "Budget",
        widget: { name: "money", currencies: ["JPY", "USD", "JPY"] },
      },
    },
  );
  const amount = await screen.findByRole("textbox", { name: "Budget" });
  // The same "5" draft is worth 500 minor units under USD (2 places)…
  fireEvent.change(amount, { target: { value: "5" } });
  await waitFor(() =>
    expect(screen.data()).toEqual({ amount: 500, currency: "USD" }),
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "Currency" }));
  const options = await screen.findAllByRole("option");
  expect(offeredCodes(options)).toEqual(["JPY", "USD"]);
  await user.click(
    options.find((option) => (option.textContent ?? "").startsWith("JPY"))!,
  );
  // …and 5 minor units under JPY (0 places) once that allowed code is chosen.
  await waitFor(() =>
    expect(screen.data()).toEqual({ amount: 5, currency: "JPY" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.saved).toEqual([{ amount: 5, currency: "JPY" }]),
  );
});

test("a schema currency enum and the widget allowlist intersect to the codes both permit, in the widget's order", async () => {
  const screen = mount(
    {
      type: "object",
      additionalProperties: false,
      required: ["amount", "currency"],
      properties: {
        amount: { type: "integer" },
        currency: { type: "string", enum: ["USD", "AUD", "CAD"] },
      },
    },
    { amount: 100, currency: "USD" },
    { entry: { widget: { name: "money", currencies: ["AUD", "USD", "JPY"] } } },
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("combobox", { name: "Currency" }));
  const options = await screen.findAllByRole("option");
  // JPY dropped by the schema enum, CAD dropped by the allowlist; widget order wins.
  expect(offeredCodes(options)).toEqual(["AUD", "USD"]);
});

test("an explicit empty allowlist offers no currency and emits no excluded default, unlike an omitted one", async () => {
  const user = userEvent.setup();
  const empty = mount(
    {
      type: "object",
      additionalProperties: false,
      required: ["amount", "currency"],
      properties: {
        amount: { type: "integer" },
        currency: { type: "string", enum: ["USD", "AUD"], default: "USD" },
      },
    },
    undefined,
    { entry: { widget: { name: "money", currencies: [] } } },
  );
  const emptyPicker = await empty.findByRole("combobox", { name: "Currency" });
  await user.click(emptyPicker);
  await waitFor(() =>
    expect(emptyPicker.getAttribute("aria-expanded")).toBe("true"),
  );
  expect(empty.queryAllByRole("option")).toHaveLength(0);
  // The schema default "USD" is forbidden by [], so no currency is chosen or emitted.
  expect(emptyPicker.textContent).toContain("Currency");
  expect(empty.data()).toBeUndefined();
  cleanup();

  const full = mount({ $ref: MONEY_REF }, undefined, {
    entry: { widget: { name: "money" } },
  });
  await user.click(await full.findByRole("combobox", { name: "Currency" }));
  const codes = offeredCodes(await full.findAllByRole("option"));
  expect(codes.length).toBeGreaterThan(100);
  expect(codes).toContain("USD");
  expect(codes).toContain("EUR");
  expect(codes).toContain("GBP");
});

test("a stored currency outside the allowlist stays selected and canonical while the picker offers only allowed codes", async () => {
  const screen = mount(
    { $ref: MONEY_REF },
    { amount: 100, currency: "CAD" },
    { entry: { widget: { name: "money", currencies: ["USD", "AUD"] } } },
  );
  const picker = await screen.findByRole("combobox", { name: "Currency" });
  // Out-of-list CAD stays visible and canonical — never converted or cleared on mount.
  expect(picker.textContent).toContain("CAD");
  expect(screen.data()).toEqual({ amount: 100, currency: "CAD" });
  const user = userEvent.setup();
  await user.click(picker);
  const options = await screen.findAllByRole("option");
  expect(offeredCodes(options)).toEqual(["USD", "AUD"]);
  await user.click(
    options.find((option) => (option.textContent ?? "").startsWith("USD"))!,
  );
  await waitFor(() =>
    expect(screen.data()).toEqual({ amount: 100, currency: "USD" }),
  );
});
