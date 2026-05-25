# doit.md — Design System

> Markdown-first notes and tasks. Capture ideas, organize tasks, and ship progress with Markdown.

This folder is the source of truth for the **doit.md** brand: tokens, typography, logo lockups, content tone, and a working UI kit. Use it whenever you generate doit.md mockups, marketing surfaces, slides, or in-app screens.

---

## Source materials

This system was generated from a small Figma-import package the team uses to seed designs:

| File | What it is |
|---|---|
| `uploads/brand-board.svg` | One-page brand board (logo, palette, type, do/don't, app icon, sample app) |
| `uploads/brand-tokens.json` | Machine-readable color + typography tokens |
| `uploads/logo-primary.svg` | Wordmark + icon, on white |
| `uploads/logo-reversed.svg` | Wordmark + icon, on deep navy |
| `uploads/logo-monochrome.svg` | Single-color navy version, no gradient |
| `uploads/logo-icon.svg` | Square app-icon lockup (rounded-rect, off-white background) |
| `uploads/README.md` | Original PT-BR import notes from the brand team |

No codebase or Figma file was attached — all visual decisions in this system are inferred from the brand board and tokens above. Where the source was silent (motion, hover states, full UI components), defaults have been chosen that match the established palette and typography. **Treat anything not on the brand board as a working assumption** and edit freely.

---

## Index

```
.
├── README.md                  ← you are here
├── SKILL.md                   ← invocation file (works as a Claude Code skill)
├── colors_and_type.css        ← all design tokens as CSS vars + semantic classes
├── assets/                    ← logos, brand board, raw tokens
│   ├── logo-primary.svg
│   ├── logo-icon.svg
│   ├── logo-reversed.svg
│   ├── logo-monochrome.svg
│   ├── brand-board.svg
│   └── brand-tokens.json
├── preview/                   ← cards rendered in the Design System tab
│   ├── card-*.html              one card per concept (palette, type, buttons, …)
└── ui_kits/
    └── webapp/                ← doit.md notes & tasks app (interactive recreation)
        ├── index.html           click-thru prototype
        ├── README.md
        └── *.jsx                modular components
```

---

## Brand at a glance

- **Product:** doit.md — a Markdown-first notes & tasks app. The dot-md file extension *is* the brand. Every screen, slide, and surface should feel like a tidy markdown document.
- **Audience:** developers, technical PMs, makers. People who already write `- [ ]` task lists in their notes app.
- **Promise:** *Capture ideas, organize tasks, and ship progress with Markdown.* Three verbs, in that order: capture → organize → ship.
- **Tagline forms:**
  - Headline: **Markdown-first notes and tasks.**
  - Sub: *Capture ideas, organize tasks, and ship progress with Markdown.*
  - Action couplet (used in type specimens): **Build clarity. Ship progress.**

---

## Content fundamentals

doit.md sounds like a thoughtful engineer with a bias to action. Calm, declarative, never breathless.

**Voice**
- **Direct verbs first.** "Capture ideas." "Ship progress." "Check the box." Imperatives are common for marketing; the app itself uses present-tense verbs ("Today", "Synced", "2 tasks remaining").
- **Lower-case product name, always.** It is `doit.md`, never `DoIt.md`, `Doit.md`, or `DoIt`. Treat the wordmark as code-flavored.
- **You, not we.** Address the user. The product talks *to* the user, not *about* itself.
- **No exclamation marks.** Confidence comes from clarity, not enthusiasm.
- **No emoji** in product UI or marketing surfaces. The vocabulary is markdown syntax instead — `# Heading`, `- [x] task`, `\`code\``, `M↓`. These tokens *are* the brand's emoji.
- **Sentence case.** Headings, button labels, menu items — all sentence case, except the wordmark `doit.md`.
- **Numerals over words** for counts (`3 tasks`, not "three tasks"). Tasks, days, time-since are the things people scan for.

**Examples**

| Surface | ✓ on-brand | ✗ off-brand |
|---|---|---|
| Hero | Markdown-first notes and tasks. | Supercharge your productivity ✨ |
| Button | Add task | Get Started Now! |
| Empty state | No tasks for today. Add one with `+`. | You don't have anything yet 😴 |
| Toast | Synced 2 minutes ago | All your stuff is saved! |
| Section | Today | 🔥 Today's Hot List |

**Microcopy patterns**
- Use markdown-flavored hints in placeholders: `# Title`, `- [ ] something to do`, `> note`.
- Keyboard shortcuts shown as kbd tags: `⌘` `K`, `⌘` `Enter`. Never spell out "command".
- Time-relative metadata: "2m ago", "Yesterday", "Synced just now".
- Status verbs: *Synced, Saved, Drafted, Done, Archived.*

---

## Visual foundations

### Palette

| Token | Hex | Role |
|---|---|---|
| Deep Navy | `#0F2342` | Primary text, dark surfaces, monochrome marks |
| Vivid Blue | `#2F6BFF` | Primary action, links, the "do" half of the gradient |
| Teal | `#28C7B7` | Completion, success, the "done" half of the gradient |
| Cool Gray | `#D9E1EA` | Borders, dividers, muted fills |
| Off White | `#F8FAFC` | Page background, sunken surfaces |
| White | `#FFFFFF` | Elevated surfaces (cards, panels, app icon) |

The palette is **deliberately small and cool.** Never introduce warm tones, beige, or true black. If you need an in-between hue, sample it from the brand gradient (see `colors_and_type.css` — `--c-blue-steel`, `--c-cyan-2`).

### The brand gradient

`linear-gradient(135deg, #2F6BFF 0%, #28C7B7 100%)`

It runs vivid-blue → teal at 135°. Use it for:
- the logo's progress arc and dotted completion trail,
- short progress bars / completion meters,
- a single accent stripe per layout (one hero divider, the active-tab underline).

**Don't** use it as a page background, behind text, on buttons, or anywhere it would compete with the logo.

### Typography

- **Inter** — UI, headings, body. Weights used: 400 / 500 / 600 / 700 / 800.
  - Display headings are **800** with `letter-spacing: -0.02em`. Tight, confident.
  - Body is 400 / 15px / line-height 1.45.
  - Eyebrow labels are 12px / 700 / uppercase / tracking +0.04em.
- **JetBrains Mono** — code, file paths, markdown tokens, keyboard shortcuts, timestamps. The mono face is *ambient*: it shows up in placeholders, captions, and tags, not just code blocks.

The mono/sans contrast is the entire personality of the brand. A page without any monospace looks unfinished.

### Spacing & layout

- 4px base. Use the `--s-*` scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64).
- App layout: 280px sidebar + flexible content + optional 320px right rail. Max content width 720–880px (markdown-readable).
- Marketing layout: max width 1200px, generous 80–120px section padding.

