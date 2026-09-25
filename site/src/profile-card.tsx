import type { ReactElement } from "react";
import type { SurfaceProps } from "@rusl-labs/surface";
import { parsePhoneValue } from "@rusl-labs/surface-shadcn";
import { Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isProfile } from "./profile";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Display renderer registered for the profile schema's `card` view. */
export function ProfileCard({ data }: SurfaceProps): ReactElement | null {
  if (!isProfile(data)) return null;
  const phone = parsePhoneValue(data.phone);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initials(data.name)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <CardTitle>{data.name}</CardTitle>
            <CardDescription>{data.role}</CardDescription>
          </div>
        </div>
        {data.available ? (
          <CardAction>
            <Badge variant="secondary">Available</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <a
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          href={`mailto:${data.email}`}
        >
          <Mail className="size-4" />
          {data.email}
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
