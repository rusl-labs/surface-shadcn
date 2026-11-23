import { isRecord } from "../../src/is-record";
import { documentNames, parseDocuments, type WorkspaceContent } from "./playground-state";

export const SAVED_KEY = "surface-shadcn:playgrounds:v1";
export const SESSION_KEY = "surface-shadcn:workspace:v1";
export interface SavedProject {
  version: 1;
  id: string;
  name: string;
  updatedAt: string;
  workspace: WorkspaceContent;
}

/** Validate imported/local data before it reaches the controller. No migration guessing. */
export function readWorkspaceContent(value: unknown): WorkspaceContent {
  if (!isRecord(value) || !isRecord(value.drafts) || !isRecord(value.applied)) throw new Error("Invalid saved workspace.");
  for (const documents of [value.drafts, value.applied]) {
    for (const name of documentNames) {
      if (typeof documents[name] !== "string" || documents[name].length > 500_000) throw new Error(`Invalid saved ${name} document.`);
    }
  }
  if (!["input", "display"].includes(String(value.mode)) || typeof value.view !== "string") throw new Error("Invalid saved preview selection.");
  const workspace = value as unknown as WorkspaceContent;
  parseDocuments(workspace.applied);
  return {
    drafts: { ...workspace.drafts }, applied: { ...workspace.applied }, mode: workspace.mode, view: workspace.view,
  };
}

export function readSavedProjects(text: string | null): SavedProject[] {
  if (!text) return [];
  const values: unknown = JSON.parse(text);
  if (!Array.isArray(values)) throw new Error("Saved projects must be a list.");
  return values.map(value => {
    if (!isRecord(value) || value.version !== 1 || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.updatedAt !== "string") {
      throw new Error("Unsupported saved project format. Existing storage has not been changed.");
    }
    return { version: 1, id: value.id, name: value.name, updatedAt: value.updatedAt, workspace: readWorkspaceContent(value.workspace) };
  });
}

export function serializeWorkspace(workspace: WorkspaceContent): string {
  return JSON.stringify({ version: 1, workspace: readWorkspaceContent(workspace) });
}

export function deserializeWorkspace(text: string): WorkspaceContent {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || value.version !== 1) throw new Error("Unsupported workspace format.");
  return readWorkspaceContent(value.workspace);
}
