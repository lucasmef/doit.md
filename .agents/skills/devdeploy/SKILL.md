---
name: devdeploy
description: Investigate, repair, and verify doit.md development gates and production deploys. Use when Codex needs to debug GitHub Actions checks, dev branch gates, main production deploys, VPS runtime failures, or CI/CD rollout issues for this repository.
---

# DevDeploy

Use this skill to recover failed deploy or CI/CD flows for `doit.md` with direct evidence, small fixes, and end-to-end verification.

## Project Contract

- Active flow: `dev local -> dev git -> main git -> main vps`.
- `dev` is local development plus GitHub gates only. Do not assume a persistent dev environment on the VPS.
- Production deploy runs from `main` to the VPS runtime at `/srv/doit/prod/app`.
- CI gates run on GitHub-hosted runners. The self-hosted VPS runner is reserved for production deploy.
- Production healthcheck is `http://127.0.0.1:8110/api/health` from the VPS.
- Real runtime environment values live outside the repo at `/srv/doit/prod/doit-config/web.env`.
- Never expose secrets from logs, env files, process listings, GitHub output, or SSH sessions.

## When To Use

Use this skill for:

- failing `dev` quality or security gates
- failing GitHub Actions deploy runs
- failed production rollout from `main`
- VPS runtime errors for `doit.service`
- Nginx, systemd, port, memory, disk, permission, or env drift affecting deploy
- verifying that a previously failed deploy is now healthy

Do not use this skill for ordinary frontend/UI work unless the issue is blocking CI or deploy.

## Workflow

1. Establish local and GitHub context:
   - Run `git status --short --branch`.
   - Run `gh auth status`.
   - Run `gh repo view --json nameWithOwner,url,defaultBranch`.
   - Identify the branch, failing run, PR, commit, deploy URL, or user-provided failure source.

2. Collect GitHub evidence:
   - Run `gh run list --branch <branch> --limit 10`.
   - Inspect the failing run with `gh run view <run-id> --log-failed`.
   - If output is incomplete, download logs with `gh run download <run-id> --dir <tmp-log-dir>`.
   - Search downloaded logs with `rg -n "error|failed|exception|timeout|denied|not found|cannot|ELIFECYCLE|ERR!|SIGKILL" <tmp-log-dir>`.
   - Inspect job metadata with `gh run view <run-id> --json status,conclusion,name,event,headBranch,headSha,jobs`.

3. Reproduce locally when useful:
   - Use the same command that failed in CI whenever possible.
   - Prefer repository commands from `docs/CONTEXT.md` and package scripts:
     - `pnpm lint`
     - `pnpm type-check`
     - `pnpm build`
     - `pnpm --filter @doit/web build`
     - `pnpm --filter @doit/web type-check`
   - Fix the smallest root cause that explains the failing gate or deploy.
   - Preserve unrelated local changes.

4. Use the VPS only when it can add deploy/runtime evidence:
   - SSH target: `ssh salomao-vps`.
   - Start read-only:
     - `pwd`
     - `ls -la /srv/doit/prod/app`
     - `systemctl status doit.service --no-pager`
     - `journalctl -u doit.service -n 200 --no-pager`
     - `curl -fsS http://127.0.0.1:8110/api/health`
     - `df -h`
     - `free -h`
     - `nginx -t`
   - Do not edit server files, restart services, change env vars, or run migrations until evidence points to that action and the blast radius is understood.

5. Repair and redeploy:
   - If the fix requires source changes, make the narrowest code/config change.
   - If the user asked for end-to-end repair and push is needed, commit and push only relevant files.
   - Watch GitHub reruns with `gh run watch <run-id> --exit-status`.
   - For production deploy issues, verify that the `main` deploy run succeeds before checking runtime health.

6. Verify success:
   - Confirm the failing GitHub run or replacement run concludes with `success`.
   - For production, SSH to the VPS and run `curl -fsS http://127.0.0.1:8110/api/health`.
   - Check `journalctl -u doit.service -n 200 --no-pager` for recurring runtime errors after the deploy.
   - If web behavior was affected, run the app locally or verify the affected route as required by BuilderFlow.

## Safety Rules

- Do not run destructive git commands such as `git reset --hard`, force pushes, or branch rewrites unless explicitly requested.
- Do not delete databases, runtime files, logs, backups, uploaded data, or server directories without explicit confirmation.
- Do not print real `.env`, `DATABASE_URL`, OAuth secrets, cookies, tokens, private keys, or user data.
- Redact sensitive values in summaries.
- Treat changes to deploy architecture, branch workflow, production runtime strategy, or server topology as architectural and require ADR/user confirmation.

## Exception Format

When blocked by something only the user can do, respond with:

```md
**EXCEPTION_REQUIRED**
Blocking action: <exact action needed from the user>
Why: <short evidence-backed reason>
Where: <URL, command, approval screen, credential, or file>
After you do this: <what Codex will run next>
```

Use this only for real blockers such as expired `gh` auth, missing SSH access, required GitHub environment approval, missing secret values, payment/quota limits, protected branch permissions, or a production-risk action requiring explicit consent.

## Completion Criteria

Finish only after reporting:

- original failing run/deploy and root cause
- fix made, including changed files or server/config action
- verification commands and successful run/deploy identifier
- production healthcheck result when production deploy was involved
- residual risk or follow-up that is not blocking the deploy
