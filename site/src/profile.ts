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
    photo: {
      type: "object",
      additionalProperties: false,
      properties: {
        url: { type: "string", format: "uri" },
        alt: { type: "string" },
      },
    },
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
      rest: "omit",
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
        {
          name: "available",
          label: "Available for new projects",
          widget: { name: "switch" },
        },
      ],
    },
    compact: {
      rest: "omit",
      fields: [
        {
          label: "",
          direction: "horizontal",
          fields: [
            { name: "name", label: "Name" },
            { name: "role", label: "Role", widget: null },
          ],
        },
        { name: "email", label: "Email" },
      ],
    },
    details: {
      layout: "stack",
      fields: [
        {
          label: "Profile",
          fields: [
            {
              name: "photo",
              label: "Photo",
              fields: [
                { name: "url", label: "Image URL" },
                { name: "alt", label: "Alt text" },
              ],
              display: {
                widget: { name: "avatar", title: "alt", size: "xl" },
              },
            },
            { name: "name", label: "Full name" },
            {
              name: "bio",
              label: "Bio",
              input: { description: "Up to 280 characters." },
            },
          ],
        },
        {
          label: "Contact",
          widget: { name: "separator" },
          fields: [
            {
              name: "email",
              label: "Work email",
              input: { description: "Used for sign-in." },
            },
            {
              name: "phone",
              label: "Phone",
              display: { widget: { name: "tel", format: "national" } },
            },
          ],
        },
        {
          label: "Work",
          widget: { name: "separator" },
          fields: [
            { name: "role", label: "Role", widget: { name: "radio-group" } },
            { name: "available", label: "Open to new projects" },
          ],
        },
      ],
    },
    identity: {
      rest: "omit",
      fields: [
        {
          name: "photo",
          label: "",
          widget: { name: "avatar", title: "alt", size: "lg" },
        },
        { name: "name", label: "" },
        { template: "{{role}} · {{email}}" },
      ],
    },
    row: {
      rest: "omit",
      direction: "horizontal",
      fields: [
        { name: "name", label: "" },
        { name: "role", label: "" },
        { name: "email", label: "" },
        { name: "phone", label: "" },
      ],
    },
    card: {
      rest: "omit",
      fields: [
        {
          name: "photo",
          label: "",
          widget: { name: "avatar", title: "alt", size: "md" },
        },
        { name: "name", label: "" },
        { template: "{{role}}" },
        {
          label: "",
          widget: { name: "separator" },
          fields: [
            { name: "email", label: "Email" },
            { name: "phone", label: "Phone" },
          ],
        },
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
  readonly photo?: { readonly url?: string; readonly alt?: string };
}

export const initialProfile: Profile = {
  name: "Alex Morgan",
  email: "alex@example.com",
  phone: "+14155550100",
  role: "Design",
  bio: "Product designer in San Francisco.",
  available: true,
  photo: {
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&h=160&q=80",
    alt: "Alex Morgan",
  },
};

export function isProfile(data: unknown): data is Profile {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return typeof record.name === "string" && typeof record.email === "string";
}
