import type { SurfaceProps } from "@rusl-labs/surface";
import { isRecord, parsePhoneValue } from "@rusl-labs/surface-shadcn";
import { Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Replaces the annotation's `card` view in display mode. */
export function ProfileCard({ data }: SurfaceProps) {
  if (!isRecord(data)) return null;
  const name = text(data.name);
  const email = text(data.email);
  const photo = isRecord(data.photo) ? data.photo : {};
  const phone = parsePhoneValue(data.phone);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {text(photo.url) ? (
              <AvatarImage src={text(photo.url)} alt={text(photo.alt)} />
            ) : null}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <CardTitle>{name}</CardTitle>
            <CardDescription>{text(data.role)}</CardDescription>
          </div>
        </div>
        {data.available === true ? (
          <CardAction>
            <Badge variant="secondary">Available</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <a
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          href={`mailto:${email}`}
        >
          <Mail className="size-4" />
          {email}
        </a>
        {phone ? (
          <a
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            href={phone.uri}
          >
            <Phone className="size-4" />
            {phone.international}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
