import type { AnnotationWidget } from "@rusl-labs/surface";
import { resolveBinding, safeImageSrc, valueAtPath } from "./binding";
import { isRecord } from "./is-record";

export const AVATAR_SIZES = ["tiny", "sm", "md", "lg", "xl"] as const;
export const AVATAR_SHAPES = ["circle", "rounded", "square"] as const;

/** First letter of each word, then at most this many characters. */
export const AVATAR_INITIALS_CAP = 2;

export type AvatarSize = (typeof AVATAR_SIZES)[number];
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

/** Resolved presentation for one avatar; the underlying value is never rewritten. */
export interface ResolvedAvatar {
  readonly src?: string;
  readonly title?: string;
  readonly initials?: string;
  readonly size: AvatarSize;
  readonly shape: AvatarShape;
}

function option(widget: AnnotationWidget | undefined, key: string): unknown {
  const nested = isRecord(widget?.options) ? widget.options : undefined;
  return widget?.[key] !== undefined ? widget[key] : nested?.[key];
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Uppercased first letter of each word, capped at {@link AVATAR_INITIALS_CAP}. */
export function initialsFromTitle(title: string): string | undefined {
  const letters = title
    .trim()
    .split(/\s+/)
    .flatMap((word) => {
      const letter = Array.from(word)[0];
      return letter === undefined ? [] : [letter];
    });
  if (letters.length === 0) return undefined;
  const initials = letters
    .slice(0, AVATAR_INITIALS_CAP)
    .join("")
    .toLocaleUpperCase();
  return initials.length > 0 ? initials : undefined;
}

/**
 * Resolve an avatar widget.
 *
 * `src` uses the same binding and URL rules as media `src` (dotted path,
 * template, or literal; omitted `src` reads a string value or `url`). An
 * empty or unsafe source is omitted so the fallback can show. `title` is
 * optional and is not invented from other fields.
 */
export function resolveAvatar(
  data: unknown,
  widget: AnnotationWidget | undefined,
): ResolvedAvatar {
  const srcOption = option(widget, "src");
  const rawSrc =
    srcOption === undefined
      ? typeof data === "string"
        ? data
        : valueAtPath(data, "url")
      : resolveBinding(data, srcOption);
  const src = safeImageSrc(rawSrc);
  const titleOption = option(widget, "title");
  const rawTitle =
    titleOption === undefined ? undefined : resolveBinding(data, titleOption);
  const title =
    typeof rawTitle === "string" && rawTitle.trim() !== ""
      ? rawTitle.trim()
      : undefined;
  const initials = title === undefined ? undefined : initialsFromTitle(title);
  return {
    ...(src !== undefined ? { src } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(initials !== undefined ? { initials } : {}),
    size: oneOf(option(widget, "size"), AVATAR_SIZES, "md"),
    shape: oneOf(option(widget, "shape"), AVATAR_SHAPES, "circle"),
  };
}
