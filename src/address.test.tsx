import { afterEach, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  type Schema,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createShadcnKit } from "../registry/surface/kit";
import { US_ADDRESS_ID } from "../registry/surface/address";
import { shadcnSchemas } from "./schemas";

const schema = {
  $id: US_ADDRESS_ID,
  title: "US postal address",
  type: "object",
  required: ["$kind", "street1", "city", "region", "postalCode", "countryCode"],
  properties: {
    $kind: { const: US_ADDRESS_ID },
    street1: { type: "string", minLength: 1, maxLength: 64 },
    street2: { type: "string", maxLength: 64 },
    city: { type: "string", minLength: 1, maxLength: 120 },
    region: { type: "string" },
    postalCode: { type: "string", pattern: "^[0-9]{5}(-[0-9]{4})?$" },
    countryCode: { const: "US" },
    contexts: { type: "array", items: { type: "string" } },
  },
} as Schema;

const oakland = {
  $kind: US_ADDRESS_ID,
  street1: "1600 Franklin St",
  street2: "Ste 4",
  city: "Oakland",
  region: "CA",
  postalCode: "94612",
  countryCode: "US",
};

function mount(initial: unknown, mode: "input" | "display" = "input") {
  let current: unknown = initial;
  const { Surface } = createSurfaceUi({
    schemaResolver: new InMemorySchemaFetchResolver(shadcnSchemas),
    validator: createAjvValidator(),
    kit: createShadcnKit(),
  });
  function Consumer() {
    const [data, setData] = useState(initial);
    current = data;
    return (
      <Surface
        id={US_ADDRESS_ID}
        schema={schema}
        data={data}
        mode={mode}
        onChange={setData}
      />
    );
  }
  return { ...render(<Consumer />), data: () => current };
}

afterEach(cleanup);

test("US address input is a street then city/state/ZIP row, not labeled fields", async () => {
  const screen = mount(oakland);
  await waitFor(() =>
    expect(screen.getByDisplayValue("1600 Franklin St")).toBeTruthy(),
  );
  expect(screen.getByPlaceholderText("Street address")).toBeTruthy();
  expect(screen.getByPlaceholderText("Apt, suite, unit")).toBeTruthy();
  expect(screen.getByPlaceholderText("City")).toBeTruthy();
  expect(screen.getByPlaceholderText("ZIP")).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "State" })).toBeTruthy();
  expect(screen.queryByText("Street")).toBeNull();
  expect(screen.queryByText("Country")).toBeNull();
  expect(screen.queryByText("ZIP code")).toBeNull();
  expect(screen.queryByText("US postal address")).toBeNull();
});

test("US address input writes $kind and countryCode and formats ZIP+4", async () => {
  const screen = mount({});
  const user = userEvent.setup();
  const street = await waitFor(() =>
    screen.getByPlaceholderText("Street address"),
  );
  await user.type(street, "1 Market St");
  await user.type(screen.getByPlaceholderText("City"), "San Francisco");
  await user.type(screen.getByPlaceholderText("ZIP"), "941031234");
  const data = screen.data() as Record<string, unknown>;
  expect(data.$kind).toBe(US_ADDRESS_ID);
  expect(data.countryCode).toBe("US");
  expect(data.street1).toBe("1 Market St");
  expect(data.city).toBe("San Francisco");
  expect(data.postalCode).toBe("94103-1234");
});

test("US address display is a postal block without country", async () => {
  const screen = mount(oakland, "display");
  await waitFor(() =>
    expect(screen.getByText(/1600 Franklin St/)).toBeTruthy(),
  );
  expect(screen.getByText(/Oakland, CA 94612/)).toBeTruthy();
  expect(screen.queryByText("US")).toBeNull();
  expect(screen.queryByText("Country")).toBeNull();
  expect(screen.queryByText("Street")).toBeNull();
});
