# @rusl-labs/surface-shadcn

Surface kit for shadcn/ui. Schemas, annotations, and data become input and display surfaces from the consuming app’s own shadcn components.

## Playground

```sh
bun install
bun run dev
```

Open http://localhost:3100/

## Install into an app

The npm package is not on the public registry yet. From a clone of this repo:

```sh
bun run build
bun run build:registry
```

Then in the app, add the built registry item (path or URL to `public/r/surface.json`). That install writes `components/surface` and depends on `@rusl-labs/surface-shadcn` plus `@rusl-labs/surface` **0.1.1**. Until those are on npm, point the registry dependencies at git or local tarballs the same way `bun run test:next` does.

Register annotations in `src/components/surface/resolvers.ts`. Schema URLs do not imply annotation URLs.

## Widget vocabulary

`schemas/rusl/surface.shadcn.schema.json` is the kit’s widget contract (`$kind` URIs under `https://resources.rusl.com/resources/rusl/schemas/surface.shadcn#/$defs/…`). It is local (`dev = true`) until published on Rusl.

Playground annotations (contact demo, product, contact card) stay in `example/`. They are not the kit.
