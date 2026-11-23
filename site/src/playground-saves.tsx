import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceContent } from "./playground-state";
import { SAVED_KEY, deserializeWorkspace, readSavedProjects, serializeWorkspace, type SavedProject } from "./playground-storage";

export function PlaygroundSaves({ read, load }: { read(): WorkspaceContent; load(workspace: WorkspaceContent): void }) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Saved in this browser only. Export a copy to keep elsewhere.");
  const fileInput = useRef<HTMLInputElement>(null);
  const report = (cause: unknown) => setMessage(`Storage error: ${cause instanceof Error ? cause.message : String(cause)}`);
  useEffect(() => {
    const refresh = () => {
      try { setProjects(readSavedProjects(localStorage.getItem(SAVED_KEY))); }
      catch (cause) { report(cause); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  function save(overwrite: boolean) {
    try {
      const label = name.trim();
      if (!label) { setMessage("Give this playground a name first."); return; }
      const current = readSavedProjects(localStorage.getItem(SAVED_KEY));
      if (overwrite && !current.some(project => project.id === selected)) throw new Error("The selected project no longer exists. Save a new copy instead.");
      const project: SavedProject = {
        version: 1, id: overwrite ? selected : crypto.randomUUID(), name: label,
        updatedAt: new Date().toISOString(), workspace: read(),
      };
      const next = [...current.filter(item => item.id !== project.id), project];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setProjects(next); setSelected(project.id); setMessage(`Saved “${label}” locally.`);
    } catch (cause) { report(cause); }
  }
  return <details className="rounded-xl border bg-background/90 p-4">
    <summary className="cursor-pointer text-sm font-medium">Saved playgrounds <span className="text-muted-foreground">({projects.length})</span></summary>
    <div className="mt-4 grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-48 flex-1 gap-2 text-sm">Saved projects
          <select className="h-9 rounded-md border bg-background px-3" aria-label="Saved playgrounds" value={selected}
            onChange={event => { setSelected(event.target.value); setName(projects.find(project => project.id === event.target.value)?.name ?? ""); }}>
            <option value="">Choose a saved playground</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <Button variant="outline" disabled={!selected} onClick={() => {
          try {
            const project = readSavedProjects(localStorage.getItem(SAVED_KEY)).find(item => item.id === selected);
            if (!project) throw new Error("This project no longer exists.");
            load(project.workspace); setMessage(`Opened “${project.name}”. Undo restores the previous workspace.`);
          } catch (cause) { report(cause); }
        }}>Open</Button>
        <Button variant="ghost" disabled={!selected} onClick={() => {
          if (!window.confirm("Delete this saved playground? The current workspace will not be changed.")) return;
          try {
            const next = readSavedProjects(localStorage.getItem(SAVED_KEY)).filter(project => project.id !== selected);
            localStorage.setItem(SAVED_KEY, JSON.stringify(next)); setProjects(next); setSelected(""); setMessage("Saved playground deleted.");
          } catch (cause) { report(cause); }
        }}>Delete</Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-48 flex-1 gap-2 text-sm">Name
          <Input value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="Event registration" />
        </label>
        <Button onClick={() => save(false)}>Save as new</Button>
        <Button variant="outline" disabled={!selected} onClick={() => save(true)}>Update saved</Button>
        <Button variant="outline" onClick={() => {
          const url = URL.createObjectURL(new Blob([serializeWorkspace(read())], { type: "application/json" }));
          const anchor = document.createElement("a"); anchor.href = url; anchor.download = "surface-playground.json"; anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Export JSON</Button>
        <Button variant="ghost" onClick={() => fileInput.current?.click()}>Import JSON</Button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" aria-label="Import playground JSON"
          onChange={async event => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (!file) return;
            try {
              if (file.size > 6_000_000) throw new Error("Import exceeds 6 MB.");
              load(deserializeWorkspace(await file.text())); setMessage("Imported into the workspace. Save to keep a named copy.");
            } catch (cause) { report(cause); }
          }} />
      </div>
      <p role="status" className="text-xs text-muted-foreground">{message}</p>
    </div>
  </details>;
}
