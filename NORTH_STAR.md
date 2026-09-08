# Surface shadcn: north star

Status: working kit, URL playground, and node-local composition mappings implemented and browser-verified; the broader catalog remains a revisable roadmap. Updated 2026-09-08.

## The product

**`@rusl-labs/surface-shadcn` turns schemas, annotations, and data into useful input and display surfaces built from the consuming application's own shadcn components.**

Start with a small, working kit. Grow into a rich vocabulary of field widgets, structured layouts, and well-known schema renderers. Simple controls are the defaults, not the ceiling. A table, accordion, description list, or money editor is a first-class kit capability, not merely a demo block.

Success looks like this: an application installs the kit, connects its existing Surface schema resolver and validator, and gets useful UI without writing per-schema components. Annotations and registrations progressively customize it. Editing the application's local Input, Field, Card, or Table changes the corresponding Surface presentation too.

This document sets direction and a revisable order of work. It deliberately does not freeze widget option schemas, registry addresses, package boundaries, or release dates.

## Current implementation

The **Now** slice below is implemented, not the full catalog:

- `src/` is the npm support package: inherited field metadata, accessible field state, initial values, const/default preparation, and asynchronous Save/Reset behavior.
- `registry/surface/` contains 14 locally installed wrapper files. `createShadcnKit()` is exported from the installed `components/surface/kit` location, not the npm package. It supports input/display for objects, arrays, strings/email, textarea, booleans, enum values, numbers/integers, const values, and composition nodes.
- `registry.json` builds the standard `surface` registry item into `public/r/surface.json`. Wrappers import local shadcn primitives; the npm package contains no shadcn UI copy.
- `example/` is a Vite schema workspace. Paste an HTTP(S) schema URL or select an example, then edit and display its data. Definition libraries expose a picker, and direct JSON Pointer URLs such as `#/$defs/email` work. Failed loads keep the current editor; switching schemas starts a separate draft and saved state. The built-in annotated contact demo remains available.
- `rusl.bundle.toml` installs `surface.annotation`, `surface.default-kit`, and `pragmatic/contact.scalars`. `rusl/schemas/surface.shadcn` is installed with `dev = true`; its implemented first widget is `textarea`.
- Composition renderers mount child `Surface` instances with the current mode/view. Core handles references, definition identities, annotation overrides, renderer lookup, and data paths. Variant changes keep the shared value; mounted fields apply their own declared constants/defaults.
- Variant labels use the referenced schema's `title` through the configured resolver, falling back to the existing inline/reference/option label. This metadata lookup does not plan the child renderer or scan its fields.
- Shared controls use core aliases (`input` → `string`, `integer` → `number`, `anyOf` → `oneOf`). `createShadcnKit({ aliases, resolvers })` forwards extensions to the core registry rather than implementing another lookup layer.

Verified target: React 19.2, Surface/AJV adapter 0.1.0, Tailwind 4.3, shadcn CLI 4.21, Base UI 1.8 / Nova. Other bases and versions are not yet claimed. The current CLI uses `--preset nova --base base`; it records `base-nova` in `components.json`.

### Work locally

```sh
bun install
rusl install
bun run dev
```

The example runs at `http://127.0.0.1:5173`. Edit `example/src/contact.annotation.json` to change presentation, `schemas/rusl/surface.shadcn.schema.json` to develop the widget contract, and `example/src/components/ui/` to customize the host primitives. The Input's accent edge is an intentional host-local customization.

The Examples picker includes Product, External reference, Contact card, Money, and Contact scalars. For `contact.scalars`, select `email` or `phone` in Definition. Remote servers must allow browser access (CORS). The URL loader is playground code, not part of the renderer kit.

```sh
bun run check          # types, behavioral tests, package, registry, example build
npm pack               # builds and packs the support package
```

After installing the registry item into a consumer, use its **local** kit:

```tsx
import { createSurfaceUi } from "@rusl-labs/surface";
import { createShadcnKit } from "@/components/surface/kit";

const { Surface } = createSurfaceUi({
  schemaResolver,
  annotationResolver,
  validator,
  kit: createShadcnKit(),
});
```

