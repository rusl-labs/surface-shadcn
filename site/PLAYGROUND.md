# Playground POC

The homepage embeds the playground. `/playground/` is the full-width static page,
with a resizable split, local saved projects, and JSON import/export. Both pages
use the same controller, editor, and tool registration code. GitHub Pages serves
`dist/playground/index.html` directly; no SPA fallback or backend is needed.

## Scope

This is a **page-local WebMCP proof of concept**, not a change to Surface and not
an HTTP/stdio MCP server. No tools register on module import or inside Surface.
`Playground` explicitly calls `registerPlaygroundTools(bindings)` and invokes the
returned cleanup function when unmounted or paused.

- `src/playground-state.ts`: editor drafts, applied documents, revision checks,
  atomic updates, undo, preview selection, and document validation.
- `src/playground-tools.ts`: explicit binding to the experimental browser API.
- `src/playground-diagnostics.ts`: located definition, reference, and data checks.
- `src/playground-observer.tsx`: generation-scoped resolver and committed-renderer observations.
- `src/playground-guidance.ts`: focused annotation/widget examples and current limitations.
- `src/playground.tsx`: React integration and instance-owned bindings.
- `src/playground-storage.ts`: versioned, validated local save/import format.
- `src/playground-saves.tsx`: named projects; never exposed as agent write tools.

No new runtime dependencies. Reuses CodeMirror JSON support, Surface resolvers,
AJV, the installed Surface annotation schema, and the shadcn kit.

## Local Surface dependency and run

Root, example, and site now use `file:` dependencies on `../surface/packages/core`.
Build the sibling checkout before installing. Its standalone-heading patch is
required; published `0.1.1` does **not** contain it despite sharing the version number.
The sibling's `labelDisplay` work is still a proposal, not an implemented API.

From this repository root:

```sh
(cd ../surface/packages/core && bun run build)
bun install
(cd site && bun install)
bun run check:runtime
cd site
bun run dev --host 0.0.0.0 --port 5173 --strictPort
```

Open `http://localhost:5173/playground/`. A LAN HTTP address can show the UI, but
is not a secure context for WebMCP. Use localhost (including an SSH port forward)
or HTTPS for agent access.

After changing Surface, rebuild its core package, run `bun install --force` in
this root and in `site/`, then restart Vite with `--force` to refresh its dependency
cache. `check:runtime` compares installed builds with the sibling dist and probes
standalone-heading support. The site dedupes React; the example/test runtime stays
shared with the root install. Site DOM tests use `tsconfig.test.json` to resolve
runtime React, not the typecheck configuration's declaration-file aliases.

**Local-development dependency:** a clean CI checkout does not contain `../surface`.
Before deployment/publication, replace these paths with a released or reproducibly
pinned distributable containing the patch. No deployment or publication is part of
this change.

## Enable and verify WebMCP

Chrome's current API is `document.modelContext`, not the older
`navigator.modelContext`. It is experimental and is not available by default in
all browsers. In supported Chrome, enable
`chrome://flags/#enable-webmcp-testing` and relaunch. For published production
access without the local flag, evaluate Chrome's origin-trial requirements.
No origin-trial token is included here.

Tested locally with Chrome 155:

```sh
agent-browser --session surface-webmcp \
  --executable-path /usr/bin/google-chrome \
  --args '--enable-features=WebMCPTesting' \
  open http://localhost:5173/playground/
```

A compatible browser agent can discover and invoke native tools. If its browser
interface offers JavaScript evaluation, this is the native API flow (not a
custom global or mock server):

```js
const tools = await document.modelContext.getTools();
const call = async (name, input = {}) => {
  const tool = tools.find(t => t.name === `surface_playground_${name}`);
  const result = await document.modelContext.executeTool(tool, input);
  return typeof result === "string" ? JSON.parse(result) : result;
};

await call("get_guidance");
const before = await call("read_workspace");
await call("update_workspace", {
  expectedRevision: before.revision,
  documents: {
    data: { ...before.documents.data, title: "Built with my agent" },
  },
});
await call("validate_workspace");
```

Tool descriptions and input schemas live together in `playground-tools.ts` and
are runtime-validated. Available tools:

- `surface_playground_get_guidance`
- `surface_playground_read_workspace`
- `surface_playground_update_workspace`
- `surface_playground_set_preview`
- `surface_playground_validate_workspace`

`update_workspace` replaces any combination of schema, annotation, and data as
JSON values, atomically. Read the current document `revision` before every document write. A changed
revision returns `conflict`; incomplete editor drafts return `unapplied_draft`.
Agent writes never discard an unfinished human edit. Input data may be incomplete
or invalid against its schema while being authored: validation reports those
problems separately. An accepted document update is not a claim that rendering
has succeeded; inspect the preview as well.

- `read_workspace({})` omits raw editor text; `read_workspace({includeDrafts: true})`
  includes it. Draft status and diagnostics are always available.
- `get_guidance({topic: "separators"})` returns focused guidance; use
  `{topic: "widgets", widget: "email"}` for one widget's option contract.
  Available topics: overview, annotations, separators, labels, references, widgets,
  full. Only `full` returns the complete agent guide.
- `set_preview({expectedPreviewRevision, mode, view})` uses a **separate preview
  token**. This intentionally replaces the previous `expectedRevision` argument.
  Preview-only changes do not invalidate document writes.
- An atomic combined write includes `expectedRevision`, `documents`,
  `expectedPreviewRevision`, and `preview: {mode, view}`. The view is checked against
  the updated annotation. A stale preview token returns `preview_conflict`; invalid
  selection rejects the entire update. Neither documents nor selection changes.
