import type { AnnotationDocument } from "@rusl-labs/surface";

export const PROFILE_ID = "urn:surface-shadcn:profile";

export const profileSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: PROFILE_ID,
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "role"],
  properties: {
    name: { type: "string", title: "Name", minLength: 1 },
    email: { type: "string", format: "email", title: "Email" },
    role: {
      type: "string",
      title: "Role",
      enum: ["Design", "Engineering", "Product"],
    },
  },
} as const;

export const initialProfile = {
  name: "Alex Morgan",
  email: "alex@example.com",
  role: "Design",
};

export const profileAnnotation: AnnotationDocument = {
  subject: PROFILE_ID,
  views: {
    default: {
      fields: [
        { name: "name", label: "Name" },
        { name: "email", label: "Email" },
        { name: "role", label: "Role" },
      ],
    },
  },
};
