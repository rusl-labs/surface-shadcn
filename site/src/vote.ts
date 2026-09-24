import type { AnnotationDocument } from "@rusl-labs/surface";

export const VOTE_ID = "urn:surface-shadcn:homepage-vote";

export const voteSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: VOTE_ID,
  title: "Vote",
  description: "A small ballot used on the Surface shadcn homepage.",
  type: "object",
  required: ["choice"],
  additionalProperties: false,
  properties: {
    choice: {
      type: "string",
      title: "Ship first",
      enum: ["The registry block", "The npm package", "Both, together"],
    },
    note: {
      type: "string",
      title: "Note",
      maxLength: 140,
    },
  },
} as const;

export const voteAnnotation: AnnotationDocument = {
  $kind: "https://resources.rusl.com/resources/rusl/schemas/surface.annotation",
  subject: VOTE_ID,
  targetLibraries: [
    "https://resources.rusl.com/resources/rusl/schemas/surface.shadcn",
  ],
  views: {
    default: {
      fields: [
        { name: "choice", label: "Ship first" },
        {
          name: "note",
          label: "Note",
          widget: { name: "textarea" },
        },
      ],
    },
  },
};

export const initialVote = {
  choice: "Both, together",
  note: "The page shows the kit. The registry installs it.",
};
