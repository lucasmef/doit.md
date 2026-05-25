# PRD: Business Rules Security Hardening

## Context

Audit review found business-rule checks that were documented but not fully enforced at runtime.
The first implementation phase focuses on preventing authenticated clients from bypassing approval
or mutating protected fields through handcrafted API requests.

## Goals

- Enforce sync approval from server-side pending changes, not client-submitted change objects.
- Reject item/folder references that do not belong to the authenticated user.
- Apply runtime allowlists before PATCH writes to item and folder documents.
- Preserve existing CLI/UI flows while shrinking the trusted client payload.
- Keep a visible checklist for the security/business-rule audit until every critical finding is closed.

## Non-Goals

- No schema migrations.
- No AGENTS.md changes.
- No local dev server validation.
- No OAuth state/rate-limit work in this first pass.

## Status

| Area | Status | Notes |
| --- | --- | --- |
| Sync push approval bypass | Done | `/api/sync/push` now loads pending changes from DB and filters by requested IDs. |
| UI sync push payload | Done | Audit UI sends approved IDs instead of full change objects. |
| CLI sync push payload | Done | `doit-sync push` sends approved IDs instead of full change objects. |
| Item PATCH protected-field allowlist | Done | Single and bulk item patches now discard non-allowlisted fields. |
| Item create/update reference ownership | Done | `folderId`, `projectId`, `areaId`, and `parentId` are checked against the authenticated user. |
| Folder create parent ownership | Done | Folder creation rejects unknown or foreign `parentId`. |
| Folder PATCH protected-field allowlist | Done | Folder updates only allow documented mutable fields. |
| Folder PATCH parent validation | Done | Folder updates reject unknown parents and descendant cycles. |
| OAuth callback state hardening | Done | Google OAuth now uses signed state plus httpOnly nonce cookie. |
| Auth/API rate limiting | Done | SQL-backed limiter added to register, credentials login, CLI bearer auth, Google OAuth, CLI token create, sync push, sync log and pending batch. |
| Audit logging coverage for manual edits | In Progress | High-impact item/folder/manual restore, CLI token, and Google connect/disconnect logs added; coverage can still expand. |
| AGENTS.md local addendum model | Done | Sync workspace now keeps generated `AGENTS.md` and syncs user rules as `AGENTS.local.md`. |
| Drive attachment E2E validation | Planned | Covered by `docs/plans/drive-attachments-e2e-checklist.md`; implementation appears coded, validation pending. |

## Severity Model

| Severity | Definition | Response |
| --- | --- | --- |
| Critical | Bypasses approval, ownership, or protected-field rules with authenticated access. | Fix before broad use of sync/CLI. |
| High | Allows unauthorized relationship changes, account linking confusion, or brute-force pressure. | Fix in the next security pass. |
| Medium | Creates data drift, weak observability, or privacy exposure under realistic but narrower conditions. | Schedule after critical/high items. |
| Low | Documentation or implementation mismatch with limited direct exploitability. | Track opportunistically. |

## Findings Register

