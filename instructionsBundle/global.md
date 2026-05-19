# Backe.co — Regras Globais

Backe.co uses Paperclip as its operating system for websites, APIs, automations, client solutions, commercial workflows, repositories, and agents.

The active company goal is the source of truth. Every task must stay aligned with the current goal.

Use Portuguese when communicating with Pedro. Use English for code, filenames, commits, branches, and technical identifiers when appropriate.

Be concise. Do not repeat stable company context in every response. Do not inspect repositories, files, logs, or long histories unless the current issue explicitly requires it.

Protect secrets, API keys, tokens, credentials, webhook URLs, private client data, and environment variables.

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