- Undo, restore, reset, and automatic fallback to `default` increment only the
  revision domains they actually change. Tokens are not saved in workspace files.

```js
const current = await call("read_workspace");
await call("update_workspace", {
  expectedRevision: current.revision,
  expectedPreviewRevision: current.previewRevision,
  documents: { annotation: nextAnnotation },
  preview: { mode: "input", view: "compact" },
});
```

The schema editor currently validates against the JSON Schema meta-schemas
supported by AJV's 2020 entry point. Surface annotations are checked against the
repository's installed annotation schema. The schema must have an `$id`, and the
annotation subject must match it. Each JSON document is limited to 500,000
characters. The mounted form uses Surface's AJV adapter. Page diagnostics use the
same AJV 2020/formats engine with Surface's schema resolver, retaining structured
missing-reference errors separately from data issues. Reference validation is
bounded to 64 loaded documents.

## Diagnostics and rendering

The visible diagnostics panel and tools distinguish:

- Definition acceptance (valid JSON, schema definition, annotation envelope).
- `checks.schema`, `checks.annotation`, `checks.reference`, and `checks.data`.
  Statuses are `valid`, `invalid`, `incomplete`, or `not-run`. Missing required or
  empty constrained input is incomplete data; nonempty type/format errors are
  invalid data. Broken definitions/references block data checks rather than
  declaring data valid or invalid.
- Definition advice: unsupported widget requests, explicit hiding/omission,
  core-pruned root sections, and layouts wrongly placed on referenced items.
  Advice is located in annotation JSON and is **not** evidence of a mounted node.
  It is bounded inspection, not a complete prediction of every nested layout.
- Render observations: committed kit renderers, fallback usage, resolver failures,
  and boundary exceptions. Status is `not-observed`, `loading`, `observed`, or
  `error`, tagged with both revisions. `observed` is not a success assertion:
  core can return null before invoking the kit, and a parent can commit while a
  child is missing. Always inspect validation alongside the render report.

Default reads include the latest background validation (possibly stale/pending).
`validate_workspace` runs fresh checks against editor drafts; the render report
always describes **applied** documents. Responses mark stale reports. A draft error
never gets presented as a successful preview of the draft. Renderer wrappers stay
stable across data changes; old-generation async completions cannot overwrite a
new generation's report.

## Separators and labels

With the local Surface patch, this standalone entry works inside object fields,
including inline `items.fields`:

```json
{ "label": "", "widget": { "name": "separator" } }
```

A populated section with that widget gets a separator before its body. Top-level
`orientation` overrides `options.orientation`; `options.label` supplies a caption.
A separator is not a bound-field renderer. Omit `fields` for standalone entries;
`fields: []` is invalid, and sections whose children are all omitted remain pruned.

This does **not** mean between adjacent array items. Item annotations repeat in
every item, including the last. No built-in divider option has been added to the
array/list contract. Use a registered custom array view that inserts `<Separator />`
before each item where `index > 0`; it produces `max(0, n - 1)` separators, with none
trailing. The focused separator tool contains the tested component example.
Registering that view requires application code, not a JSON-only playground edit.

`label: ""` hides visible text; explicit widget placeholders are supported hints.
Controls retain a separate semantic name derived from meaningful label/view text,
schema title, or property/item identity. Placeholders and selected values are not
substitutes for names. `<Surface labels={false}>` remains a runtime chrome switch.
**Annotation-level `labelDisplay` and automatic label-to-placeholder policy are
not available in the local checkout yet**; the pinned envelope rejects them.
Anonymous roots still require meaningful schema metadata or application labeling.

## State, storage, and safety

- The browser tools have access only to the mounted playground's bound methods.
- There is no arbitrary JavaScript execution tool, file access, registry publishing,
  saved-project deletion tool, or arbitrary localStorage access tool.
- Schema reference resolution can fetch URLs through the browser. Browser/CORS
  restrictions apply; this POC does not add a proxy or remote schema allowlist.
- Document contents are untrusted data. Tool metadata marks them accordingly.
- Guidance links to the site's `/llms.txt`, the Surface annotation reference, and
  `https://rusl.com/llms.txt`. These links do not authorize writes to Rusl.
- Pause unregisters only this instance's tools. Other consumers can supply a
  distinct namespace when explicitly registering a second instance.
- Undo retains the last 50 edits in memory. Loading/resetting is undoable.
- Session storage carries the current workspace between the compact and expanded
  pages and through reloads in the same tab. Drafts and last-valid documents are
  preserved. Undo history is not persisted.
- Named projects are explicitly saved in localStorage, scoped to this origin and
  browser. Data is **not encrypted**; do not store secrets. It is not cloud backup.
- Export/import uses a version-1 workspace envelope. Unsupported formats fail
  visibly. Invalid saved lists are not silently replaced during saves.
- Other tabs refresh the saved-project list; their current editor is not replaced.
  This is not collaborative multi-tab editing or a cloud synchronization system.

## Checks

```sh
cd site
bun run test
bun run typecheck
bun run build
```

Unit tests cover atomic writes, stale revisions, unfinished drafts, annotation and
schema validation, null data, preview selection, undo, tool argument validation,
unsupported browsers, registration rollback, and storage round-trips. Additional
checks cover categorized diagnostics, focused guidance, separate revision domains,
combined transaction rejection, fallback and null-on-resolution-failure observation,
StrictMode cleanup, stale async generations, and input identity/focus preservation.

Also verify through a real browser: native discovery and execution, annotation
and data edits reflected in CodeMirror/preview, `set_preview`, data validation,
Pause cleanup, compact/expanded handoff, local save/load, resizing, and narrow
screen layout. Browser availability is shown honestly; “tools available” does
not claim an agent is connected.
