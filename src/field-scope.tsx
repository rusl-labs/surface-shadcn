import {
  createContext,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";

/** Props for {@link FieldScope}. */
export interface FieldScopeProps {
  /** Whether the wrapped field is required by its parent object. */
  readonly required?: boolean;
  /**
   * Read-only from here down. Latches: once an ancestor scope is read-only,
   * every descendant stays read-only regardless of its own prop.
   */
  readonly readOnly?: boolean;
  /** Parent chrome owns this node's label; descendants reset this flag. */
  readonly omitLabel?: boolean;
  readonly children: ReactNode;
}

/** Inherited field meta a wrapper reads through {@link useFieldState}. */
export interface FieldScopeValue {
  readonly required: boolean;
  readonly readOnly: boolean;
  readonly omitLabel: boolean;
}

export const FieldScopeContext = createContext<FieldScopeValue>({
  required: false,
  readOnly: false,
  omitLabel: false,
});

/**
 * Provide per-field meta to the field a wrapper is about to mount. `required`
 * is set fresh at each field (an object's optional property is not required
 * just because the object is); `readOnly` inherits true downward.
 */
export function FieldScope({
  required = false,
  readOnly = false,
  omitLabel = false,
  children,
}: FieldScopeProps): ReactElement {
  const inheritedReadOnly = useContext(FieldScopeContext).readOnly;
  const value = useMemo<FieldScopeValue>(
    () => ({ required, readOnly: inheritedReadOnly || readOnly, omitLabel }),
    [required, readOnly, inheritedReadOnly, omitLabel],
  );
  return (
    <FieldScopeContext.Provider value={value}>
      {children}
    </FieldScopeContext.Provider>
  );
}
