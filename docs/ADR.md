# Architecture Decision Records

This file stores durable decisions that are architectural, expensive, risky, or hard to reverse.

Do not record every small implementation detail here.

---

## ADR-001 - BuilderFlow adoption

Status: active
Date: 2026-05-22

### Context

The user works as a solo founder-builder with limited time for continuous development supervision.

The previous workflow risked losing context across sessions and creating unnecessary process overhead.

### Decision

Adopt BuilderFlow as the default AI-assisted development workflow.

BuilderFlow uses:

- one skill: `builderflow`
- one living spec per feature in `specs/`
- minimal fixed documentation
- Grill Gate as an internal decision step
- ADRs only for architectural or hard-to-reverse decisions

### Consequences

- Less documentation fragmentation.
- Easier task resumption.
- Lower cognitive load.
- More responsibility on the agent to classify work correctly.

### Risks

- A single living spec can become too long if the task is too broad.
- The agent may under-ask questions if Grill Gate is too permissive.

### Mitigations

- Keep one feature per spec.
- Ask up to 5 decision-oriented questions when ambiguity is material.
- Treat architectural changes as requiring ADR and confirmation.

---

## ADR-002 - Simplified dev/main deploy workflow

Status: active
Date: 2026-05-22

### Context

The repository had two competing operational models:

- `dev` as a Git branch plus a dev deployment prepared on the VPS.
- `dev` as local development plus Git validation only, with `main` as the only branch deployed to the VPS.

The user wants a simpler solo-builder flow with fewer environments to reason about.

### Decision

Use four explicit states:

```txt
dev local -> dev git -> main git -> main vps
```

The active workflow is:

```txt
change on local dev
  -> homologate locally
  -> commit/push to dev git
  -> run quality/security gates
  -> merge dev to main git
  -> deploy main to the VPS
```

`dev` is not deployed to the VPS as an active environment. The VPS tracks `main` for production.

### Consequences

- Fewer runtime environments and less VPS memory pressure.
- `dev` remains useful as the integration branch for gates before production.
- Production deploy is tied to `main`, making the deployed code easier to identify.

### Risks

- There is no persistent remote dev environment for browser testing.

### Alternatives considered

- Keep a dev VPS environment behind Tailscale.
- Keep manual production promotion from `dev` inside the deploy workflow.

---

## ADR-003 - CI off production VPS

Status: active
Date: 2026-05-22

### Context

The self-hosted GitHub Actions runner shares the same VPS as the production Doit runtime. Build and audit jobs consumed enough memory to cause a failed `next build` gate with `SIGKILL`.

The VPS should be treated as production runtime and deploy target, not as the normal CI execution host.

### Decision

Run CI gates on GitHub-hosted Linux runners:

- typecheck
- incremental lint
- production build validation with non-secret CI environment values
- dependency audit
- secret scan

Keep only the production deploy job on the self-hosted VPS runner. The deploy job runs only for `main` and uses `/srv/doit/prod/doit-config/web.env`. `main` is protected with required PR checks, so the production workflow does not repeat CI gates.

Remove the remote Doit dev environment from the VPS, including versioned dev systemd/Nginx templates and live `doit-dev` runtime resources.

### Consequences

- CI no longer competes with production runtime memory and CPU on the VPS.
- CI no longer needs access to production environment files.
- The VPS has one Doit runtime: production.
- GitHub-hosted Actions minutes are consumed for gates.

### Risks

- GitHub-hosted runner usage may count against private repository Actions minutes.
- Production deploy still performs install/build on the VPS unless a later artifact-based deploy replaces it.
- Direct changes to `main` depend on GitHub branch protection remaining enabled.

### Alternatives considered

- Keep self-hosted CI and increase VPS memory/swap.
- Add a second self-hosted runner on another machine.
- Build deploy artifacts on GitHub-hosted runners and copy only artifacts to the VPS.

---

## ADR-004 - Sync CLI Workspace Layout

Status: active
Date: 2026-06-02

### Context

The current `doit-sync` workspace mixes user-editable synced folders with CLI-owned state at the workspace root. After `doit-sync init` and `doit-sync pull`, folders such as `Inbox`, `Proximos`, app folders, `_system`, `_changes`, `_raw_archive`, `AGENTS.md`, and `README.md` appear side by side.

This makes the local workspace confusing for humans and AI agents because internal sync files look like part of the editable content tree.

### Decision

Use a separated workspace layout for new sync CLI workspaces:

```txt
workspace-doitmd/
  README.md
  AGENTS.md
  inbox/
  proximos/
  arquivo/
  <pastas sincronizadas>/
  .doit-sync/
    system/
    changes/
    raw-archive/
```

The workspace root remains the editable surface for synced Markdown content. `.doit-sync/` is owned by the CLI and stores manifests, pending changes, last run metadata, Drive cache/index data, and raw archives.

Manifest `localPath` values remain relative to the workspace root, preserving app-level sync semantics and avoiding server paths that include CLI system directories.

The `inbox/` folder is an intentional entry point for loose files. Any file placed there must be reviewed by an AI agent before being moved, rewritten, classified, or pushed into the app.

The CLI must not write folder marker files such as `_folder.json` inside synced content folders. Folder metadata belongs in `.doit-sync/system`.

### Consequences

- New workspaces have a cleaner root and a clearer boundary between content and system state.
- The CLI needs path helpers so commands do not hardcode root-level `_system`, `_changes`, and `_raw_archive`.
- Documentation and the app's Sync settings page must teach the new layout.
- Existing workspace compatibility is intentionally not implemented for this change because the only current user removed the old local workspace before reinstalling the CLI.
- Empty folder renames may be harder to classify without in-folder marker files; preserving a clean content tree is more important for this single-user workflow.

### Risks

- Reusing an old workspace with root-level `_system`, `_changes`, or `_raw_archive` will not be supported by this implementation.
- If manifest paths are interpreted relative to the wrong root, `diff` may report false moves or deletes.
- AI agents may initially look in the old root paths if using older instructions.

### Alternatives considered

- Put synced content under `items/`. This would make the root cleaner, but the user prefers opening the workspace and seeing `inbox`, `proximos`, and real folders immediately.
- Keep the old layout. This avoids code changes but preserves the confusing mix of CLI state and editable content.
- Implement automatic migration/fallback for old workspaces. This is unnecessary for the current single-user rollout and would add risk around unpushed local edits.
