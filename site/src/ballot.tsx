import type { ReactElement } from "react";
import { useSurface } from "@rusl-labs/surface";
import { useFieldState } from "@rusl-labs/surface-shadcn";

/** Display view registered by the homepage. The choice stays the stored string. */
export function BallotChoice(): ReactElement {
  const { data } = useSurface();
  const field = useFieldState();
  const choice = typeof data === "string" ? data : "No vote yet";

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-primary px-5 py-4 text-primary-foreground">
      <p className="text-xs font-medium tracking-wide uppercase opacity-80">
        {field.label || "Vote"}
      </p>
      <p className="font-heading text-2xl leading-tight font-semibold">
        {choice}
      </p>
    </div>
  );
}
