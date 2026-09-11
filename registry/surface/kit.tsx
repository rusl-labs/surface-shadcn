import {
  createRegistryKit,
  type RegistryEntry,
  type RegistryKit,
  type SurfaceRenderer,
} from "@rusl-labs/surface";
import {
  SHADCN_ACCORDION_ID,
  SHADCN_CAROUSEL_ID,
  SHADCN_CODE_ID,
  SHADCN_COLLAPSIBLE_ID,
  SHADCN_COMBOBOX_ID,
  SHADCN_DATE_ID,
  SHADCN_DATETIME_ID,
  SHADCN_EMAIL_ID,
  SHADCN_INPUT_ID,
  SHADCN_LIST_ID,
  SHADCN_MEDIA_ID,
  SHADCN_MONEY_ID,
  SHADCN_RADIO_GROUP_ID,
  SHADCN_SWITCH_ID,
  SHADCN_TABLE_ID,
  SHADCN_TEL_ID,
  SHADCN_TEXTAREA_ID,
  SHADCN_TOGGLE_GROUP_ID,
} from "@rusl-labs/surface-shadcn";
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
import { PhoneDisplay, PhoneInput } from "./phone";
import { MoneyDisplay, MoneyInput } from "./money";
import { US_ADDRESS_ID, UsAddressDisplay, UsAddressInput } from "./address";
import { MediaDisplay } from "./media";
import {
  ComboboxDisplay,
  ComboboxInput,
  RadioGroupDisplay,
  RadioGroupInput,
  ToggleGroupDisplay,
  ToggleGroupInput,
} from "./choices";
import { SwitchDisplay, SwitchInput } from "./switch";
import { CodeDisplay, CodeInput } from "./code";
import { DateDisplay, DateInput, DateTimeDisplay, DateTimeInput } from "./date";
import {
  CarouselDisplay,
  CarouselInput,
  ListDisplay,
  ListInput,
  TableDisplay,
  TableInput,
} from "./collection";
import { AccordionSurface, CollapsibleSurface } from "./disclosure";

const EMAIL_SCALAR_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/email";
const PHONE_SCALAR_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/phone";
const MONEY_SCHEMA_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/money";

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
    ...perMode("tel", PhoneInput, PhoneDisplay),
    // No view restriction: identity, card, row, and default share this renderer.
    ...perMode("money", MoneyInput, MoneyDisplay),
    ...perMode("us-address", UsAddressInput, UsAddressDisplay),
    ...perMode("textarea", TextareaInput, TextareaDisplay),
    { key: "media", mode: "display", view: "default", component: MediaDisplay },
    { key: "media", mode: "display", view: "card", component: MediaDisplay },
    ...perMode("date", DateInput, DateDisplay),
    ...perMode("datetime", DateTimeInput, DateTimeDisplay),
    { key: "table", mode: "display", component: TableDisplay },
    { key: "table", mode: "input", component: TableInput },
    ...perMode("list", ListInput, ListDisplay),
    ...perMode("carousel", CarouselInput, CarouselDisplay),
    ...perMode("combobox", ComboboxInput, ComboboxDisplay),
    ...perMode("radio-group", RadioGroupInput, RadioGroupDisplay),
    ...perMode("toggle-group", ToggleGroupInput, ToggleGroupDisplay),
    ...perMode("switch", SwitchInput, SwitchDisplay),
    ...perMode("code", CodeInput, CodeDisplay),
    ...perMode("accordion", AccordionSurface, AccordionSurface),
    ...perMode("collapsible", CollapsibleSurface, CollapsibleSurface),
    ...perMode("allOf", AllOf, AllOf),
    ...perMode("oneOf", Union, Union),
  ];

  return createRegistryKit({
    fallback: Fallback,
    Root: ShadcnRoot,
    aliases: {
      [EMAIL_SCALAR_ID]: "email",
      [PHONE_SCALAR_ID]: "tel",
      phone: "tel",
      [MONEY_SCHEMA_ID]: "money",
      [US_ADDRESS_ID]: "us-address",
      "idn-email": "email",
      input: "string",
      integer: "number",
      anyOf: "oneOf",
      [SHADCN_INPUT_ID]: "string",
      [SHADCN_EMAIL_ID]: "email",
      [SHADCN_TEXTAREA_ID]: "textarea",
      [SHADCN_TEL_ID]: "tel",
      [SHADCN_MONEY_ID]: "money",
      [SHADCN_MEDIA_ID]: "media",
      [SHADCN_DATE_ID]: "date",
      [SHADCN_DATETIME_ID]: "datetime",
      [SHADCN_TABLE_ID]: "table",
      [SHADCN_COMBOBOX_ID]: "combobox",
      [SHADCN_RADIO_GROUP_ID]: "radio-group",
      [SHADCN_TOGGLE_GROUP_ID]: "toggle-group",
      [SHADCN_SWITCH_ID]: "switch",
      [SHADCN_CODE_ID]: "code",
      [SHADCN_LIST_ID]: "list",
      [SHADCN_CAROUSEL_ID]: "carousel",
      [SHADCN_ACCORDION_ID]: "accordion",
      [SHADCN_COLLAPSIBLE_ID]: "collapsible",
      ...options.aliases,
    },
    resolvers: [...defaults, ...(options.resolvers ?? [])],
  });
}