Use the consuming application's actual alias instead of assuming `@/components`. The installation proof used `~/features/surface` for the kit and `~/design-system` for primitives.

**Not published:** neither the npm package nor a public registry endpoint has been released. The generated registry declares the intended npm dependency `@rusl-labs/surface-shadcn@0.1.0`; public installation requires publishing that package and serving the registry. For verification before publication, an isolated copy of the generated registry redirected only that dependency to the local `npm pack` tarball, then the standard shadcn CLI installed all wrappers and dependencies into a separate Vite app. No workspace aliases or source links supplied its runtime.

### Evidence and next increment

- 16 focused behavioral tests pass, including repeated/chained references, reference siblings, explicit-null preservation, and empty numeric/enum behavior.
- Package declarations/build, registry build, and the workspace production build pass. The initial slice was also installed and built in an independent consumer with nondefault component aliases.
- Browser interaction verified invalid-email rejection, valid nested edits, boolean `false`, enum values, textarea, array add/remove bounds, and Reset. A consumer-only Input edit changed every installed Surface text input from a 1px to a 5px accent edge.
- Desktop and mobile were visually inspected. The 390px viewport no longer overflows horizontally.
- All five supplied resource URLs were loaded, edited, and validated. US and Australian addresses were saved inside `contact.card`; changing variant preserved the street and contact data, invalid postcodes blocked Save, and Reset cleared added addresses.
- A custom schema-definition renderer registered for a named display view was reached through an object, an array, and an `allOf`/`oneOf` composition. A string override was also reached through the `input` alias. These checks exercised core dispatch rather than a kit-side substitute.

Specialized phone/money controls, tables, accordion/tabs, full default-kit option compatibility, and the documented core annotation propagation gaps remain the next increments. Keep those additions independently demonstrable.

## Non-negotiables

- **Use the app's local shadcn components.** Our installed wrappers import the app's configured component paths. Do not bundle a private, competing copy of shadcn primitives.
- **Dependencies are welcome.** The HTML kit already uses `libphonenumber-js` and `currency.js`. Use them and other specialist libraries where they provide useful behavior. Dependency size informs packaging; it does not prohibit a feature.
- **Compose freely.** A useful Surface component may combine several shadcn components, semantic HTML, and behavioral libraries. There need not be a one-to-one mapping.
- **Keep Surface semantics.** Reuse the engine's schema resolution, data channel, validity, child surfaces, and annotation helpers. Do not create a second schema walker or form-state system.
- **Render the current node, not an anticipated tree.** `Surface` owns schema/definition resolution, annotations, mode/view dispatch, and aliases. Object renderers consume the child props from `helpers.fields()`; arrays and compositions mount child `Surface` instances. No speculative child-schema preloading for rendering decisions, ancestor scans, sibling ownership maps, or duplicate schema engine. Resolving a referenced variant's title is a small metadata lookup, not permission to inspect its structure.
- **Keep structural code small.** `allOf`, unions, objects, and arrays may manage their own immediate structure or local UI choice. Other adapters primarily map the resolved node to local controls. Prefer aliases when controls are the same; use specialized components when behavior genuinely differs (email, phone, money).
- **Input and display both matter.** A schema has editable and readable presentations. Some widgets intentionally support only one mode; document that rather than inventing a meaningless counterpart.
- **Honor the host.** Use its theme tokens, compatible component APIs, aliases, and icon conventions. Installation and updates must not silently overwrite customized primitives or replace its design-system setup.
- **Preserve meaning across composition.** A money value remains money inside a table cell; a phone field keeps its behavior inside an accordion. Layout must not flatten child values into generic strings.
- **Start small without designing small.** Finish and exercise one useful slice at a time. The catalog below is a direction, not a requirement to build everything before anything works.

## Architecture and delivery

```text
Application schemas + annotations + data
                  |
        @rusl-labs/surface
        schema / data / validity / resolution
                  |
        Surface shadcn wrappers + kit assembly
           |                         |
  App-local shadcn components   Behavioral dependencies
           |                   phone / money / tables / dates
       App theme
```

