# Goal: GREAT annotation-driven Product + Contact card

This is a closed-loop assignment. Do not stop at “legible,” “better,” or “MVP.” Stop only when the exit bar below is met.

## Browser (this harness)

Drive a real Chromium tab:

- `browser.open` / `goto` `http://localhost:3100/`
- `observe` / `ariaSnapshot` for structure
- `screenshot` (full page) as visual evidence — **required every grade**
- `click` / `fill` / `select` to switch Examples and views
- `evaluate` only for facts the accessibility tree cannot show (computed type, gaps, label visibility)

Headless Chromium is enough. Do not use the user’s logged-in Chrome.

Playground: Vite on **port 3100**. Examples → **Product** (`commerce.product`) and **Contact card** (`contact.card`). Seed Product with the playground laptop sample if the remote schema has no `examples`.

## What this is for

Surface annotations must produce presentation people would actually ship: a product card that looks like a product, a contact identity that looks like a person, a row that scans in a list, a detail that teaches without a plaque. The form (input `default` / `detail`) must be equally intentional.

The host theme is Nova / Tailwind 4 semantic tokens. Theme must remain obvious (tokens, not a one-off palette dump). Beauty comes from **annotation + registered widgets + local shadcn primitives**, not from painting over Field chrome with random CSS.

## Hard constraints

1. **Annotation-first.** Change `example/src/annotations/product.annotation.json` and `example/src/annotations/contact-card.annotation.json`. Input/display overrides, `omit`, `rest`, `layout`/`direction`, widgets, `add`/`remove` appearance. Do not invent a view-root `widget` (views have no widget slot).
2. **Kit widgets only** (`schemas/rusl/surface.shadcn.schema.json`). Use them: `media`, `avatar`, `carousel`, `table`, `list`, `accordion`, `collapsible`, `radio-group`, `toggle-group`, `combobox`, `textarea`, `tel`, `money`, `tooltip`, `separator`, item-action `add`/`remove`. If a needed primitive is missing from `example/src/components/ui`, `bunx --bun shadcn@latest add` it **without overwriting** `button.tsx` (host accent). Pipe `n` to skip overwrite prompts.
3. **No new wire shapes.** Product and contact.card schemas stay as-is unless a field is truly unpresentable (then stop and name the gap; do not silently invent data).
4. **Labels are not decoration.** Display identity/card/row must not look like a labeled form. Prefer omit / `labels: false` inheritance / identity fields as titles / media as the generating figure. Input may keep labels; they must still earn their keep (integritas).
5. **Do not restyle shadcn primitives’ colors/type via `className`.** Layout only (`flex`, `gap-*`, `size-*`, `min-w-0`). Theme through tokens already in `styles.css`.
6. Read **design-canon** fully, then `references/software.md` and `references/typography.md`. Read **frontend-design**. Name the module, ratios, and generating figure in a short comment at the top of each annotation file (`_comment` is invalid JSON — put a `description` on the view or a sibling `DESIGN.md` paragraph in NORTH_STAR only if needed; prefer view `description`).

## Required surfaces (minimum)

For **each** subject (Product, Contact card):

| Surface | Mode | View | Must feel like |
|---|---|---|---|
| Identity | display | `identity` | A name you could pick out of a crowd. Almost no chrome. |
| Card | display | `card` | A thing you could put on a shelf / in a contacts grid. Image or identity leads. Not a form in a box. |
| Row | display | `row` | One scan line in a list. Horizontal, truncated with cause, no stacked labels. |
| Detail | display | `detail` | The whole story, nested scale, quiet between groups. |
| Form | input | `default` | Pleasant to fill. Correct widgets (radio/toggle for short enums, textarea for prose, media/url editing that isn’t a wall of labels). |
| Form (rich) | input | `detail` | Same data, more grouping/help, still not a government PDF. |

Optional but encouraged: input `compact`. Compact is not a substitute for identity/card/row.

## Algorithm

Repeat until EXIT.

### 0. Baseline
Screenshot every required surface for both subjects. Write one sentence per surface: what a stranger thinks this is.

