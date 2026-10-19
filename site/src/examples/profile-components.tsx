import { useId } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord } from "@rusl-labs/surface-shadcn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import schema from "./profile.schema.json";

const text = (value: unknown) => typeof value === "string" ? value : "";

// Registered for the definition URI, not for a particular property name.
export function ProfilePhoto({ data }: SurfaceProps) {
  const photo = isRecord(data) ? data : {};
  return <Avatar size="lg">
    <AvatarImage src={text(photo.url)} alt={text(photo.alt)} />
    <AvatarFallback>{text(photo.alt).split(/\s+/).map(part => part[0]).slice(0, 2).join("") || "?"}</AvatarFallback>
  </Avatar>;
}

export function ProfileIdentity({ data }: SurfaceProps) {
  const { Surface } = useSurface();
  if (!isRecord(data)) return null;
  return <div className="flex items-center gap-3">
    {Surface && <Surface id="photo" schema={schema.properties.photo} data={data.photo} mode="display" view="avatar" />}
    <div className="min-w-0">
      <p className="font-medium">{text(data.name)}</p>
      <p className="text-sm text-muted-foreground">{text(data.role)}</p>
    </div>
  </div>;
}

export function ProfileRow(props: SurfaceProps) {
  const data = isRecord(props.data) ? props.data : {};
  return <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
    <ProfileIdentity {...props} />
    <a className="text-sm text-muted-foreground underline underline-offset-4" href={`mailto:${text(data.email)}`}>{text(data.email)}</a>
    <Badge variant="secondary">{data.available ? "Available" : "Busy"}</Badge>
  </div>;
}

export function ProfileByline(props: SurfaceProps) {
  return <div className="flex flex-wrap items-center gap-3 text-sm">
    <span className="text-muted-foreground">Written by</span>
    <ProfileIdentity {...props} />
  </div>;
}

export function ProfileEdit({ data }: SurfaceProps) {
  const { dataApi } = useSurface();
  const prefix = useId();
  const profile = isRecord(data) ? data : {};
  return <div className="grid max-w-md gap-4">
    {(["name", "email", "bio"] as const).map(name => <div key={name} className="grid gap-2">
      <Label htmlFor={`${prefix}-${name}`} className="capitalize">{name}</Label>
      <Input id={`${prefix}-${name}`} type={name === "email" ? "email" : "text"}
        value={text(profile[name])} required={name !== "bio"}
        maxLength={name === "bio" ? 280 : undefined}
        onChange={event => dataApi?.setChild(name, event.currentTarget.value)} />
    </div>)}
    <div className="grid gap-2">
      <Label htmlFor={`${prefix}-role`}>Role</Label>
      <select id={`${prefix}-role`} className="h-9 rounded-md border bg-background px-3 text-sm"
        value={text(profile.role)} onChange={event => dataApi?.setChild("role", event.currentTarget.value)}>
        {schema.properties.role.enum.map(role => <option key={role}>{role}</option>)}
      </select>
    </div>
  </div>;
}
