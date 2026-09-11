# Surface shadcn: north star

Status: working kit, URL playground, and node-local composition mappings implemented and browser-verified; the broader catalog remains a revisable roadmap. Updated 2026-09-08.

## The product

**`@rusl-labs/surface-shadcn` turns schemas, annotations, and data into useful input and display surfaces built from the consuming application's own shadcn components.**

Start with a small, working kit. Grow into a rich vocabulary of field widgets, structured layouts, and well-known schema renderers. Simple controls are the defaults, not the ceiling. A table, accordion, description list, or money editor is a first-class kit capability, not merely a demo block.

Success looks like this: an application installs the kit, connects its existing Surface schema resolver and validator, and gets useful UI without writing per-schema components. Annotations and registrations progressively customize it. Editing the application's local Input, Field, Card, or Table changes the corresponding Surface presentation too.

This document sets direction and a revisable order of work. It deliberately does not freeze widget option schemas, registry addresses, package boundaries, or release dates.

Near-term order: prove the mechanics, establish sensible layout defaults and annotation overrides, then evaluate and expand the component catalog. Aesthetic styling is a separate pass; new components must not become workarounds for unresolved core behavior.

## Getting started: the target contract

The opening chapter of `example/public/how-it-works.html` is README-driven design, not a description of today's manual setup. The target for an existing shadcn React app is **one block install, one local Surface import, and a schema**.

One standard `shadcn add` operation must install:

1. Required underlying shadcn primitives, respecting existing local customizations.
2. Our editable kit components, including object, array, and composition renderers.
3. Ready schema and annotation resolvers, with AJV connected and an explicit place to seed local documents.
4. The complete renderer mapping and a generated entry point exporting an already-configured `Surface`.

The consumer must not write `createSurfaceUi`, assemble default registrations, add a provider, or configure resolvers to render the first public schema URL. The generated entry point performs that wiring once. Annotations are optional for the first form; the application owns persistence and any private-source authentication policy. Installation must honor the app's configured paths and imports. Missing schemas and validation failures must produce visible errors, not empty success states.