Use the standard shadcn registry and CLI to install editable wrappers, supporting source, and kit assembly. Registry items declare both npm dependencies (installed into the consumer app) and other registry items (installed as local source). Surface and the chosen validator remain ordinary package dependencies; AJV is the existing recommended adapter, not a new kit requirement.

The npm package identity is **`@rusl-labs/surface-shadcn`**, separate from the registry address. Its intended role is shared nonvisual kit behavior and integration contracts; the registry-installed UI wrappers consume it alongside the app's local shadcn components. Dependencies used by package code belong in its package manifest; dependencies imported directly by installed wrappers belong in the registry item's consumer dependencies. Local UI ownership does not require copying every algorithm. Establish the exact helper boundary from the default-kit code, without inventing abstractions just to fill the package. Do not build a custom installer.

Aim for one straightforward kit installation. Add separately installable capability groups when there is a real reason, while retaining a convenient complete-kit entry. Avoid turning every leaf renderer into a setup decision.

Registry terminology does not determine our architecture:

- Component, hook, and library items distribute the constituent source.
- A block distributes a useful composed component, potentially across multiple files.
- A base is an entire design-system setup. We are integrating with an existing shadcn setup, not replacing it.

Copied wrappers are application-owned and do not update through an npm upgrade alone. Declare compatibility with Surface versions and the supported shadcn base/style. Provide reviewable source updates; never treat overwrite as the normal upgrade policy. Prove aliases and dependency resolution in a consumer app rather than assuming the CLI handles every import.

## Comparison: existing kit to useful shadcn capabilities

Existing behavior below refers to the current `surface-html` implementation and its `surface.default-kit` vocabulary. Candidate presentations are proposals, not existing implementations or promises that every listed component installs identically across bases.

### Everyday behavior: get a small surface working first

| Capability | Existing baseline | Useful shadcn composition | Why it belongs |
| --- | --- | --- | --- |
| Field presentation | Labels, descriptions, required/read-only state, path-local errors, inherited label visibility | Field, FieldLabel, FieldDescription, FieldError | One accessible field contract reused by all controls |
| Text | String renderer and typed `input` widget | Input; Textarea for an explicit multiline presentation | Most common data-entry path |
| Numbers / integers | Numeric input and display | Input; Input Group when units/adornments are meaningful | Keep numeric values numeric without turning empty drafts into zero |
| Booleans | Checkbox input and readable display | Checkbox by default; Switch as an explicit alternative | Standard binary choices without forcing one visual treatment |
| Enum / const | Enum selection; read-only fixed values | Native Select or Select initially; read-only text for const | Preserve the actual JSON value, not just its label/string encoding |
| Object | Annotated fields, sections, optional-property operations | FieldGroup, FieldSet, FieldLegend, section chrome, Buttons | Nested forms and displays without manual per-schema components |
| Array | Repeated child surfaces with add/remove behavior | Repeated fields/items, Buttons, Empty state | Useful collections before table or drag-and-drop complexity |
| Form shell | Save/reset, defaults/const application, validation before submit | Buttons and Alert/field errors | A complete edit-and-save interaction, not a visual-only demo |
| Schema composition | allOf, oneOf, anyOf handling | Existing Surface branch logic plus selection/grouping controls | Complete baseline coverage as the kit grows; no new union semantics |

### Semantic widgets: preserve the default kit's strengths

| Capability | Existing baseline | Useful shadcn composition / dependencies | Direction |
| --- | --- | --- | --- |
| Email | Email input and `mailto:` display | Input or Input Group; semantic link; optional copy action | Early; recognize format/widget rather than field-name guesses |
| Telephone | Country-aware draft, E.164 handling, formatted `tel:` display | Input Group + country selector; `libphonenumber-js` | Early; carry over behavior, not just `type="tel"` |
| Money schema | Amount/currency editor and formatted display; schema-identity registration; `currency.js` | Amount Input Group + currency selector; keep money arithmetic | Early; preserve minor-unit representation and currency constraints |
| URI / link | URL entry and link/media-related presentation options | Input, semantic anchor, optional Item composition | Preserve link meaning and existing annotation expressions |
| Copy | Read-only value with clipboard action | Input Group or value + Button | Useful for identifiers, codes, addresses, and tokens; do not expose secrets by inference |
| Date / date-time | Native controls, date-time wire conversion, formatted display | Native Input first; Calendar + Popover + time control when justified | Upgrade presentation without changing calendar-date/time-zone semantics |
| Media | URL editing for strings; URL/alt editing for objects; array preview rather than an uploader | Local Inputs plus native image/audio/video inside suitable Aspect Ratio/Card composition | Preserve useful options; upload transport/storage and media-array editing are separate capabilities |
| Searchable choices | Enum baseline; dedicated country/currency selection behavior | Combobox, with the selected base's supported composition | Useful for long lists; preserve value identity and keyboard interaction |
| Compact choices | Enum/boolean baseline | Radio Group, Toggle Group, Switch | Explicit alternatives, not arbitrary automatic replacements |
| Status / category | Plain scalar/enum display | Badge with explicitly mapped variants and labels | A small, useful display widget; do not infer status meaning from every enum |

