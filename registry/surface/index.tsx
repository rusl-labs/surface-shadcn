"use client";

import { createSurfaceUi } from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createShadcnKit } from "./kit";
import { annotationResolver, schemaResolver } from "./resolvers";
export { SurfaceProvider } from "@rusl-labs/surface-shadcn";

// One configured family, shared by root and child Surfaces.
export const { Surface } = createSurfaceUi({
  schemaResolver,
  annotationResolver,
  validator: createAjvValidator(),
  kit: createShadcnKit(),
});
