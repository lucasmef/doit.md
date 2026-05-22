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

Keep only the production deploy job on the self-hosted VPS runner. The deploy job runs only for `main` and uses `/srv/doit/prod/doit-config/web.env`.

Remove the remote Doit dev environment from the VPS, including versioned dev systemd/Nginx templates and live `doit-dev` runtime resources.

### Consequences

- CI no longer competes with production runtime memory and CPU on the VPS.
- CI no longer needs access to production environment files.
- The VPS has one Doit runtime: production.
- GitHub-hosted Actions minutes are consumed for gates.

### Risks

- GitHub-hosted runner usage may count against private repository Actions minutes.
- Production deploy still performs install/build on the VPS unless a later artifact-based deploy replaces it.

### Alternatives considered

- Keep self-hosted CI and increase VPS memory/swap.
- Add a second self-hosted runner on another machine.
- Build deploy artifacts on GitHub-hosted runners and copy only artifacts to the VPS.