### 1. Decide the thing (integritas)
For Product: sellable thing — image, name, status. SKU is secondary. Metadata/external refs are chapel, not nave.
For Contact card: a person you can reach — name, then channels. Kind/org are supporting.

### 2. Module and figure
Pick one spacing module (Nova already implies `--spacing`; state the ratio, e.g. 8px module, 1∶2 / 2∶3). Generating figure: Product card = image square/4∶3 over a caption; Contact identity = name as title, channels as a list; Row = a single baseline.

### 3. Install what’s missing
If Card/Item/Badge/Avatar/Aspect/Separator/etc. is the right primitive and absent, add it. Then register usage via **existing widgets** or object/array chrome. Do not invent a second Card renderer if `media` `view: "card"` plus omit-labels already composes.

### 4. Annotate
Edit the two annotation documents. Typical moves:

- Display card/identity/row: `rest: "omit"`; omit `$kind`; hide redundant labels; media/carousel on images; list on emails/phones/links; badge-like status via radio display or a single emphasized field; `add`/`remove` `appearance: "icon"` or `"tooltip"` on arrays in input.
- Detail: `layout: "stack"`; sections with separator/collapsible; descriptions only where they teach.
- Input default: toggle/radio for 2–5 enums; textarea for description; collapsible for rare fields (nameComponents, metadata).

### 5. Prove
Reload `:3100`, load the example, switch Display view through identity → row → card → detail, then Input default and detail. Screenshot each. Seeded Product must show real images.

### 6. Dual grade (independent, evidence = screenshots)

**Canon grader** (design-canon, software + typography refs). Score 1–10 each principle. Fail any of 01, 06, 07, 09 below 8 on a required surface → not done.

| # | Principle | Fail if |
|---|---|---|
| 01 Integritas | Labels, `$kind`, empty sections, duplicate names | Form chrome on a card/identity/row |
| 02 Mensura | Arbitrary gaps/type sizes | Mix of unrelated paddings |
| 03 Harmonia | Widgets from different “centuries” in one view | |
| 04 Geometria | Card not generated from image/title figure | |
| 05 Numerus | Inconsistent row rhythm | |
| 06 Ordo | SKU shouting over the product name | |
| 07 Distinctio | No quiet; every field labeled | |
| 08 Cura | Add/Remove still raw “Remove” on a polished card’s edit mode; misaligned icons | |
| 09 Claritas | Stranger needs the view dropdown to know what they’re looking at | |

**Visual grader** (frontend-design / art director). Score 1–10:

- Distinctiveness (not generic shadcn kitchen sink)
- Hierarchy visible at 200px thumbnail
- Type and weight: one voice
- Density: card/row compact; detail breathing
- Theme: Nova tokens still readable as one product
- Motion: none required; if present, one cadence
- Would you ship this in a catalog / contacts app this week?

GREAT = Canon **and** Visual both ≥ **8/10** on **every** required surface, both subjects, with screenshots attached. A 7 is “pretty good.” Not enough.

### 7. Iterate
If a surface fails, name the failing principle/visual axis and change **only what that failure requires** (usually omit, widget, or rest — not a new CSS file). Re-screenshot. Re-grade. Do not accumulate decoration to chase a score.

## EXIT

Stop when and only when:

1. Both subjects have identity, card, row, detail (display) and default + detail (input) screenshots in this session.
2. Canon grader and Visual grader each record ≥ 8/10 on all of those surfaces.
3. Claritas: a stranger can name “product” / “contact” from the card screenshot without reading the playground chrome.
4. Theme still Nova (no rogue purple gradient, no overwritten Button).
5. `bun run check` still passes (annotations must stay valid Surface annotation documents).

If a required look is **impossible** with current widgets/core (e.g. true identity without a label because chrome always paints FieldLabel), **stop**, write the exact gap (file + symbol), and do not fake it with `position: absolute` hacks. That is a legitimate EXIT with a named blocker — still not a claim of GREAT.

## Non-goals

Publishing npm 0.1.1, playground URL/schema editors, new catalog components that duplicate existing widgets, restyling the playground chrome itself (header/marketing). The assignment is the **surfaces inside the two cards**.
