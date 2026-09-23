"use client";

import type { ReactElement, SVGProps } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import {
  resolveAvatar,
  useFieldState,
  type AvatarShape,
  type AvatarSize,
} from "@rusl-labs/surface-shadcn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FieldChrome } from "./chrome";

const SIZE_CLASS: Record<AvatarSize, string> = {
  tiny: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
};

const TEXT_CLASS: Record<AvatarSize, string> = {
  tiny: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const SHAPE_CLASS: Record<AvatarShape, string> = {
  circle: "rounded-full after:rounded-full",
  rounded: "rounded-lg after:rounded-lg",
  square: "rounded-none after:rounded-none",
};

const CLIP_CLASS: Record<AvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-lg",
  square: "rounded-none",
};

function NeutralMark(props: SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 4v1h16v-1c0-2.3-4.7-4-8-4z" />
    </svg>
  );
}

/** Display-only profile image. Empty or failed sources fall back to initials. */
export function AvatarDisplay({ data }: SurfaceProps): ReactElement {
  const { entry } = useSurface();
  const field = useFieldState();
  const avatar = resolveAvatar(data, entry?.widget);
  return (
    <FieldChrome state={field}>
      <Avatar
        data-avatar-size={avatar.size}
        data-avatar-shape={avatar.shape}
        className={`${SIZE_CLASS[avatar.size]} ${SHAPE_CLASS[avatar.shape]}`}
      >
        {avatar.src !== undefined ? (
          <AvatarImage
            src={avatar.src}
            alt={avatar.title ?? ""}
            className={CLIP_CLASS[avatar.shape]}
          />
        ) : null}
        <AvatarFallback
          aria-label={avatar.title ?? "Avatar"}
          className={`${CLIP_CLASS[avatar.shape]} ${TEXT_CLASS[avatar.size]}`}
        >
          {avatar.initials ?? <NeutralMark className="size-1/2" />}
        </AvatarFallback>
      </Avatar>
    </FieldChrome>
  );
}