Telephone and money are built-in capabilities we intend to support, not features excluded because they need dependencies. The same pattern can support additional well-known schemas once their canonical contracts and real use cases are identified. Money is already a concrete starting point; speculative address/person/product abstractions are not prerequisites.

### Structured presentation: useful components in their own right

| Capability | Existing baseline | Useful composition | Contract fit / priority |
| --- | --- | --- | --- |
| Description list | Object `props` display already uses dl/dt/dd and annotated field ordering | Preserve semantic dl/dt/dd with host theme tokens | Early port, not a new schema concept. No dedicated description-list component appears in the inspected shadcn catalog |
| Table | Display-only object-array table, annotated columns, view-only sorting | Local Table primitives; cells render child surfaces | Early structured widget; preserve the existing `table` contract |
| Card | Object presentation and named views; existing block/banner chrome | Full Card composition around annotated content | Early structured view; keep node rendering distinct from per-section decoration |
| Item list | Generic array/object rendering | ItemGroup, Item, ItemMedia, ItemContent, ItemActions | Compact records and collections without forcing a table |
| Accordion | Sections and nested object/array nodes, not an existing accordion treatment | Accordion headers + nested surfaces/annotated sections | Next structural step; distinguish node widget from section-layout support |
| Tabs | Sections and nested nodes, not an existing tab treatment | TabsList/Triggers + panels of annotated content | Follow accordion once grouping, state, and hidden-error handling are proven |
| Collapsible | Nested content and section chrome | Collapsible trigger + child content | Reuse disclosure behavior where one expandable region is clearer than an accordion |
| Data table | Basic table, not a generalized data-grid integration | Table + TanStack Table + filter/pagination/visibility controls | Later enhancement driven by real collection needs; shadcn provides a composition guide, not one installable data-table primitive |
| Edit dialog / sheet | Input/display modes and root submit behavior | Dialog or Sheet around a child surface and explicit edit actions | Later workflow composition; define draft/save/cancel ownership before implementing |

These are not independent islands. A useful proving example is an invoice table whose money cells use the money renderer, alongside a detail description list and an editable contact section. No cell should reimplement telephone, money, or schema-reference handling.

### Later exploration, not first-slice requirements

| Candidate | Useful when | Conditions before building |
| --- | --- | --- |
| Progress | A value explicitly represents completion or a bounded measure | Define min/max, units, indeterminate state, and accessible text; do not turn arbitrary numbers into percentages |
| Slider | A bounded numeric value is easier to adjust than type | Explicit bounds/step, keyboard access, and precise value entry where needed |
| Avatar / identity composition | A known schema or annotation identifies image, name, and secondary content | Explicit mappings and a meaningful fallback; no property-name heuristics |
| Chart | A real dataset has defined series, axes, labels, and units | Define those semantics and composition needs first; charting dependencies are allowed |
| Multi-step editing | A real form benefits from staged completion | Draft preservation, validation scope, navigation, and final submission must be explicit |

Skeleton, Spinner, Tooltip, Separator, and similar pieces can support a composition without each becoming a widget. Navigation menus, sidebars, carousels, and the rest of the catalog are not obligations. Add them when they solve a Surface use case, not to mirror the catalog mechanically.

## Two extension axes, not one widget bag

