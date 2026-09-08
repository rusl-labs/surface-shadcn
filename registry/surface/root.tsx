"use client";

import { useEffect, useRef, type ReactElement } from "react";
import {
  issuesAt,
  useSurface,
  type SurfaceRootProps,
} from "@rusl-labs/surface";
import { useFormActions } from "@rusl-labs/surface-shadcn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Kit root shell. In input mode it wraps the resolved body with Reset / Save
 * chrome. Save is a plain button that runs the headless {@link useFormActions};
 * the surrounding element is `role="group"` (never a native `<form>`), so
 * there is no browser submit and root validation stays authoritative.
 *
 * Root-path issues (and any save failure) surface in a local Alert; per-field
 * issues surface on their own controls. After a failed Save, focus moves to the
 * first invalid control (or the alert) using a ref + attribute query, without
 * depending on any other kit's markup or CSS.
 */
export function ShadcnRoot({ children }: SurfaceRootProps): ReactElement {
  const { mode, validity, formSubmitted } = useSurface();
  const { save, reset, pending } = useFormActions();
  const shellRef = useRef<HTMLDivElement>(null);
  const prevSubmitted = useRef(false);

  const allIssues = formSubmitted === true ? (validity?.issues ?? []) : [];
  const rootIssues = issuesAt(allIssues, []);
  const summaryIssues = rootIssues.length > 0 ? rootIssues : allIssues;

  useEffect(() => {
    const justFailed = formSubmitted === true && !prevSubmitted.current;
    prevSubmitted.current = formSubmitted === true;
    if (!justFailed) return;
    const shell = shellRef.current;
    if (shell === null) return;
    const frame = requestAnimationFrame(() => {
      const invalid = shell.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (invalid !== null) {
        invalid.focus();
        return;
      }
      const alert = shell.querySelector<HTMLElement>(
        "[data-surface-root-error]",
      );
      if (alert !== null) {
        alert.focus();
        return;
      }
      shell
        .querySelector<HTMLElement>(
          "input:not([type=hidden]):not([readonly]), select, textarea",
        )
        ?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [formSubmitted, validity?.issues]);

  if (mode !== "input") return <>{children}</>;

  return (
    <div
      ref={shellRef}
      role="group"
      aria-label="Surface form"
      className="flex flex-col gap-6"
    >
      {children}
      {allIssues.length > 0 ? (
        <Alert
          variant="destructive"
          role="alert"
          tabIndex={-1}
          data-surface-root-error
        >
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {summaryIssues.map((issue, index) => (
                <li key={`${issue.path.join(".")}-${index}`}>
                  {issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""}
                  {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            reset();
          }}
        >
          Reset
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            void save();
          }}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
