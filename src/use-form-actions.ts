import { useCallback, useRef, useState } from "react";
import {
  useSurface,
  type SurfaceContext,
  type ValidateResult,
} from "@rusl-labs/surface";
import { applyConstAndDefaults } from "./apply-const-defaults";

/** Root form-shell actions for the Save / Reset chrome. */
export interface FormActions {
  /**
   * Prepare (const/default), validate, and — when valid — submit the channel.
   * Reports the result through the Surface validity channel either way.
   * Resolves `true` when validation and the optional submit handler complete.
   */
  readonly save: () => Promise<boolean>;
  /** Restore the channel to its initial data and clear validity. */
  readonly reset: () => void;
  /** True while a {@link save} is in flight. */
  readonly pending: boolean;
}

function failResult(message: string): ValidateResult {
  return { valid: false, issues: [{ path: [], message, code: "save" }] };
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function useFormActions(): FormActions {
  const surface = useSurface();
  const [pending, setPending] = useState(false);

  // Save is async (a validator may compileAsync, onSubmit may be async), so it
  // reads the whole latest Surface context at call time from one ref.
  const surfaceRef = useRef<SurfaceContext>(surface);
  surfaceRef.current = surface;

  // Reset bumps the generation so a late-completing save cannot overwrite the
  // freshly reset data or report/submit a stale outcome.
  const generationRef = useRef(0);
  // One save at a time; concurrent callers share the in-flight result.
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const runSave = useCallback(async (): Promise<boolean> => {
    const generation = generationRef.current;
    const {
      dataApi: api,
      options,
      onSubmit,
      schema,
      id,
      document,
      documentUri,
    } = surfaceRef.current;

    if (api === undefined) return false;
    if (options?.validator === undefined) {
      api.reportValidation?.(
        failResult("Save failed: no validator configured"),
      );
      return false;
    }
    if (options.schemaResolver === undefined) {
      api.reportValidation?.(
        failResult("Save failed: no schemaResolver configured"),
      );
      return false;
    }
    const subjectId = id ?? "";
    if (schema === undefined || subjectId.length === 0) {
      api.reportValidation?.(
        failResult("Save failed: missing schema or subject id"),
      );
      return false;
    }

    // Force const / fill defaults so validation never depends on mount-time
    // seeding; document scope lets relative refs resolve.
    let data: unknown;
    try {
      data = await applyConstAndDefaults(
        schema,
        api.data,
        options.schemaResolver,
        {
          document,
          documentUri,
        },
      );
    } catch (cause) {
      if (generationRef.current !== generation) return false;
      api.reportValidation?.(
        failResult(
          `Save failed applying const/default: ${errorMessage(cause)}`,
        ),
      );
      return false;
    }
    // A reset during preparation wins — do not clobber it with the prepared data.
    if (generationRef.current !== generation) return false;
    api.setData(data);

    let result: ValidateResult;
    try {
      result = await Promise.resolve(
        options.validator.validate({
          id: subjectId,
          schema,
          data,
          schemaResolver: options.schemaResolver,
        }),
      );
    } catch (cause) {
      result = failResult(`Save failed: ${errorMessage(cause)}`);
    }

    if (generationRef.current !== generation) return false;
    api.reportValidation?.(result);
    if (!result.valid) return false;

    if (onSubmit === undefined) return true;
    try {
      // Await so an async submit's rejection is caught, not left to escape.
      await Promise.resolve(onSubmit({ data }));
    } catch (cause) {
      if (generationRef.current !== generation) return false;
      api.reportValidation?.(
        failResult(`Save failed in submit handler: ${errorMessage(cause)}`),
      );
      return false;
    }
    return generationRef.current === generation;
  }, []);

  const save = useCallback((): Promise<boolean> => {
    if (inFlightRef.current !== null) return inFlightRef.current;
    setPending(true);
    const promise = runSave().finally(() => {
      inFlightRef.current = null;
      setPending(false);
    });
    inFlightRef.current = promise;
    return promise;
  }, [runSave]);

  const reset = useCallback((): void => {
    generationRef.current += 1;
    surfaceRef.current.dataApi?.reset?.();
  }, []);

  return { save, reset, pending };
}
