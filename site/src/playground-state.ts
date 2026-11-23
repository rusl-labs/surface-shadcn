import { isRecord } from "../../src/is-record";
import { inspectDefinitions, inspectPresentation } from "./playground-diagnostics";

export const documentNames = ["schema", "annotation", "data"] as const;
export type DocumentName = typeof documentNames[number];
export type Documents = Record<DocumentName, string>;
export type PreviewMode = "input" | "display";
export const formatDocument = (value: unknown): string => {
  const text = JSON.stringify(value, null, 2);
  if (text === undefined) throw new Error("A document must be a JSON value.");
  return text;
};
export function parseDocuments(documents: Documents) {
  const result = inspectDefinitions(documents);
  if (result.documents) return result.documents;
  const issue = Object.values(result.checks).flatMap(check => check.issues)[0]!;
  throw new Error(`${issue.document}: ${issue.path || "/"} ${issue.message}`);
}

export interface WorkspaceContent {
  drafts: Documents;
  applied: Documents;
  mode: PreviewMode;
  view: string;
}

interface Snapshot extends WorkspaceContent {
  drafts: Documents;
  applied: Documents;
  revision: number;
  previewRevision: number;
  mode: PreviewMode;
  view: string;
  error: string | null;
  canUndo: boolean;
  activity: readonly string[];
}
export interface UpdateWorkspace {
  expectedRevision: number;
  documents: Partial<Record<DocumentName, unknown>>;
  expectedPreviewRevision?: number;
  preview?: { mode: PreviewMode; view: string };
}
export interface SetPreview { expectedPreviewRevision: number; mode: PreviewMode; view: string }
export interface OperationResult {
  ok: boolean;
  revision: number;
  previewRevision: number;
  code?: string;
  message?: string;
}

