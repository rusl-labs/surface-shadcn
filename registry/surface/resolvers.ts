import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
} from "@rusl-labs/surface";
import { shadcnSchemas } from "@rusl-labs/surface-shadcn";

// Supported canonical documents resolve offline. Add your own local schemas here.
export const schemaResolver = new InMemorySchemaFetchResolver(shadcnSchemas);

// Register annotations explicitly; schema URLs do not imply annotation URLs.
export const annotationResolver = new InMemoryAnnotationResolver({});
