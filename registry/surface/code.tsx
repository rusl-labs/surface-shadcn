"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { EditorView } from "@codemirror/view";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import CodeMirror from "@uiw/react-codemirror";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import {
  formatCode,
  isObjectWire,
  parseCode,
  useDraftField,
  useFieldState,
} from "@rusl-labs/surface-shadcn";
import { FieldChrome } from "./chrome";
import { widgetString } from "./widget";

const LANGUAGE_ALIAS: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  md: "markdown",
  yml: "yaml",
  text: "",
  plain: "",
  plaintext: "",
};

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--foreground)",
  },
  ".cm-content": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    minHeight: "8rem",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "none",
    color: "var(--muted-foreground)",
  },
  "&.cm-focused": { outline: "none" },
});

function resolveLanguage(name: string | undefined): string {
  if (name === undefined || name.length === 0) return "json";
  const lower = name.toLowerCase();
  return LANGUAGE_ALIAS[lower] ?? lower;
}

function widgetLanguage(
  widget: Parameters<typeof widgetString>[0],
): string | undefined {
  return widgetString(widget, "language") ?? widgetString(widget, "format");
}

/**
 * CodeMirror editor. Object schemas (open maps like `metadata`) store a JSON
 * object on the wire; string schemas store the source text. `language` selects
 * highlighting (`json`, `javascript`, `typescript`, `html`, `css`, `markdown`,
 * `yaml`, …).
 */
export function CodeInput({ data }: SurfaceProps): ReactElement {
  const { schema, dataApi, entry } = useSurface();
  const objectWire = isObjectWire(schema);
  const language = resolveLanguage(widgetLanguage(entry?.widget));
  const formatted = formatCode(data, objectWire);
  const [draft, setDraft] = useState(formatted);
  const [issue, setIssue] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  const lastEmitted = useRef(formatted);
  const { field, resetVersion } = useDraftField(issue, touched);

  useEffect(() => {
    setDraft(formatted);
    setIssue(undefined);
    setTouched(false);
    lastEmitted.current = formatted;
  }, [resetVersion]);

  useEffect(() => {
    if (formatted === lastEmitted.current) return;
    setDraft(formatted);
    setIssue(undefined);
    lastEmitted.current = formatted;
  }, [formatted]);

  const extensions = useMemo(() => {
    const lang =
      language.length > 0 ? loadLanguage(language as never) : undefined;
    return lang
      ? [lang, EditorView.lineWrapping, editorTheme]
      : [EditorView.lineWrapping, editorTheme];
  }, [language]);

  const commit = (text: string): void => {
    if (field.readOnly) return;
    setDraft(text);
    const result = parseCode(text, objectWire);
    if (result.kind === "empty") {
      setIssue(undefined);
      lastEmitted.current = "";
      dataApi?.setData(undefined);
      return;
    }
    if (result.kind === "issue") {
      setIssue(result.message);
      return;
    }
    setIssue(undefined);
    lastEmitted.current = formatCode(result.data, objectWire);
    dataApi?.setData(result.data);
  };

  return (
    <FieldChrome state={field}>
      <div
        className="min-w-0 overflow-hidden rounded-lg border border-input"
        data-invalid={field.invalid ? true : undefined}
      >
        <CodeMirror
          id={field.controlId}
          value={draft}
          height="12rem"
          theme="none"
          editable={!field.readOnly}
          extensions={extensions}
          basicSetup={{ foldGutter: false }}
          aria-label={
            field.showLabels && field.label.length > 0
              ? field.label
              : field.label || "Code"
          }
          onChange={(text) => {
            setTouched(true);
            commit(text);
          }}
        />
      </div>
    </FieldChrome>
  );
}

export function CodeDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, entry } = useSurface();
  const objectWire = isObjectWire(schema);
  const language = resolveLanguage(widgetLanguage(entry?.widget));
  const text = formatCode(data, objectWire);
  const extensions = useMemo(() => {
    const lang =
      language.length > 0 ? loadLanguage(language as never) : undefined;
    return lang
      ? [lang, EditorView.lineWrapping, editorTheme]
      : [EditorView.lineWrapping, editorTheme];
  }, [language]);

  return (
    <FieldChrome state={fs}>
      <div className="min-w-0 overflow-hidden rounded-lg border border-input">
        <CodeMirror
          value={text}
          height="12rem"
          theme="none"
          editable={false}
          extensions={extensions}
          basicSetup={{ foldGutter: false, highlightActiveLine: false }}
          aria-label={
            fs.showLabels && fs.label.length > 0 ? fs.label : fs.label || "Code"
          }
        />
      </div>
    </FieldChrome>
  );
}