/** Page-local POC. No React, browser globals, persistence, or automatic tool registration. */
export function createPlaygroundController(seed: Documents) {
  parseDocuments(seed);
  let state: Snapshot = {
    drafts: { ...seed }, applied: { ...seed }, revision: 0, previewRevision: 0, mode: "display", view: "default",
    error: null, canUndo: false, activity: [],
  };
  const history: Snapshot[] = [];
  const listeners = new Set<() => void>();
  const availableViews = () => [...new Set(["default", ...Object.keys(parseDocuments(state.applied).annotation.views ?? {})])];
  const dirty = () => documentNames.some(name => state.drafts[name] !== state.applied[name]);
  function publish(next: Partial<Snapshot>, message: string, remember = true) {
    if (remember) {
      history.push(state);
      if (history.length > 50) history.shift();
    }
    const previous = state;
    state = { ...state, ...next };
    if (!availableViews().includes(state.view)) state = { ...state, view: "default" };
    const documentsChanged = documentNames.some(name => previous.drafts[name] !== state.drafts[name] || previous.applied[name] !== state.applied[name]);
    const previewChanged = previous.mode !== state.mode || previous.view !== state.view;
    state = {
      ...state, revision: previous.revision + Number(documentsChanged),
      previewRevision: previous.previewRevision + Number(previewChanged), canUndo: history.length > 0,
      activity: [message, ...previous.activity].slice(0, 5),
    };
    for (const listener of listeners) listener();
  }
  function failure(code: string, message: string): OperationResult {
    return { ok: false, code, message, revision: state.revision, previewRevision: state.previewRevision };
  }
  function checkWrite(revision: number) {
    if (revision !== state.revision) return failure("conflict", "Workspace changed. Read it again before writing.");
    if (dirty()) return failure("unapplied_draft", "The editor contains unfinished changes. Ask the user to finish or undo them; they will not be overwritten.");
    return null;
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    readWorkspace(options: { includeDrafts?: boolean } = {}) {
      const documents = parseDocuments(state.applied);
      const draftChecks = inspectDefinitions(state.drafts).checks;
      return {
        revision: state.revision, previewRevision: state.previewRevision, documents,
        ...(options.includeDrafts ? { drafts: { ...state.drafts } } : {}),
        hasUnappliedDrafts: dirty(),
        diagnostics: [...Object.values(draftChecks).flatMap(check => check.issues), ...inspectPresentation(documents, state.mode, state.view)],
        diagnosticScope: dirty() ? "Definition errors describe editor drafts; presentation advice and preview describe the last applied documents." : "Current documents; presentation advice is not proof of rendering.",
        preview: { mode: state.mode, view: state.view }, availableViews: availableViews(),
      };
    },
    editDocument(name: DocumentName, text: string) {
      if (state.drafts[name] === text) return;
      const drafts = { ...state.drafts, [name]: text };
      try {
        parseDocuments(drafts);
        publish({ drafts, applied: drafts, error: null }, `You edited ${name}`);
      } catch (cause) {
        publish({ drafts, error: cause instanceof Error ? cause.message : String(cause) }, `You edited ${name} (draft)`);
      }
    },
    updateWorkspace(request: UpdateWorkspace): OperationResult {
      const blocked = checkWrite(request.expectedRevision);
      if (blocked) return blocked;
      try {
        if (!isRecord(request.documents) || Object.keys(request.documents).length === 0 || Object.keys(request.documents).some(name => !documentNames.includes(name as DocumentName))) {
          return failure("invalid_arguments", "Supply schema, annotation, data, or a combination of them.");
        }
        const next = { ...state.applied };
        for (const name of documentNames) {
          if (Object.hasOwn(request.documents, name)) next[name] = formatDocument(request.documents[name]);
        }
        const parsed = parseDocuments(next);
        if (request.preview) {
          if (request.expectedPreviewRevision !== state.previewRevision) return failure("preview_conflict", "Preview changed or no preview token supplied. Read previewRevision before changing preview.");
          const views = ["default", ...Object.keys(parsed.annotation.views ?? {})];
          if (!["input", "display"].includes(request.preview.mode) || !views.includes(request.preview.view)) return failure("invalid_preview", "Choose input/display and a view in the updated annotation.");
        }
        publish({ drafts: next, applied: next, error: null, ...(request.preview ?? {}) }, `Agent updated ${Object.keys(request.documents).join(", ")}`);
        return { ok: true, revision: state.revision, previewRevision: state.previewRevision, message: "Documents accepted; rendering is a separate observation. Read render diagnostics and validate_workspace to inspect the outcome." };
      } catch (cause) {
        return failure("invalid_documents", cause instanceof Error ? cause.message : String(cause));
      }
    },
    setPreview(request: SetPreview): OperationResult {
      if (request.expectedPreviewRevision !== state.previewRevision) return failure("preview_conflict", "Preview changed. Read previewRevision before selecting a preview.");
      if (!["input", "display"].includes(request.mode) || !availableViews().includes(request.view)) {
        return failure("invalid_preview", "Choose input/display and an available view from read_workspace.");
      }
      publish({ mode: request.mode, view: request.view }, `Agent selected ${request.mode} / ${request.view}`);
      return { ok: true, revision: state.revision, previewRevision: state.previewRevision };
    },
    selectPreview(mode: PreviewMode, view: string) {
      publish({ mode, view }, `You selected ${mode} / ${view}`);
    },
    restore(content: WorkspaceContent) {
      parseDocuments(content.applied);
      let error: string | null = null;
      try { parseDocuments(content.drafts); }
      catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
      publish({ drafts: { ...content.drafts }, applied: { ...content.applied }, mode: content.mode, view: content.view, error }, "You loaded a workspace");
    },
    reset() {
      publish({ drafts: { ...seed }, applied: { ...seed }, error: null, mode: "display", view: "default" }, "You reset the example");
    },
    undo() {
      const previous = history.pop();
      if (previous) publish({ drafts: previous.drafts, applied: previous.applied, error: previous.error, mode: previous.mode, view: previous.view }, "You undid the last change", false);
    },
  };
}
