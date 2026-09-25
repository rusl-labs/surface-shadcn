import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  createSurfaceUi,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "@/components/surface/kit";
import annotation from "./profile.annotation.json";
import { ProfileCard } from "./profile-card";
import sample from "./profile.sample.json";
import schema from "./profile.schema.json";

const schemaResolver = new InMemorySchemaFetchResolver({
  ...shadcnSchemas,
  [schema.$id]: schema,
});
const annotationResolver = new InMemoryAnnotationResolver({
  [annotation.subject]: annotation,
});

const Annotated = createSurfaceUi({
  schemaResolver,
  annotationResolver,
  validator: createAjvValidator(),
  kit: createShadcnKit(),
}).Surface;

const WithProfileCard = createSurfaceUi({
  schemaResolver,
  annotationResolver,
  validator: createAjvValidator(),
  kit: createShadcnKit({
    resolvers: [
      {
        key: schema.$id,
        mode: "display",
        view: "card",
        component: ProfileCard,
      },
    ],
  }),
}).Surface;

export function CardViews() {
  return (
    <div className="grid items-start gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Annotation
        </p>
        <Annotated id={schema.$id} data={sample} mode="display" view="card" />
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Registered component
        </p>
        <WithProfileCard id={schema.$id} data={sample} mode="display" view="card" />
      </div>
    </div>
  );
}
