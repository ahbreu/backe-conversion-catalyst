# Backe.co — Regras Globais

Backe.co uses Paperclip as its operating system for websites, APIs, automations, client solutions, commercial workflows, repositories, and agents.

The active company goal is the source of truth. Every task must stay aligned with the current goal.

Use Portuguese when communicating with Pedro. Use English for code, filenames, commits, branches, and technical identifiers when appropriate.

Be concise. Do not repeat stable company context in every response. Do not inspect repositories, files, logs, or long histories unless the current issue explicitly requires it.

Protect secrets, API keys, tokens, credentials, webhook URLs, private client data, and environment variables.

## Git Policy — HARD RULES (never bypass)

**NEVER run `git push` under any circumstance.** Pedro reviews and pushes manually.

**NEVER run `git push --force`, `git reset --hard`, or any destructive git operation.**

You MAY:
- Read files, edit files, create files
- Run `git add` and `git commit` (local only)
- Run tests and build commands

After committing locally, post the commit hash and a summary of what changed in the issue comment, then hand off to the CTO for review. Pedro decides when to push.

If a task requires deploying or publishing — stop, comment on the issue describing what is ready and what command Pedro needs to run, and set the issue to `in_review`.

Prefer small executable issues over broad tasks.

When creating or refining an issue, include:
- Objective
- Context
- Scope
- Acceptance criteria
- Recommended owner
- Risk level

## Anti-Loop Policy

**Always allowed, regardless of task type:**
- Calling the Paperclip API (`$PAPERCLIP_API_URL`) to post comments, update issue status, create child issues, or write plan documents. This is mandatory for completing any task.

For comment-only, bootstrap-check, diagnostic, or lightweight coordination tasks:
- Do not inspect repositories.
- Do not create files.
- Do not call external APIs (n8n, Evolution, etc.) unless the task explicitly requires it.
- Do not search for alternative tools.
- Do not create fallback documentation.
- Do not convert the task into a larger plan.
- Answer only what was requested.
- Stop immediately after producing the requested answer.

When a required external service (not the Paperclip API) is unavailable:
- Report the limitation in one sentence only if it blocks the requested task.
- Do not search for alternative tools.
- Do not create fallback files.
- Do not keep trying.
- Stop after the requested output.

If the issue asks for a short answer, the correct completion is a short issue comment. No durable artifact is required.

## Progress Visibility (mandatory for all agents)

Every time you work on an `in_progress` issue, you MUST post a progress comment before exiting the heartbeat. This is required even if you made no changes — explain why.

Minimum comment format:
```
## Status: {o que foi feito neste heartbeat}

- Feito: {lista do que avançou}
- Próximo: {próxima ação concreta}
- Bloqueio: {se houver — o que impede e quem precisa agir}
```

If you are blocked, ALWAYS set the issue to `blocked` and name the exact unblock action and responsible party. Never leave an issue `in_progress` if you cannot make progress.

If you are resuming after a gap (no comment from you in the last 2 heartbeats), post a brief re-orientation comment explaining where you are and what comes next.
