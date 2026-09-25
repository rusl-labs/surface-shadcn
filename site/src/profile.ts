import type { AnnotationDocument } from "@rusl-labs/surface";

export const PROFILE_ID = "https://example.com/schemas/profile.json";

export const profileSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: PROFILE_ID,
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "phone", "role"],
  properties: {
    name: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    phone: {
      $ref: "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/phone",
    },
    role: { type: "string", enum: ["Design", "Engineering", "Product"] },
    bio: { type: "string", maxLength: 280 },
    available: { type: "boolean" },
  },
} as const;

export const profileAnnotation: AnnotationDocument = {
  $kind: "https://resources.rusl.com/resources/rusl/schemas/surface.annotation",
  subject: PROFILE_ID,
  targetLibraries: [
    "https://resources.rusl.com/resources/rusl/schemas/surface.shadcn",
  ],
  views: {
    default: {
      fields: [
        { name: "name", label: "Name" },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        {
          name: "role",
          label: "Role",
          widget: { name: "toggle-group", variant: "outline" },
        },
        { name: "bio", label: "Bio", widget: { name: "textarea" } },
        { name: "available", label: "Available", widget: { name: "switch" } },
      ],
    },
  },
};

export interface Profile {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly role: string;
  readonly bio?: string;
  readonly available?: boolean;
}

export const initialProfile: Profile = {
  name: "Alex Morgan",
  email: "alex@example.com",
  phone: "+14155550100",
  role: "Design",
  bio: "Product designer in San Francisco.",
  available: true,
};

export function isProfile(data: unknown): data is Profile {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return typeof record.name === "string" && typeof record.email === "string";
}