| ID | Finding | Severity | Status | Owner Notes |
| --- | --- | --- | --- | --- |
| BR-001 | `/api/sync/push` trusted client-submitted `changes` and `approved` fields. | Critical | Done | Server now uses DB pending rows and treats payload as an ID selector only. |
| BR-002 | Item PATCH endpoints relied on TypeScript types instead of runtime allowlists. | Critical | Done | Single and bulk item updates now discard non-allowlisted fields before write. |
| BR-003 | Folder PATCH endpoint spread request body into DB patch. | High | Done | Folder updates now use explicit mutable-field allowlist. |
| BR-004 | Item create/update accepted foreign or nonexistent `folderId`, `projectId`, `areaId`, `parentId`. | High | Done | References are checked against the authenticated user. |
| BR-005 | Folder create/update accepted invalid parent references and could create hierarchy cycles. | High | Done | Parent existence and descendant-cycle checks added. |
| BR-006 | Google OAuth callback uses user identity in `state` without a signed nonce/session check. | Critical | Done | State is now HMAC-signed and bound to an httpOnly nonce cookie. |
| BR-007 | Auth and token-sensitive endpoints have no clear rate-limit layer. | High | Done | SQL-backed app-level limiter added to sensitive routes; edge/proxy limits are still useful defense-in-depth. |
| BR-008 | Manual API edits are less visible than sync-agent edits in audit history. | Medium | In Progress | High-impact manual actions, CLI token lifecycle, and Google connect/disconnect now log; routine edit policy remains open. |
| BR-009 | Local offline queue can contain item content in browser storage. | Medium | Pending | Document threat model and consider retention/encryption tradeoff. |
| BR-010 | Drive reconciliation is best-effort and can drift silently. | Medium | Pending | Add user-visible repair/status checks later. |
| BR-011 | Workspace `AGENTS.md` can be overwritten by the user's synced AGENTS item instead of acting as an addendum. | Medium | Done | User rules now resolve to `AGENTS.local.md`; generated `AGENTS.md` is ignored by diff. |
| BR-012 | Drive attachment behavior needs full E2E proof after coded phases. | Medium | Planned | Checklist exists in `docs/plans/drive-attachments-e2e-checklist.md`; requires Google account validation. |

## Implementation Plan

### Phase 1: Runtime Business-Rule Enforcement

Status: Done.

Scope:

- Change sync push to load approved pending changes from DB.
- Send approved IDs from UI/CLI instead of full pending-change documents.
- Add runtime allowlists to item and folder updates.
- Validate item/folder ownership references.
- Keep backward compatibility for old clients by accepting `changes` but using only their IDs.

Validation:

- `pnpm --filter @doit/web exec tsc --noEmit`
- `pnpm --filter doit-sync exec tsc --noEmit`

### Phase 2: OAuth State Hardening

Status: Done.

Scope:

- Generate a signed, single-use OAuth state nonce before redirecting to Google.
- Store or sign enough context to bind the callback to the current authenticated session.
- Reject missing, expired, reused, malformed, or user-mismatched state values.
- Keep token writes scoped to the authenticated user proven by the state check.

Acceptance:

- A copied callback URL cannot link a Google account to another user.
- Callback no longer trusts raw `state` as `userId`.
- Error handling returns the user to settings with a safe failure message.

### Phase 3: Rate Limiting

Status: Done.

Scope:

- Identify sensitive routes: sign-in/register flow, CLI token creation, OAuth connect/callback, sync pending/push.
- Choose implementation: app-level SQL-backed limiter, middleware-level limiter, or deployment-level rate limit.
- Add conservative defaults that do not break normal local sync usage.

Acceptance:

- Repeated failed auth/token attempts are throttled.
- Sync push/diff remains usable for normal batch sizes.
- Rate-limit errors are explicit and do not leak account existence.

Implementation:

- Credentials login: 10 attempts per email/IP per 15 minutes.
- Register: 10 attempts per IP per 15 minutes.
- CLI Bearer token validation: 120 attempts per IP per 15 minutes.
- Google OAuth start/callback: bounded per IP per 15 minutes.
- CLI token creation: 10 per user/IP per hour.
- Sync push, pending batch, and sync log: bounded per user/IP per 15 minutes.

Recommended follow-up:

- Add edge/proxy-level limits in production for defense-in-depth.
- Add visibility/metrics for throttled requests.

### Phase 4: Audit Coverage and Operational Visibility

Status: In Progress.

Scope:

- Decide which manual actions should produce `AuditLogModel` entries.
- Add audit entries for high-impact manual edits: archive/delete, folder move/delete, note restore/version restore, bulk status changes.
- Add a lightweight Drive reconciliation status or repair command if drift becomes visible to users.

Current implementation:

- Item manual updates with high-impact fields produce audit logs.
- Item archive/delete produces an audit log.
- Bulk high-impact item updates produce an audit log.
- Folder update/delete produces audit logs.
- Item version restore produces an audit log.
- CLI token create/revoke produces audit logs.
- Google connect/disconnect produces audit logs.