The guide proposes `https://ui.rusl.com/r/surface.json` and an import from `@/components/surface` (rewritten for the host's paths). **The public address is not published.** The registry now includes the generated entry point and resolvers; the local Next consumer below exercises that installation without publication.

## Current implementation

The **Now** slice below is implemented, not the full catalog:

- `src/` is the npm support package: inherited field metadata, accessible field state, optional application defaults, canonical phone/money helpers, bundled schema documents, const/default preparation, and asynchronous Save/Reset behavior.
- `registry/surface/` contains 19 locally installed source files, including the configured `Surface` export, resolver defaults, mapping, and renderers. The installed `components/surface` entry point is ready to import. `createShadcnKit()` remains available from the local `components/surface/kit` for custom assembly. Input/display support covers objects, arrays, strings/email/phone, money, textarea, booleans, enum values, numbers/integers, const values, and composition nodes. Image media adds display-only default/card views.
- `registry.json` builds the standard `surface` block into `public/r/surface.json`. It installs Surface, the support package, and the AJV adapter as npm dependencies. Wrappers import local shadcn primitives; the npm package contains no shadcn UI copy.
- `example/` is a Vite schema workspace. Paste an HTTP(S) schema URL or select an example, then edit and display its data. Definition libraries expose a picker, and direct JSON Pointer URLs such as `#/$defs/email` work. Failed loads keep the current editor; switching schemas starts a separate draft and saved state. The built-in annotated contact demo remains available.
- View choices combine applicable registered views with the active annotation scope's named views; names are deduplicated and fewer than two choices hides the selector. **Show annotation** reveals the selected annotation, and **Edit annotations** applies JSON changes. Input/display share data, not a fixed list of view names.
- `example/public/how-it-works.html` opens with the target getting-started contract, followed by interactive node-local rendering and edit/save traces. Proposed installation and generated files are explicitly distinguished from current runtime behavior; the linked playground runs the actual Surface runtime.
- `rusl.bundle.toml` installs `surface.annotation`, `surface.default-kit`, `pragmatic/contact.scalars`, and `pragmatic/money` (with its currency-code dependency). `rusl/schemas/surface.shadcn` is installed with `dev = true`; it supplies textarea, telephone display formatting, money currency allowlists, and image dimensions.
- Composition renderers mount child `Surface` instances with the current mode/view. Core handles references, definition identities, annotation overrides, renderer lookup, and data paths. Variant changes keep the shared value; mounted fields apply their own declared constants/defaults.
- Variant labels use the referenced schema's `title` through the configured resolver, falling back to the existing inline/reference/option label. This metadata lookup does not plan the child renderer or scan its fields.
- Shared controls use core aliases (`input` → `string`, `integer` → `number`, `anyOf` → `oneOf`, canonical phone → `tel`, canonical money → `money`). Money's display registration has no view restriction, so identity/card/row use the same component. Aliases are lookup keys, not view aliases. `createShadcnKit({ aliases, resolvers })` forwards extensions to core; host aliases replace defaults and host registrations are appended last.

### Widget vocabulary

One schema: `schemas/rusl/surface.shadcn.schema.json`. Select with `widget: { name }` on a bound field, array, or object/section. Views still have no widget slot. Local Nova/Tailwind primitives only.

| Widget | Attachment | Primitive |
|---|---|---|
| textarea, tel, money, media | field / image record | existing |
| date, datetime | field | Calendar + Popover |
| combobox, radio-group, toggle-group | field (enum) | Combobox, RadioGroup, ToggleGroup |
| table, list, carousel | array | Table, list rows, Carousel. `add` / `remove` appearance: `label` (default), `icon`, `both`, or `tooltip` (icon + tooltip). `addLabel` still supplies the add text. |
| accordion, collapsible | object | Accordion, Collapsible |
| tooltip | field chrome | Tooltip (does not replace the control) |
| separator | section chrome | Separator |

Not widgets: dd/dt (`layout: "props"`), input-group (phone/money composition). Default-kit `$kind` URIs still resolve for date/datetime/table/media/tel. Contact demo uses toggle-group on relationship and list on tags; product card images use carousel + media.


### Product image media

Product `images.items` is an inline `{ url, alt? }` object, not a shared image-schema reference. The default, detailed, and card product annotations now render each item's image in display mode; input still edits URL and alt normally. Inside a view's `fields`:

```json
{
  "name": "images",
  "items": {
    "display": {
      "view": "card",
      "widget": {
        "name": "media",
        "src": { "path": "url" },
        "alt": { "path": "alt" },
        "width": 640,
        "height": 480,
        "fit": "contain"
      }
    }
  }
}
```

`media` has registered display `default` and `card` views; the latter uses the app's local shadcn Card. `src`/`alt` reuse default-kit path/template/literal bindings. Width/height accept positive integer pixels or a binding such as `{ "path": "dimensions.width" }`. They become real HTML attributes; together they reserve the declared aspect ratio, while the image can shrink to fit its container. Top-level widget options override nested `options`; absent dimensions can come from the item's width/height, and unknown dimensions are not fabricated. Product's sample dimensions are presentation settings, not new product data properties.

This renderer handles one image URL or image record per Surface, not video/audio, galleries, or uploads. Arrays keep their ordinary child Surface traversal. Browser proof at `localhost:3100` loaded a 640×480 product photo with matching HTML width/height and responsive 4:3 rendering.

### Surface runtime identity

Published `@rusl-labs/surface` is still **0.1.0**. The mechanics this playground needs (`getViews`, inline `items` annotation scope) live on local core **0.1.1** (`../schema-driven-ui`, branch `feat/item-views-and-submit-mechanics`). This workspace pins that directory with `file:` plus `overrides`, so root tests, the example package, and the Vite alias resolve one realpath. `bun run check` starts with `check:runtime`; `src/runtime-identity.test.ts` asserts the same identity and that `createRegistryKit().getViews` exists. A clean `bun install` in this umbrella keeps that pin. npm publish of 0.1.1 is blocked here (`npm whoami` → 401). The registry block still names published `0.1.0` for external consumers until that release exists.

Verified target: React 19.2, Surface/AJV adapter 0.1.0, Tailwind 4.3, shadcn CLI 4.21, Base UI 1.8 / Nova. Other bases and versions are not yet claimed. The current CLI uses `--preset nova --base base`; it records `base-nova` in `components.json`.

### Phone, money, and application defaults

Defaults are optional; the generated entry point works without a provider:

```tsx
import { Surface, SurfaceProvider } from "@/components/surface";

<SurfaceProvider locale="en-AU" defaultCountry="AU" defaultCurrency="AUD">
  <Surface id={schemaUrl} mode="input" />
</SurfaceProvider>;
```

Nested providers inherit omitted settings. Explicit locale makes server/client formatting deterministic; otherwise browser locale is a formatting hint, not an inferred currency.

- **Phone:** existing international data wins over the field's `tel` widget `defaultCountry`, then provider country, then an explicit region in the locale. A bare language such as `en` does not invent a country. The existing default-kit widget vocabulary supplies `name: "tel"`, `defaultCountry`, `countries`, `showCountry`, placeholder, and autocomplete. The host's standard shadcn `Combobox` searches countries by name, ISO code, or calling code. National/international drafts normalize through `libphonenumber-js` to possible E.164 numbers; extensions are rejected rather than silently discarded. Display accepts `format: "national" | "international" | "e164"` on the widget or inside `widget.options`; top-level wins. International is the default; national uses the number's country, not the browser locale. Storage and `tel:` links stay E.164.
- **Money:** schema `currency.const` fixes the currency; otherwise existing data, schema default, then provider default initialize an editable Combobox. Readonly constraints disable editing. Search uses currency code and localized name. Changing currency preserves the human major-unit amount, not its old minor-unit integer: no FX conversion. Unsupported precision keeps the pending currency visible and blocks Save until corrected. Input is in major units; storage remains integer minor units (`USD 34.23` → `3423`, `JPY 34` → `34`). Exact string/BigInt conversion accepts insignificant trailing zeros but rejects nonzero excess precision, malformed grouping, and unsafe integers. Intl supplies formatting and decimal currency precision; MGA/MRU use fifths. Codes with ISO minor unit N.A. (for example XAU) are not interpreted as hundredths and are excluded from the picker.
- **Editing:** controls keep transient text locally; Surface owns canonical values. The form scope stores only mounted parse-issue readers and a Reset generation—not another data model. Invalid drafts block Save even when canonical data is still valid. Reset clears drafts even when the canonical value has not changed; genuine external changes synchronize controls, while their own writes preserve the caret.
- **Offline references:** the generated schema resolver starts with `shadcnSchemas` (contact scalars, money, currency codes). Supported canonical references retain their real URIs and do not need runtime network requests.
- **Host ownership:** country/currency pickers compose the app-local shadcn `Combobox`, with its popup search input, list, and empty state. Enum, variant, and playground choices use the app-local `Select` composition. No NativeSelect substitute, custom filtering engine, or private UI primitive.

Phone presentation belongs to the field's display annotation, not the data schema:

```json
{
  "name": "phone",
  "display": {
    "widget": {
      "$kind": "https://resources.rusl.com/resources/rusl/schemas/surface.default-kit#/$defs/tel",
      "name": "tel",
      "options": { "format": "national" }
    }
  }
}
```

Use `international` for `+1 415 555 0100`, `national` for `(415) 555-0100`, or `e164` for `+14155550100`. The built-in contact annotation demonstrates national display without changing the input's behavior. Arbitrary formatting masks are not supported.

### Work locally

```sh
bun install
rusl install
bun run dev
```

The example runs at `http://localhost:3100`. Open **How it works** in its header or visit `http://localhost:3100/how-it-works.html`. **Edit schema JSON** and **Edit annotations** support in-browser experimentation; edits are session-local. Edit `example/src/contact.annotation.json` or `example/src/annotations/` to persist sample presentation, `schemas/rusl/surface.shadcn.schema.json` to develop the widget contract, and `example/src/components/ui/` to customize host primitives.

The Examples picker includes Product, External reference, Contact card, Money, and Contact scalars. For `contact.scalars`, select `email` or `phone` in Definition. Remote servers must allow browser access (CORS). The URL loader is playground code, not part of the renderer kit.

The supplied annotation views include Compact, Detailed, Identity, Row, and Card; custom names also work. `example/src/view-annotations.ts` seeds nine sample documents, including referenced postal addresses. An arbitrary schema can gain choices through its annotations or applicable renderer registrations. A view-agnostic fallback does not invent names.

```sh
bun run check          # runtime identity, types, tests, package, registry, example build
npm pack               # builds and packs the support package
```

After installing the block, import its generated **local** Surface:

```tsx
import { Surface } from "@/components/surface";

<Surface
  id={schemaId}
  mode="input"
  onSubmit={({ data }) => console.log(data)}
/>;
```

Use the consuming application's actual alias instead of assuming `@/components`. The installation proof used `~/features/surface` for the kit and `~/design-system` for primitives.

**Not published:** neither the npm package nor a public registry endpoint has been released. The generated registry declares the intended npm dependency `@rusl-labs/surface-shadcn@0.1.0`; public installation requires publishing that package and serving the registry. For verification before publication, an isolated copy of the generated registry redirected only that dependency to the local `npm pack` tarball, then the standard shadcn CLI installed all wrappers and dependencies into a separate Vite app. No workspace aliases or source links supplied its runtime.

### A clean Next.js consumer

```sh
bun run test:next        # build, pack, scaffold, shadcn install, next build
bun run test:next:clean  # remove only this checkout's owned sandbox
```

`scripts/test-next.ts` uses a single fixed directory per checkout under `~/.cache/surface-shadcn/<checkout-hash>/`, outside this workspace. It pins create-next-app 16.3.4 and shadcn 4.21.0, initializes Base UI/Nova, and installs the actual generated registry through `shadcn add`. Only the unpublished support-package dependency in the local registry copy is redirected to a local tarball. No registry server, workspace links, git initialization, or manual Surface wiring is involved.

The script adds a consumer page using the existing contact object schema, then runs the Next production build. It prints the command for starting the app. The page includes phone/money, object/array renderers, email, a boolean, and nested location fields. Sample and locale selectors demonstrate US/USD and Japanese values overriding AU/AUD defaults, plus creating values from those defaults. Dependencies require internet during installation; supported canonical schemas are bundled for offline rendering and validation. Stop the server before cleaning.

Setup refuses an existing sandbox instead of overwriting it. Clean removes the app, node_modules, build output, tarball, and local registry copy only when the ownership marker matches this checkout. Missing sandboxes are a no-op; unowned directories and symlinks are refused. Failed setup leaves its owned sandbox available for inspection and explicit cleanup.

### Evidence and next increment

- 41 focused behavioral tests pass, including reference traversal, explicit-null preservation, phone normalization/default precedence, exact currency precision and zero-padding transitions, localized digits/grouping, malformed canonical amount rejection, and safe-integer boundaries.
- Package declarations/build, registry build, and the workspace production build pass. The initial slice was also installed and built in an independent consumer with nondefault component aliases.
- Browser interaction verified invalid-email rejection, valid nested edits, boolean `false`, enum values, textarea, array add/remove bounds, and Reset. A consumer-only Input edit changed every installed Surface text input from a 1px to a 5px accent edge.
- The installed Next consumer exercised styled selects, US/GB/AU phone normalization, USD/JPY amounts, German formatting, invalid-draft Save gating, same-value Reset, external-value synchronization, and caret preservation. Disposable consumer probes also verified field GB over provider AU, schema EUR over provider USD, currency selection, typed boolean/null/object enums, and variant changes preserving shared data. Host mapping additions, aliases, and view-specific/direct overrides passed a separate runtime smoke script.
- Searchable country/currency Comboboxes were installed by the real shadcn CLI in a fresh Next consumer. Browser checks covered name/code/calling-code search, keyboard country selection, USD → EUR → JPY editing, invalid-precision Save gating, and Reset. Annotation probes verified all three phone formats, top-level format precedence, unchanged E.164 links, and fixed/readonly currency constraints.
- Desktop and mobile were visually inspected. The 390px viewport no longer overflows horizontally.
- All five supplied resource URLs were loaded, edited, and validated. US and Australian addresses were saved inside `contact.card`; changing variant preserved the street and contact data, invalid postcodes blocked Save, and Reset cleared added addresses.
- A custom schema-definition renderer registered for a named display view was reached through an object, an array, and an `allOf`/`oneOf` composition. A string override was also reached through the `input` alias. These checks exercised core dispatch rather than a kit-side substitute.
- All nine sample annotation documents validate against the installed annotation schema: thirteen root/definition scopes, six named views each. Browser checks exercised every scope across input and display views, preserved saved payloads, and checked visible fields and values.
- The interactive guide's three chapters, aliases, dispatch overrides, and edit/save traces were exercised in the browser. Its standalone file loads with no external resource requests.

Tables, accordion/tabs, full default-kit option compatibility, and the documented core annotation propagation gaps remain the next increments. Keep those additions independently demonstrable.

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

| Capability         | Existing baseline                                                                             | Useful shadcn composition                                      | Why it belongs                                                      |
| ------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Field presentation | Labels, descriptions, required/read-only state, path-local errors, inherited label visibility | Field, FieldLabel, FieldDescription, FieldError                | One accessible field contract reused by all controls                |
| Text               | String renderer and typed `input` widget                                                      | Input; Textarea for an explicit multiline presentation         | Most common data-entry path                                         |
| Numbers / integers | Numeric input and display                                                                     | Input; Input Group when units/adornments are meaningful        | Keep numeric values numeric without turning empty drafts into zero  |
| Booleans           | Checkbox input and readable display                                                           | Checkbox by default; Switch as an explicit alternative         | Standard binary choices without forcing one visual treatment        |
| Enum / const       | Enum selection; read-only fixed values                                                        | Host styled Select; read-only text for const                   | Preserve the actual JSON value, not just its label/string encoding  |
| Object             | Annotated fields, sections, optional-property operations                                      | FieldGroup, FieldSet, FieldLegend, section chrome, Buttons     | Nested forms and displays without manual per-schema components      |
| Array              | Repeated child surfaces with add/remove behavior                                              | Repeated fields/items, Buttons, Empty state                    | Useful collections before table or drag-and-drop complexity         |
| Form shell         | Save/reset, defaults/const application, validation before submit                              | Buttons and Alert/field errors                                 | A complete edit-and-save interaction, not a visual-only demo        |
| Schema composition | allOf, oneOf, anyOf handling                                                                  | Existing Surface branch logic plus selection/grouping controls | Complete baseline coverage as the kit grows; no new union semantics |

### Semantic widgets: preserve the default kit's strengths

| Capability         | Existing baseline                                                                           | Useful shadcn composition / dependencies                                                 | Direction                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Email              | Email input and `mailto:` display                                                           | Input or Input Group; semantic link; optional copy action                                | Early; recognize format/widget rather than field-name guesses                                       |
| Telephone          | Country-aware draft, E.164 handling, annotation-formatted `tel:` display                    | Input Group + searchable Combobox; `libphonenumber-js`                                   | Implemented; named national/international/E.164 display formats                                     |
| Money schema       | Exact minor-unit editor and formatted display; schema-identity registration                 | Input Group + searchable Combobox; string/BigInt arithmetic and Intl                     | Implemented; defaults remain editable, constraints and exact amounts are preserved                  |
| URI / link         | URL entry and link/media-related presentation options                                       | Input, semantic anchor, optional Item composition                                        | Preserve link meaning and existing annotation expressions                                           |
| Copy               | Read-only value with clipboard action                                                       | Input Group or value + Button                                                            | Useful for identifiers, codes, addresses, and tokens; do not expose secrets by inference            |
| Date / date-time   | Native controls, date-time wire conversion, formatted display                               | Native Input first; Calendar + Popover + time control when justified                     | Upgrade presentation without changing calendar-date/time-zone semantics                             |
| Media              | URL editing for strings; URL/alt editing for objects; array preview rather than an uploader | Local Inputs plus native image/audio/video inside suitable Aspect Ratio/Card composition | Preserve useful options; upload transport/storage and media-array editing are separate capabilities |
| Searchable choices | Enum baseline; dedicated country/currency selection behavior                                | Combobox, with the selected base's supported composition                                 | Useful for long lists; preserve value identity and keyboard interaction                             |
| Compact choices    | Enum/boolean baseline                                                                       | Radio Group, Toggle Group, Switch                                                        | Explicit alternatives, not arbitrary automatic replacements                                         |
| Status / category  | Plain scalar/enum display                                                                   | Badge with explicitly mapped variants and labels                                         | A small, useful display widget; do not infer status meaning from every enum                         |

Telephone and money are implemented built-in capabilities. The same pattern can support additional well-known schemas once their canonical contracts and real use cases are identified; speculative address/person/product abstractions are not prerequisites.

### Structured presentation: useful components in their own right

| Capability          | Existing baseline                                                           | Useful composition                                               | Contract fit / priority                                                                                                          |
| ------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Description list    | Object `props` display already uses dl/dt/dd and annotated field ordering   | Preserve semantic dl/dt/dd with host theme tokens                | Early port, not a new schema concept. No dedicated description-list component appears in the inspected shadcn catalog            |
| Table               | Display-only object-array table, annotated columns, view-only sorting       | Local Table primitives; cells render child surfaces              | Early structured widget; preserve the existing `table` contract                                                                  |
| Card                | Object presentation and named views; existing block/banner chrome           | Full Card composition around annotated content                   | Early structured view; keep node rendering distinct from per-section decoration                                                  |
| Item list           | Generic array/object rendering                                              | ItemGroup, Item, ItemMedia, ItemContent, ItemActions             | Compact records and collections without forcing a table                                                                          |
| Accordion           | Sections and nested object/array nodes, not an existing accordion treatment | Accordion headers + nested surfaces/annotated sections           | Next structural step; distinguish node widget from section-layout support                                                        |
| Tabs                | Sections and nested nodes, not an existing tab treatment                    | TabsList/Triggers + panels of annotated content                  | Follow accordion once grouping, state, and hidden-error handling are proven                                                      |
| Collapsible         | Nested content and section chrome                                           | Collapsible trigger + child content                              | Reuse disclosure behavior where one expandable region is clearer than an accordion                                               |
| Data table          | Basic table, not a generalized data-grid integration                        | Table + TanStack Table + filter/pagination/visibility controls   | Later enhancement driven by real collection needs; shadcn provides a composition guide, not one installable data-table primitive |
| Edit dialog / sheet | Input/display modes and root submit behavior                                | Dialog or Sheet around a child surface and explicit edit actions | Later workflow composition; define draft/save/cancel ownership before implementing                                               |

These are not independent islands. A useful proving example is an invoice table whose money cells use the money renderer, alongside a detail description list and an editable contact section. No cell should reimplement telephone, money, or schema-reference handling.

### Later exploration, not first-slice requirements

| Candidate                     | Useful when                                                                | Conditions before building                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Progress                      | A value explicitly represents completion or a bounded measure              | Define min/max, units, indeterminate state, and accessible text; do not turn arbitrary numbers into percentages |
| Slider                        | A bounded numeric value is easier to adjust than type                      | Explicit bounds/step, keyboard access, and precise value entry where needed                                     |
| Avatar / identity composition | A known schema or annotation identifies image, name, and secondary content | Explicit mappings and a meaningful fallback; no property-name heuristics                                        |
| Chart                         | A real dataset has defined series, axes, labels, and units                 | Define those semantics and composition needs first; charting dependencies are allowed                           |
| Multi-step editing            | A real form benefits from staged completion                                | Draft preservation, validation scope, navigation, and final submission must be explicit                         |

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
- Array-item annotation propagation needs a runtime check: the canonical contract allows item fields/view/widget metadata. The shadcn array renderers already render both scalar and structured items through child Surfaces; verify that the intended item metadata reaches those children without wrapper-side schema resolution.
- For future tables, prove item references, cell annotations, and original data paths before calling table composition annotation-complete.

Reuse existing default-kit names and kind URIs where the contract really matches. New shadcn-specific presentations need explicit, resolved widget contracts before implementation. Keep annotation options about presentation intent rather than exposing arbitrary React props. No new schema shapes are finalized in this document.

### Preserve semantics, not implementation accidents

The comparison is source-inspected, not a runtime audit. Before reusing each relevant path, exercise these boundaries:

- Telephone normalization commits valid numbers as E.164; invalid text remains available for error feedback. Money keeps minor units and currency-specific precision; switching currency is not foreign-exchange conversion.
- Phone/money local drafts must respond correctly to Reset and external data changes. An invalid visible draft must not silently submit an older valid value. These boundaries are verified in this kit; do not assume the reference implementation shares that evidence.
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

### Next: mechanics and behavioral guarantees

Keep Surface as the only owner of schema/annotation resolution, renderer lookup, and canonical data paths. Package reusable nonvisual behavior; keep app-owned shadcn composition readable. Extract phone/money draft mechanics behind focused hooks where that makes correctness upgradeable, not through a new universal component framework.

Audit and exercise:

- Inline and referenced values, objects, arrays, and composition nodes; child annotation-selected views and inherited views must follow the same core path.
- Renderer/alias overrides, schema-identity precedence, root presentation selection, and section/array-item annotation propagation. Distinguish supported contracts from schema/runtime gaps; fix missing core propagation at the source.
- Missing, null, empty, zero, and false values; defaults versus constraints; readonly propagation; add/remove; and external data replacement.
- Intentional seeding is not presentation coercion: in input mode, mounted fields enforce a declared `const`, or apply a declared `default` only when the current value is `undefined`. Display mode never seeds values. Prove idempotence and the behavior across Reset, remounts, and variant changes; explicit null, empty, zero, and false values must not be replaced by defaults.
- Local invalid drafts, malformed canonical data, asynchronous validation/submission, Reset, and row removal while another row has an unsaved draft. No stale-value Save or draft transfer to an unrelated item.
- Accessible names, label ownership, help text, and errors as separate concerns. Removing duplicate labels must not accidentally suppress useful descriptions.
- Clean installation, app-local primitive customization, supported aliases/versions, and reviewable upgrades that do not silently overwrite user edits.

**Exit:** a clean installed consumer demonstrates the supported behavior end to end. Plausible regressions have focused behavioral coverage, especially where helper behavior and rendered Save gating interact. Known unsupported annotation paths are explicit rather than silently ignored. No new catalog component is needed to make the existing mechanisms correct.

#### Stage 1 audit record — 2026-09-09

Mechanics fixes span this kit and `../schema-driven-ui/packages/core`. No layout vocabulary or catalog component was added.

- **Core:** inline schemas establish their document/ref/annotation scope; inline composition branches retain annotation coordinates; inline array items enter the annotation's `items` scope; metadata-only view labels/descriptions work; child mode/view inheritance and explicit-entry decoration preserve the normal renderer path. A numeric data-path change no longer unloads a surviving array editor. Async submit promises and revalidation failures reach the caller/validity channel.
- **Kit:** array removal preserves surviving drafts; invalid numeric drafts cannot submit stale canonical data; Reset invalidates a union choice before its old const branch can write back; external phone/money replacement clears stale drafts. Async Save abandons stale preparation/validation results after edits or replacement, and Reset remains available while pending.
- **Value and field ownership:** defaults apply only to missing values; explicit null parents are not materialized by child defaults. Readonly structured fields cannot be removed. Labels, help text, and errors are independent; controls without a resolved label receive an accessible fallback name.
- **Proof:** 53 kit tests and 282 core-workspace tests pass with the coordinated local runtime. The 10 rendered mechanics regressions also pass against the registry-installed components and package tarballs. The Next.js 16.3.4 production build passes with React 19.2.8, Tailwind 4.3.3, shadcn 4.21.0 / Base UI 1.8.0 (Nova), and the nondefault `~/*` alias. Browser checks cover Save/Reset, malformed drafts, reference/annotation propagation, and preserved local Input customization.

**Release boundary:** local core is versioned **0.1.1** but is not on npm. This kit's workspace `file:` pin and identity check keep the playground and tests on that build. Distributing the kit still requires publishing 0.1.1 and replacing the `file:` pin. The rendered row-identity regression deliberately fails with published 0.1.0.

```sh
bun run test:next --core ../schema-driven-ui/packages/core --alias '~'
```

This uses a separate `-mechanics` sandbox and runs the rendered regressions against its installed files before the production build. Repeat the flags with `verify` to rerun that gate, or with `clean` to remove the sandbox. Do not replace an app's edited registry files blindly: inspect `shadcn add … --dry-run` / `--diff`, then merge or accept individual changes. npm upgrades update package behavior, not app-owned renderer source.

**Explicit limits, not silent promises:**

- Root chrome is selected by `kit.Root`; a view-level root `widget` is not an annotation-envelope contract.
- Section labels/descriptions/field grouping propagate, but schema-valid section `widget` treatments are not implemented. No accordion/tab renderer is implied.
- Inline `items.fields` is supported; `$ref` items use their referenced subject/`defs` annotations instead. Tuple arrays and arbitrary JSON Schema applicator combinations are not covered by this kit.
- Renderer precedence remains identity → widget → format → const/enum/type → combinator. A schema with both `type: object` and `allOf` selects the object renderer; this audit does not introduce schema-tree merging. Union selection uses reference/discriminator or literal-const matches, then a manual/default choice; it is not a general oneOf satisfiability solver.
- External record replacement must be immutable. Reset returns to the mounted root's initial record, not the last replacement or last successful Save. An already-started application submission cannot be undone by Reset; late completion must not restore stale state.

#### Playground controls and currency choices — 2026-09-09

`bun run dev` serves the full schema/annotation playground at **http://localhost:3100/**. The Next installation fixture is a separate acceptance app, not a replacement for this workspace.

- Load any HTTP(S) schema or paste/edit Schema JSON. The examples remain shortcuts, not restrictions.
- Edit Annotation JSON and apply it to both surfaces without replacing canonical data. Applied documents remain available when switching schemas or definitions during the session; invalid edits leave the current configuration intact.
- View menus combine **applicable registered views + annotation views**. Core `getViews` handles schema identity, aliases, mode, and resolver precedence. View-agnostic renderers do not invent names. Deduplicate the union, hide menus with fewer than two choices, and recover if the selected view disappears. Annotation view names are mode-independent; field-level input/display overrides still apply.
- Money supports `widget.currencies`, with `widget.options.currencies` as the lower-precedence spelling:

  ```json
  {
    "name": "budget",
    "input": {
      "widget": { "name": "money", "currencies": ["USD", "AUD", "EUR"] }
    }
  }
  ```

  Omit the option for the full supported list; `[]` offers none. Offered currencies intersect the schema enum; const still fixes the currency. Existing out-of-list values remain visible and unchanged. A missing currency uses an allowed default or the first allowed choice; filtering is presentation, not an additional wire-value constraint. The built-in contact demonstrates the three-code list.
- Verification: 57 kit tests and 284 core tests pass; package, registry, and playground builds pass. Browser checks at **localhost:3100** cover custom JSON, custom view names, visible display changes, zero/single-view hiding, selection recovery, and the exact money option list.

### Then: layout defaults and annotation control

Make unannotated input and display useful before the aesthetic styling pass:

- Text-like controls and their field wrappers fill their allocated container or layout track, not the viewport. Checkboxes, triggers, and actions keep appropriate intrinsic sizing.
- Nested fields can shrink, long content wraps or scrolls deliberately, and narrow screens do not overflow. Avoid accidental widths and repeated field chrome.
- Input and display have appropriate defaults without requiring a custom annotation for every field.
- Reuse the shared `props`/`stack` layout and `vertical`/`horizontal` direction vocabulary. Review existing annotation support before extending `surface.shadcn` for genuinely kit-specific presentation options.
- Every supported annotation option has a defined scope, default, override/inheritance behavior, and visible example. Presentation changes must not change wire values or data paths. Root/section capabilities that require core annotation changes are not disguised as leaf widget options.

**Exit:** the same reference examples work unannotated and with deliberate presentation overrides, in narrow and wide containers and in input/display mode. Changes to the app's local primitives remain visible. Annotation contracts validate and their effects are observable, not merely accepted by the schema.

### After that: component evaluation and expansion

Review every existing renderer for usefulness, input/display coverage, annotation support, keyboard behavior, empty/error states, and composition with semantic children. Improve an existing capability before adding a second component for the same job; the kit already has a basic array-list display.

Compare useful Surface presentations with shadcn's offerings. Initial candidates include richer lists/items, a basic table, and accordion or tab organization. These are candidates, not commitments to mirror the entire shadcn catalog.

Distinguish node presentations (such as an array rendered as a table) from structural chrome (such as annotated sections arranged in accordion panels). Both must preserve child Surface rendering and canonical paths. Do not reconstruct schema trees, flatten formatted values, or add sorting/filtering state to canonical data.

**Exit for each accepted addition:** a named use case, an explicit selection mechanism, compatible local shadcn dependencies, a working annotation example, and proof in the installed consumer. Collapsed content must not silently lose invalid drafts; its errors must remain discoverable and reachable. Add one useful, complete capability at a time.

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
- [SIX ISO 4217 currency/minor-unit list](https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml) (2026-01-01); used to exclude codes whose minor unit is N.A. rather than trusting Intl's display fraction digits as a storage definition.
- [Progress](https://ui.shadcn.com/docs/components/base/progress), [Slider](https://ui.shadcn.com/docs/components/base/slider).