**Node renderers** own the presentation of a schema value: money, telephone, an enum as a combobox, or an array as a table. Existing registration resolves schema identity, widget kind/name, format, and type; mode and view participate in matching.

**Structural chrome** organizes the children returned by annotation helpers: sections, headings, cards, description-list pairs, accordion panels, and tabs. It must consume the same annotated field tree instead of independently reconstructing schema order, visibility, or references.

Some components can serve either axis. An accordion renderer selected on a nested object field is different from an annotation asking an entire root view to arrange its sections as accordion panels.

Current gaps to resolve when the relevant slice begins:

- A bound field can select a node widget today. The view contract does not have a root-view widget selection property. Root renderers can still be selected through kit registrations and named views; do not confuse that with an existing annotation selector.
- The vendored annotation schema permits a widget on a section entry, but the section `FieldChild` output does not preserve it. Threading that treatment through the helper/chrome boundary needs core work; it is not solved by registering another leaf renderer.
- Section/block/banner/span children have defined helper shapes. Inspect each propagation path before extending it. Do not silently add new layout strings or an unvalidated second annotation format.
- Schema identity currently outranks widget keys. Well-known-schema renderers must respect that precedence; an annotation widget does not automatically override money or another identity-specific renderer.
- Inline array-item annotations expose another schema/runtime gap: the canonical contract allows item fields/view/widget metadata, but the current array path does not carry it through. Scalar-array display also bypasses child renderers. Treat semantic item composition as work to prove, not inherited support.
- Existing table cells recurse through Surface, but do not carry all use-site row-field annotation context. Prove item references, cell annotations, and original data paths before calling table composition annotation-complete.

Reuse existing default-kit names and kind URIs where the contract really matches. New shadcn-specific presentations need explicit, resolved widget contracts before implementation. Keep annotation options about presentation intent rather than exposing arbitrary React props. No new schema shapes are finalized in this document.

### Preserve semantics, not implementation accidents

The comparison is source-inspected, not a runtime audit. Before reusing each relevant path, exercise these boundaries:

- Telephone normalization commits valid numbers as E.164; invalid text remains available for error feedback. Money keeps minor units and currency-specific precision; switching currency is not foreign-exchange conversion.
- Phone/money local drafts must respond correctly to Reset and external data changes. An invalid visible draft must not silently submit an older valid value. Existing synchronization and local-error handling need investigation here.
- Date-only values must not shift calendar day with the viewer's timezone. Date-time precision and conversion must be deliberate.
- Media documentation says file input, but the source edits URLs/alt text and previews arrays. Plan from the implementation rather than promising an existing upload flow.

These are focused checks for the slice that touches them, not a prerequisite project-wide rewrite. Most nonvisual helpers are currently internal; reuse may require a targeted extraction rather than an existing public import.

## Work in small, demonstrable slices

### Now: one installed, editable and readable contact surface

Build the registry-to-consumer path and the smallest useful kit together:

- Local field chrome, object/section layout, string/email, boolean, one enum control, and a simple nested object and scalar array.
- Data changes, add/remove, path-local errors, and Save/Reset through Surface's existing behavior.
- Input and display of the same contact data, plus one annotation that changes ordering/grouping.
- A host-local Input/Field customization visibly reflected by Surface.

**Exit:** install into a clean shadcn app, edit the contact, see invalid input block submission, save valid data, and inspect its display. Demonstrate local component ownership and a nondefault alias configuration. Record the exact supported React/Tailwind/shadcn base and Surface versions. This is an internal working slice, not a claim of complete default-kit parity.

### Next: semantic usefulness and baseline completeness

Carry over telephone and money behavior, numeric/const/composition coverage, the remaining existing semantic widgets, and the root/annotation edge cases. Add the simple description-list and table presentations as small, separate increments. Reassess ordering after each working example; do not postpone phone/money until every possible layout exists.

**Exit:** a contact plus an invoice/line-items example proves phone normalization, money round-tripping, nested validation, and consistent semantic rendering in fields and table cells. The documented baseline coverage matrix has no silent omissions.

### Then: richer organization

Resolve the structural annotation propagation gaps and add accordion, tabs, cards/items, and searchable choices incrementally. These may move earlier if a real consuming application needs them.