### Corner radii

- 6px on small chips & tag pills (just shy of square).
- 8px on inputs and small cards.
- 12px on standard cards, menus, modals.
- 16px on large hero panels.
- 24px on the app-icon lockup background.
- Pills (`999px`) only for status chips and the avatar; never for buttons.

### Elevation & cards

- Cards are **white on off-white** with a `1px` cool-gray border and a *whisper* of shadow (`--ev-1`). Border does most of the work; shadow is barely there.
- Menus and overlays use `--ev-2` (slightly larger, still cool-tinted).
- Modals use `--ev-3`.
- Shadows are **always cool** — `rgba(15, 35, 66, ...)` — never warm or pure black.

### Borders

1px cool-gray (`--border`) for most things. 1px `--border-strong` for inputs at rest. Never use a colored border as the primary affordance.

### Hover & press

- Hover: nudge the surface one shade — `--bg-sunken` for ghost buttons, `--c-gray-50` for list rows, slight border darken on cards. Never add a new color on hover.
- Primary buttons darken Vivid Blue ~6%; do **not** apply the gradient on hover.
- Press: `transform: translateY(1px)` and a subtle inner shadow. No size pop.
- Focus ring: 3px `rgba(47,107,255,.25)` — `--ev-focus`.

### Motion

- Default duration **180ms**, easing `cubic-bezier(.2,.7,.2,1)` (`--ease`).
- Fades + 4px translates. No bouncing, no spring.
- Checkbox check uses a 220ms stroke-dasharray draw — the only signature animation. Tasks completing also fade their text to `--fg-3` and add a strikethrough.
- Page-level transitions: avoid. Static feels more dependable.

### Backgrounds

- Page surface is plain `--bg` (`#F8FAFC`). No textures, no patterns, no full-bleed photography.
- Marketing pages may use **one** soft radial wash at 4–6% opacity, anchored top-right, sampled from the brand gradient. That is the maximum decoration.
- Imagery, when present, is screenshots of the app itself — never stock photos.

### Transparency & blur

- Sparingly. Sticky top bars get `backdrop-filter: blur(12px)` over `rgba(248,250,252,.78)`.
- Overlays (modals, drawers) use `rgba(15,35,66,.40)` scrim — navy, not gray.

### Layout fixtures

- Sidebar is sticky, scrolls independently.
- Top bar (when present) is sticky and 56px tall.
- Markdown editor uses a 720px content column centered in available space.

---

## Iconography

There is no shipped icon font in the source materials. The brand board uses three families of icon-like marks, and the design system follows the same approach:

1. **Markdown tokens as iconography.** `# `, `- [ ] `, `- [x] `, `\`\`\``, `M↓`, `>`. These are typed in JetBrains Mono in the brand color appropriate to context (navy for static, teal for "completed", blue for "active"). Whenever an icon would feel decorative, prefer a markdown token instead.
2. **Lucide outline icons** for UI affordances (search, plus, settings, chevron, etc). 1.75px stroke, rounded line-cap, rounded line-join. We load from CDN: `https://unpkg.com/lucide@latest`. **This is a substitution** — the source materials don't specify an icon library; Lucide was chosen because its stroke weight and visual rhythm match the logo's check-mark stroke. Swap it for the team's official set when known.
3. **Logo-derived custom marks** — the circular check, the dotted progress trail. Reuse these (don't redraw): pull from `assets/logo-icon.svg` and crop/scale.

**Rules**
- Icon stroke matches the logo: 1.75px in 24px viewbox, 2px in 32px+ viewbox, round caps and joins.
- Icons inherit `currentColor`. Tint by setting `color:` on the parent.
- No emoji. No filled glyphs (Material-style). No duotone.
- Status uses a colored dot, not a badge: 8px circle in `--c-vivid-blue` / `--c-teal` / `--c-warning`.

---

## Caveats / known assumptions

- **Fonts:** Inter and JetBrains Mono are loaded from Google Fonts. No `.ttf` files were shipped in the source — if the team has licensed copies they want bundled, drop them into `fonts/` and switch the `@import` in `colors_and_type.css` to `@font-face`.
- **Icon library:** Lucide is a documented substitution; replace with the team's set if it exists.
- **No codebase, no Figma file:** every UI kit screen is an *interpretation* of the brand board, not a recreation of shipping product. Treat as a starting point.
- **Imagery:** none was provided, so the design system avoids photography entirely. If photography is part of the brand IRL, it isn't documented here.
