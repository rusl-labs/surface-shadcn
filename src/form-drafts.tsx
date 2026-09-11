import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSurface, type ValidityIssue } from "@rusl-labs/surface";
import { useFieldState } from "./use-field-state";

// No values are stored here: fields own their editing text, Surface owns data.
// Only mounted parse-issue readers and a Reset generation cross the boundary.
interface DraftScope {
  readonly readers: Map<string, () => ValidityIssue | undefined>;
  readonly resetVersion: number;
  readonly reset: () => void;
}

const DraftContext = createContext<DraftScope | undefined>(undefined);

export function FormDraftScope({ children }: { readonly children: ReactNode }) {
  const [readers] = useState(
    () => new Map<string, () => ValidityIssue | undefined>(),
  );
  const [resetVersion, setResetVersion] = useState(0);
  const reset = useCallback(
    () => setResetVersion((version) => version + 1),
    [],
  );
  const value = useMemo(
    () => ({ readers, resetVersion, reset }),
    [readers, resetVersion, reset],
  );
  return (
    <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
  );
}

export function useFormDrafts() {
  const scope = useContext(DraftContext);
  return {
    resetVersion: scope?.resetVersion ?? 0,
    validate: (): ValidityIssue[] => {
      const issues: ValidityIssue[] = [];
      for (const read of scope?.readers.values() ?? []) {
        const issue = read();
        if (issue) issues.push(issue);
      }
      return issues;
    },
    reset: () => scope?.reset(),
  };
}

export function useDraftField(issue: string | undefined, touched: boolean) {
  const field = useFieldState();
  const { dataPath, formSubmitted } = useSurface();
  const scope = useContext(DraftContext);
  const current = useRef({ issue, dataPath });
  current.current = { issue, dataPath };
  useEffect(() => {
    if (!scope) return;
    scope.readers.set(field.controlId, () => {
      const { issue: message, dataPath: path } = current.current;
      return message ? { path: path ?? [], message, code: "input" } : undefined;
    });
    return () => {
      scope.readers.delete(field.controlId);
    };
  }, [scope?.readers, field.controlId]);

  const showIssue = issue !== undefined && (touched || formSubmitted === true);
  return {
    field: showIssue
      ? {
          ...field,
          invalid: true,
          issues: [{ path: [], message: issue, code: "input" }],
          describedBy: [
            field.description ? `${field.controlId}-description` : undefined,
            `${field.controlId}-errors`,
          ]
            .filter(Boolean)
            .join(" "),
        }
      : field,
    resetVersion: scope?.resetVersion ?? 0,
  };
}