**Exit:** rearranging annotated content changes presentation without changing data paths or losing drafts. Invalid content in an inactive panel remains discoverable and reachable by keyboard. Tables preserve source data order when only display sorting changes.

### Later: evidence-led expansion

Choose progress, sliders, data-table interaction, edit overlays, or other compositions from actual usage. Revisit this list after each slice; it is neither a release promise nor a reason to stop exploring useful components.

## Definition of useful and done

A candidate earns implementation when we can name its data shape, user benefit, input/display behavior, and selection mechanism. For each accepted capability, record a short contract: schema compatibility, annotation/registration route, dependencies, accessibility, wire-value preservation, empty/error states, and one convincing example.

A completed capability must work in the installed consumer, not just in this repository's showcase:

- Uses compatible host-local primitives and theme tokens; imports resolve under supported aliases.
- Honors annotation field order/visibility, nested paths, references, labels, and overrides where applicable.
- Preserves wire values and local drafts correctly; layout state is not written into schema data.
- Exposes errors accessibly, including inside collapsed or inactive regions.
- Keeps useful semantic children when composed into tables, cards, or lists.
- States unsupported shapes/modes honestly; no silent data coercion or new fake fallback behavior.
- Has a browser-verified example and focused regression coverage for plausible behavioral failures, not just rendered markup or forwarding tests.

Use the existing default kit as the behavioral reference, not a requirement to reproduce bugs. Investigate discrepancies explicitly. Reuse existing nonvisual logic where possible; extract it only when the comparison demonstrates an actual shared boundary. Do not pre-build a universal renderer framework.

## Decisions to settle just before they matter

- Additional shadcn bases/styles and version ranges beyond the verified Base UI/Nova target.
- Capability grouping as the catalog grows; the first npm/source boundary and one-entry registry installation are implemented.
- The smallest core change for section treatment propagation and root-view presentation selection, when structural annotation work starts.
- New widget option contracts, after checking existing Surface/Rusl vocabulary. No parallel money/phone domain schemas.
- Public registry hosting and update/versioning workflow before external distribution.

Only the implementation status above claims completed support. The rest of this document remains the north star, not a claim of a complete kit or a public release.

## Evidence and reference points

Baseline inspected in the local Surface checkout on 2026-09-07. Source paths below are relative to the [Surface repository](https://github.com/rusl-labs/surface), not this repository, so the references remain usable outside the umbrella checkout. Shadcn sources were reviewed on the same date and should be rechecked before implementation.

- HTML kit assembly: `packages/html/src/index.tsx`; default-kit IDs and aliases: `packages/html/src/default-kit.ts`; dependencies: `packages/html/package.json`.
- Behavior overview: `packages/html/README.md`; kit authoring and recursion: `docs/guides/building-kits.md`; annotation semantics: `docs/annotation.md`.
- Core types: `packages/core/src/types.ts`; field-list helpers: `packages/core/src/helpers-list.ts`; annotation schema: `schemas/rusl/surface.annotation.schema.json`.
- Semantic and root implementations: `packages/html/src/fields/tel.tsx`, `money.tsx`, `table.tsx`, and `root.tsx`.
- [shadcn component catalog](https://ui.shadcn.com/docs/components), [registry setup](https://ui.shadcn.com/docs/registry/getting-started), [registry item types, files, and dependencies](https://ui.shadcn.com/docs/registry/registry-item-json).
- [Field](https://ui.shadcn.com/docs/components/base/field), [Input Group](https://ui.shadcn.com/docs/components/base/input-group), [Combobox](https://ui.shadcn.com/docs/components/base/combobox), [Calendar](https://ui.shadcn.com/docs/components/base/calendar).
- [Accordion](https://ui.shadcn.com/docs/components/base/accordion), [Tabs](https://ui.shadcn.com/docs/components/base/tabs), [Item](https://ui.shadcn.com/docs/components/base/item), [Table](https://ui.shadcn.com/docs/components/base/table), [Data Table](https://ui.shadcn.com/docs/components/data-table).
- [Progress](https://ui.shadcn.com/docs/components/base/progress), [Slider](https://ui.shadcn.com/docs/components/base/slider).
