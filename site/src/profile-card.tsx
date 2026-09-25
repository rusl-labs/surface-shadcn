import type { ReactElement } from "react";
import { useSurface } from "@rusl-labs/surface";
import { isRecord } from "@rusl-labs/surface-shadcn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Object display registered as the `card` view. */
export function ProfileCard(): ReactElement {
  const { data } = useSurface();
  const record = isRecord(data) ? data : {};
  const name = typeof record.name === "string" ? record.name : "";
  const email = typeof record.email === "string" ? record.email : "";
  const role = typeof record.role === "string" ? record.role : "";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{role}</CardDescription>
      </CardHeader>
      <CardContent>
        <a
          className="text-sm underline-offset-4 hover:underline"
          href={`mailto:${email}`}
        >
          {email}
        </a>
      </CardContent>
    </Card>
  );
}
