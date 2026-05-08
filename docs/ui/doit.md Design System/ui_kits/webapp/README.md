# doit.md webapp — UI kit

A click-thru recreation of the doit.md desktop web app. **Not production code** — components are cosmetic-only and use mock state.

## Run

Open `index.html`. No build step. Loads React + Babel from CDN, the design tokens from `../../colors_and_type.css`, and the JSX components in this folder.

## Layout

```
sidebar (260)  │  topbar (56)                          │  rail (320)
               │  ──────────────────────────────────   │
   views       │                                       │  today's progress
   notebooks   │     content column (max 720)          │  streak
   tags        │       Today / Inbox / Note editor     │  shortcuts
   user        │                                       │  recent notes
```

## What works

- ⌘K (or Ctrl-K) opens the command palette.
- Sidebar items switch between Today, All notes, and notebooks.
- Today checkboxes toggle and update the progress meter + ring.
- Composer in Today adds new tasks (`- [ ] add a task and press enter`).
- Clicking an inbox row opens the note editor.
- Toasts appear on completion / addition.

## What's mocked / faked

- "Synced 2m ago" never changes.
- The note editor renders one fixed note (`Ship v0.4`); switching notes from the inbox always shows the same content.
- No persistence. State resets on reload.

## Components

| File | What it is |
|---|---|
| `Icons.jsx`         | `<Icon name="…" size={…} stroke={…} />`. Lucide-style outline set. |
| `Sidebar.jsx`       | Left nav (views, notebooks, tags, user footer). |
| `Topbar.jsx`        | Sticky breadcrumbs + per-screen actions. |
| `TaskList.jsx`      | Markdown-style checkbox list. Exports `<TaskCheckbox>` separately. |
| `TodayView.jsx`     | Daily focus screen with progress meter and composer. |
| `InboxView.jsx`     | Markdown file browser (all notes). |
| `NoteEditor.jsx`    | Markdown editor / preview. |
| `CommandPalette.jsx`| ⌘K overlay with sectioned results. |
| `app.jsx`           | Shell, mock state, view switching. |
| `app.css`           | Component CSS (tokens come from `colors_and_type.css`). |

## Caveats

- This UI is an interpretation of the brand board, not a recreation of shipping product (no codebase or Figma file was shared).
- The right-rail "streak" mini-chart is a working pattern; doit.md may handle this differently in production.
