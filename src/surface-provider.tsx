import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Presentation defaults only; existing data and field-specific settings win. */
export interface SurfaceDefaults {
  readonly locale?: string;
  readonly defaultCountry?: string;
  readonly defaultCurrency?: string;
}

const DefaultsContext = createContext<SurfaceDefaults>({});

export function SurfaceProvider({
  children,
  ...defaults
}: SurfaceDefaults & { readonly children: ReactNode }) {
  const parent = useContext(DefaultsContext);
  const value = useMemo(
    () => ({
      locale: defaults.locale ?? parent.locale,
      defaultCountry: defaults.defaultCountry ?? parent.defaultCountry,
      defaultCurrency: defaults.defaultCurrency ?? parent.defaultCurrency,
    }),
    [
      defaults.locale,
      defaults.defaultCountry,
      defaults.defaultCurrency,
      parent,
    ],
  );
  return (
    <DefaultsContext.Provider value={value}>
      {children}
    </DefaultsContext.Provider>
  );
}

export function useSurfaceDefaults(): SurfaceDefaults & {
  readonly locale: string;
} {
  const defaults = useContext(DefaultsContext);
  // The server and first client render agree. Apps can pass a server-selected
  // locale to avoid a post-hydration formatting change altogether.
  const [browserLocale, setBrowserLocale] = useState("en");
  useEffect(() => {
    if (!defaults.locale)
      setBrowserLocale(navigator.languages[0] ?? navigator.language ?? "en");
  }, [defaults.locale]);
  return { ...defaults, locale: defaults.locale ?? browserLocale };
}