Acceptance:

- High-impact manual changes are traceable.
- Audit output stays useful and does not flood routine low-risk edits.
- Privacy-sensitive item content is not copied into audit summaries.

### Phase 5: AGENTS.md Addendum Semantics

Status: Done.

Source plan: `docs/plans/agents-md-addendum.md`.

Scope:

- Keep generated workspace `AGENTS.md` as the default app instructions.
- Move the user-editable synced rules to `AGENTS.local.md`.
- Ensure `pull` regenerates the default file and migrates existing workspaces safely.
- Ensure `diff` ignores generated `AGENTS.md` and syncs only `AGENTS.local.md`.
- Update UI copy so users understand the default file plus local addendum model.

Acceptance:

- A user-created AGENTS item no longer overwrites the generated default `AGENTS.md`.
- Existing workspaces migrate without losing user rules.
- `doit-sync diff` does not create a spurious item from generated `AGENTS.md`.

### Phase 6: Drive Attachment E2E Validation

Status: Planned.

Source checklist: `docs/plans/drive-attachments-e2e-checklist.md`.

Scope:

- Validate upload folder mirroring.
- Validate attachment movement after UI and sync-agent item moves.
- Validate `doit-sync drive get`.
- Validate Drive inbox processing.
- Validate drift sweep/status behavior.

Acceptance:

- The checklist passes against a connected Google account with Drive scope.
- Any failed checklist item becomes a concrete bug entry before closing this phase.

## Threat Model

| Threat | Impact | Current Mitigation | Remaining Work |
| --- | --- | --- | --- |
| Compromised CLI token posts fabricated approved sync changes. | Unauthorized item/folder mutation through sync. | Server reads pending rows from DB. | Consider token rotation/revocation UX and rate limits. |
| Authenticated manual request writes protected item fields. | Ownership or sync metadata corruption. | Runtime item update allowlists. | Add focused route tests. |
| Authenticated manual request points items/folders at foreign records. | Cross-user relationship leakage or broken UI assumptions. | Ownership checks for item refs and folder parents. | Review area/project semantics after any model changes. |
| OAuth account-linking CSRF. | Wrong Google account linked to a user. | Signed state nonce and httpOnly nonce cookie. | Add tests around invalid/expired/reused state. |
| XSS or malicious browser extension reads local/offline data. | Private notes/tasks exposure. | Not solved by backend business rules. | CSP/review storage retention later. |
| Drive reconciliation drift. | Attachments not moved as expected. | Best-effort reconcile after moves/content scans. | Add status/repair visibility. |
| User AGENTS rules overwrite generated sync instructions. | Agents may lose baseline safety rules in synced workspaces. | `AGENTS.local.md` migration implemented in pull/diff. | Validate on an existing workspace before closing operationally. |

## Related Documents

- `docs/regras-de-negocio.md`: full business-rule inventory generated from the codebase.
- `docs/plans/agents-md-addendum.md`: implementation plan for generated `AGENTS.md` plus user `AGENTS.local.md`.
- `docs/plans/drive-attachments-e2e-checklist.md`: validation checklist for Google Drive attachment flows.

## Acceptance Criteria

- A client cannot fabricate an approved sync change by posting a full object to `/api/sync/push`.
- A manual item PATCH cannot write `userId`, `createdAt`, `syncHash`, `deletedAt`, or other non-allowlisted fields.
- A manual folder PATCH cannot write protected fields or move a folder below one of its descendants.
- New or updated items cannot reference folders, areas, projects, or parent items owned by another user.
- Type-check passes for the web app after changes.

## Risks and Follow-Ups

- The server still supports legacy `changes` payloads, but only uses their IDs.
- OAuth account-linking CSRF remains open until callback state is signed and verified.
- Rate limiting remains open for auth/token-related routes.
- Manual edit audit logging remains incomplete and should be designed with retention and privacy in mind.
