import {
  createRegistryKit,
  type RegistryEntry,
  type RegistryKit,
  type SurfaceRenderer,
} from "@rusl-labs/surface";
import { SHADCN_TEXTAREA_ID } from "@rusl-labs/surface-shadcn";
import { ArrayDisplay, ArrayInput } from "./array";
import { BooleanDisplay, BooleanInput } from "./boolean";
import { ConstDisplay, ConstInput } from "./const";
import { EmailDisplay, EmailInput } from "./email";
import { EnumDisplay, EnumInput } from "./enum";
import { Fallback } from "./fallback";
import { NumberDisplay, NumberInput } from "./number";
import { ObjectDisplay, ObjectInput } from "./object";
import { ShadcnRoot } from "./root";
import { StringDisplay, StringInput } from "./string";
import { TextareaDisplay, TextareaInput } from "./textarea";
import { AllOf, Union } from "./composition";

/**
 * Well-known vocabulary ids reused from the published default kit. These are
 * stable URIs, aliased to the local renderers so an app using the default-kit
 * `email` / `input` widgets — or a `$ref` to the pragmatic contact email
 * scalar — resolves without per-schema wiring.
 */
const DEFAULT_KIT_ID =
  "https://resources.rusl.com/resources/rusl/schemas/surface.default-kit";
const DEFAULT_KIT_EMAIL = `${DEFAULT_KIT_ID}#/$defs/email`;
const DEFAULT_KIT_INPUT = `${DEFAULT_KIT_ID}#/$defs/input`;
const EMAIL_SCALAR_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/email";

function perMode(
  key: string,
  input: SurfaceRenderer,
  display: SurfaceRenderer,
): RegistryEntry[] {
  return [
    { key, mode: "input", component: input },
    { key, mode: "display", component: display },
  ];
}

/** Options for {@link createShadcnKit}. */
export interface ShadcnKitOptions {
  /** Extra registrations appended after the defaults, so they take precedence. */
  readonly resolvers?: readonly RegistryEntry[];
  /** Additional aliases resolved by Surface; no kit-side lookup layer. */
  readonly aliases?: Readonly<Record<string, string>>;
}

/**
 * Build the shadcn Surface kit: input/display renderers for the everyday
 * schema vocabulary, a visible fallback, and the local form shell as Root.
 *
 * Usage:
 * ```ts
 * const ui = createSurfaceUi({ schemaResolver, validator, kit: createShadcnKit() });
 * ```
 *
 * No per-schema component is required; the consuming app's local shadcn
 * primitives determine the look. Extra `resolvers` append after the defaults
 * (last registration wins) so a host can override any key.
 */
export function createShadcnKit(options: ShadcnKitOptions = {}): RegistryKit {
  const defaults: RegistryEntry[] = [
    ...perMode("string", StringInput, StringDisplay),
    ...perMode("number", NumberInput, NumberDisplay),
    ...perMode("boolean", BooleanInput, BooleanDisplay),
    ...perMode("enum", EnumInput, EnumDisplay),
    ...perMode("const", ConstInput, ConstDisplay),
    ...perMode("object", ObjectInput, ObjectDisplay),
    ...perMode("array", ArrayInput, ArrayDisplay),
    ...perMode("email", EmailInput, EmailDisplay),
    ...perMode("textarea", TextareaInput, TextareaDisplay),
    ...perMode("allOf", AllOf, AllOf),
    ...perMode("oneOf", Union, Union),
  ];

  return createRegistryKit({
    fallback: Fallback,
    Root: ShadcnRoot,
    aliases: {
      [DEFAULT_KIT_EMAIL]: "email",
      [EMAIL_SCALAR_ID]: "email",
      "idn-email": "email",
      input: "string",
      integer: "number",
      anyOf: "oneOf",
      [DEFAULT_KIT_INPUT]: "string",
      [SHADCN_TEXTAREA_ID]: "textarea",
      ...options.aliases,
    },
    resolvers: [...defaults, ...(options.resolvers ?? [])],
  });
}
