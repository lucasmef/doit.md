---
name: doitmd-design
description: Use this skill to generate well-branded interfaces and assets for doit.md, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# doit.md design skill

doit.md is a Markdown-first notes & tasks app. Voice is calm, declarative, lower-case. The brand is built around the cool-blue → teal gradient, Inter + JetBrains Mono, and markdown tokens (`#`, `- [x]`, `\`code\``, `M↓`) as iconography.

## How to use this skill

1. **Read the README.md** in this folder first. It contains: brand overview, content fundamentals (voice, casing, microcopy), visual foundations (palette, type, spacing, motion, shadows, hover/press), and iconography rules. The README is the source of truth — when in doubt, defer to it.
2. **Use the design tokens.** All tokens live in `colors_and_type.css`. Link it from any HTML you generate, or copy the relevant `--c-*`, `--fs-*`, `--s-*`, `--r-*`, `--ev-*` values into the work you're producing. Do **not** invent new colors or sizes — sample from the existing scales.
3. **Use the assets, don't redraw them.** Logos live in `assets/` (`logo-primary.svg`, `logo-icon.svg`, `logo-monochrome.svg`, `logo-reversed.svg`). Reference them; never reproduce by hand.
4. **For UI:** the `ui_kits/webapp/` folder is a working click-thru recreation of the desktop web app. Read its `README.md` and JSX components when building doit.md product surfaces — copy the patterns (sidebar, topbar, task list, note editor, command palette) rather than reinventing.
5. **For static artifacts** (slides, mocks, throwaway prototypes): copy the assets you need into the artifact folder, link `colors_and_type.css`, and produce static HTML files for the user to view.
6. **For production code:** read the rules in README.md to become an expert in designing with this brand, and translate the tokens into the host project's preferred format (CSS-in-JS, Tailwind config, etc).
7. **If invoked without guidance,** ask the user what they want to build or design (slide deck? landing page? in-app screen?), ask 4–6 focused questions about audience and scope, then act as an expert designer who outputs HTML artifacts or production code.

## Quick reference

```
Palette          Deep Navy #0F2342 · Vivid Blue #2F6BFF · Teal #28C7B7
                 Cool Gray #D9E1EA · Off White #F8FAFC

Gradient         linear-gradient(135deg, #2F6BFF 0%, #28C7B7 100%)
                 One accent per layout. Never behind text or on buttons.

Type             Inter (UI/headings/body) · JetBrains Mono (code/markdown/timestamps)
                 Display 800 · -0.02em tracking · Body 400 / 15 / 1.45

Radii            6 button · 8 input · 12 card · 16 sheet · 24 hero
Shadows          Cool-tinted only — rgba(15,35,66,…). Never warm or true black.
Motion           180ms · cubic-bezier(.2,.7,.2,1). No bounces.

Voice            Imperatives. Lower-case "doit.md". Sentence case. No emoji,
                 no exclamations. Markdown tokens are the iconography.
```

## Don't

- Use emoji in product UI or marketing.
- Capitalize the wordmark as `Doit.md` or `DoIt.md`.
- Place the gradient behind text, on buttons, or as a page background.
- Introduce warm tones, beige, true black, or stock photography.
- Hand-draw the logo or icon — copy the SVGs from `assets/`.

## Files in this skill

- `README.md` — full brand & design reference (start here).
- `colors_and_type.css` — design tokens + semantic classes.
- `assets/` — logos, brand board, raw tokens.
- `preview/` — small per-concept preview cards for the design-system reviewer.
- `ui_kits/webapp/` — interactive web-app recreation (use as component reference).
- `SKILL.md` — this file.
