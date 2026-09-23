import { expect, test } from "bun:test";
import { createShadcnKit } from "../registry/surface/kit";
import { PhoneDisplay, PhoneInput } from "../registry/surface/phone";
import { EmailInput } from "../registry/surface/email";
import { MediaDisplay } from "../registry/surface/media";
import { AvatarDisplay } from "../registry/surface/avatar";
import { StringInput } from "../registry/surface/string";
import {
  SHADCN_EMAIL_ID,
  SHADCN_INPUT_ID,
  SHADCN_AVATAR_ID,
  SHADCN_MEDIA_ID,
  SHADCN_TEL_ID,
} from "./constants";

const schema = { type: "string" };

test("shadcn widget $kind aliases resolve to this kit's renderers", () => {
  const kit = createShadcnKit();
  expect(
    kit.resolveRenderer({
      keys: [SHADCN_TEL_ID],
      mode: "input",
      view: "default",
      schema,
    }),
  ).toBe(PhoneInput);
  expect(
    kit.resolveRenderer({
      keys: [SHADCN_TEL_ID],
      mode: "display",
      view: "default",
      schema,
    }),
  ).toBe(PhoneDisplay);
  expect(
    kit.resolveRenderer({
      keys: [SHADCN_EMAIL_ID],
      mode: "input",
      view: "default",
      schema,
    }),
  ).toBe(EmailInput);
  expect(
    kit.resolveRenderer({
      keys: [SHADCN_INPUT_ID],
      mode: "input",
      view: "default",
      schema,
    }),
  ).toBe(StringInput);
  expect(
    kit.resolveRenderer({
      keys: [SHADCN_MEDIA_ID],
      mode: "display",
      view: "default",
      schema,
    }),
  ).toBe(MediaDisplay);
  expect(
    kit.resolveRenderer({
      keys: [SHADCN_AVATAR_ID],
      mode: "display",
      view: "card",
      schema,
    }),
  ).toBe(AvatarDisplay);
  expect(
    kit.resolveRenderer({
      keys: [SHADCN_AVATAR_ID],
      mode: "input",
      view: "default",
      schema,
    }),
  ).toBeUndefined();
});

test("default-kit widget $kinds do not resolve", () => {
  const kit = createShadcnKit();
  expect(
    kit.resolveRenderer({
      keys: [
        "https://resources.rusl.com/resources/rusl/schemas/surface.default-kit#/$defs/tel",
      ],
      mode: "input",
      view: "default",
      schema,
    }),
  ).toBeUndefined();
});
