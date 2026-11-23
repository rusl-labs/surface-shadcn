# surface-shadcn

The shadcn/ui kit for [Surface](https://github.com/rusl-labs/surface). It renders a JSON Schema as forms and displays with your own shadcn components. One annotation defines every view.

Docs and live examples: https://surface-shadcn.rusl.com

## Install

Requires React 19, Tailwind CSS v4, and shadcn/ui set up for Base UI. For a new app, run `npx shadcn@latest init --base base` first.

```sh
npx shadcn@latest add rusl-labs/surface-shadcn/surface
```

The shadcn CLI reads `registry.json` from this repository. The install copies the renderers into `components/surface` and adds `@rusl-labs/surface`, `@rusl-labs/surface-shadcn`, `@rusl-labs/surface-ajv` with AJV, and the shadcn components they use. The renderers are yours to edit.

To pin a release, add its tag: `rusl-labs/surface-shadcn/surface#v0.1.0`.

## Usage

```tsx
import { Surface } from "@/components/surface";

<Surface id={schemaId} mode="input" view="default" onSubmit={({ data }) => console.log(data)} />

<Surface id={schemaId} mode="display" view="card" data={record} />
```

`id` is the schema `$id`. Schemas that are not registered locally are fetched from their URL. Register local schemas and annotations in `components/surface/resolvers.ts`. Surface matches an annotation to a schema by its `subject`; schema URLs do not imply annotation URLs.

An annotation names views and lists each view's fields, labels, sections, and widgets. See the [annotation reference](https://github.com/rusl-labs/surface/blob/HEAD/docs/annotation.md).

## Widget vocabulary

`schemas/rusl/surface.shadcn.schema.json` is the kit’s widget contract (`$kind` URIs under `https://resources.rusl.com/resources/rusl/schemas/surface.shadcn#/$defs/…`). It is local (`dev = true`) until published on Rusl.

## What is in this repository

| Path | Ships as |
|---|---|
| `registry/surface/` | The shadcn registry item. Copied into the app by `shadcn add`. |
| `src/` | The `@rusl-labs/surface-shadcn` npm package: field state, form drafts, phone and money helpers, and bundled canonical schemas. No UI. |
| `site/` | The homepage, deployed to GitHub Pages with the built registry under `/r`. |
| `example/` | The local playground. Its annotations are demos, not part of the kit. |

## Development

This branch uses the sibling `../surface/packages/core` as a local `file:` dependency
in the root, example, and site. It needs the standalone-presentation patch; the
published core `0.1.1` does not contain it. Build core first:

```sh
(cd ../surface/packages/core && bun run build)
bun install
bun run site:install
bun run check:runtime
bun run dev              # playground at http://127.0.0.1:3100
bun run check            # typecheck, tests, package, registry, and playground builds
bun run test:next        # install the registry into a fresh Next.js app and build it
bun run test:next:clean  # remove that app
```

The homepage has its own dependencies:

```sh
bun run site:install
bun run site:dev         # http://127.0.0.1:3200
```

See [`site/PLAYGROUND.md`](site/PLAYGROUND.md) for the page-local agent tools,
diagnostics, dependency refresh instructions, and remaining label-policy limitation.
After rebuilding local Surface, reinstall root and site with `bun install --force`
and restart Vite with `--force`; `check:runtime` checks for stale installed builds.

## Releasing

**Before deploying or publishing this branch**, replace the local Surface dependency
with a released or reproducibly pinned distributable containing the patch. CI does
not have the sibling checkout. The current dependency setup is for local iteration.

1. Set the new version in `package.json` and in the `@rusl-labs/surface-shadcn@…` pin in `registry.json`. They must match.
2. Merge to the default branch, then push the tag `vX.Y.Z` for that version. [`publish.yml`](.github/workflows/publish.yml) checks the versions, runs `bun run check`, and publishes to npm with trusted publishing.

`shadcn add` reads the default branch, so installs fail to find the new npm version until the publish finishes. Push the tag right after merging.

## License

Apache-2.0
