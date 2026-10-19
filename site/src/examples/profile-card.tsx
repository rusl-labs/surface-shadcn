import type { SurfaceProps } from "@rusl-labs/surface";
import { isRecord, parsePhoneValue } from "@rusl-labs/surface-shadcn";
import { Mail, Phone } from "lucide-react";
import { ProfileIdentity } from "./profile-components";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** A handcrafted display view registered for the profile type. */
export function ProfileCard(props: SurfaceProps) {
  const { data } = props;
  if (!isRecord(data)) return null;
  const email = text(data.email);
  const phone = parsePhoneValue(data.phone);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <ProfileIdentity {...props} />
        {data.available === true ? (
          <CardAction>
            <Badge variant="secondary">Available</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{text(data.bio)}</p>
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
