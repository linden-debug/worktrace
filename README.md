# WorkTrace

Enterprise work logging with first-class AI-agent integration. Team members sign in with Google Workspace, write structured daily logs, and let their AI agents submit logs automatically over REST or the Model Context Protocol (MCP).

## Features

- **Google Workspace sign-in** restricted to a single email domain.
- **Structured daily logs** — title, completed, in-progress, blockers, next plan.
- **Team search** — full-text (SQLite FTS5) search with member/date filters and cursor pagination.
- **Personal API keys** for programmatic submission (created in the console, `wtk_` prefix).
- **MCP HTTP server** plus a downloadable **Skill** so agents (Claude Code, Codex, …) can summarize raw notes and submit logs.
- **Admin console** — member roles, domain access control, global logs, and an audit trail.
- **Hardened ingestion** — idempotent writes, encrypted API-key secrets, bounded parsing, safe errors.
- **Bilingual UI** — English / 中文.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Auth.js (NextAuth v5) · better-sqlite3 (SQLite + FTS5) · Zod · MCP TypeScript SDK · Vitest

## Prerequisites

- Node.js 20+ (22 recommended)
- A [Google Cloud](https://console.cloud.google.com) project with an OAuth 2.0 **Web application** client

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` (see [Environment variables](#environment-variables)). At minimum set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ADMIN_EMAILS`.

### 3. Create a Google OAuth client

1. In Google Cloud Console, go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Choose **Web application**.
3. Add an **Authorized redirect URI**: `http://localhost:3000/api/auth/callback/google`.
4. Copy the **Client ID** and **Client secret** into `.env` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

### 4. Set your login domain

Sign-in is limited to a single email domain, defaulting to the placeholder `example.com`. Replace it with your own domain in:

- `src/auth.ts` — `allowedDomain`
- `src/lib/request-user.ts` — the `@example.com` suffix check
- `src/lib/development-user.ts` — the dev-only `@example.com` suffix check

Set your first admin's email in `ADMIN_EMAILS` (comma-separated). The first user matching it is granted the `ADMIN` role on login.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 and sign in with a Google account on the allowed domain. The SQLite database is created and migrated automatically on first run — no manual migration step is required.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `AUTH_SECRET` | Yes | — | Auth.js session secret. Generate with `openssl rand -base64 32`. |
| `AUTH_GOOGLE_ID` | Yes | — | Google OAuth client ID. |
| `AUTH_GOOGLE_SECRET` | Yes | — | Google OAuth client secret. |
| `ADMIN_EMAILS` | No | `linden@example.com` | Comma-separated admin emails. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public origin used to build MCP / Skill URLs. |
| `KEY_ENCRYPTION_SECRET` | Production | dev fallback | AES-256-GCM key for encrypting API-key secrets. |
| `LOCAL_DATABASE_PATH` | No | `worktrace-local.db` | SQLite file path. |
| `WORKTRACE_UPLOAD_DIR` | No | `./uploads/work-log-images` | Directory for log attachments. |

> The Prisma schema in `prisma/` is kept as a reference model for a future relational-database migration. The runtime app uses better-sqlite3 and does not require `prisma generate` or `DATABASE_URL`.

## REST API

Programmatic access uses personal API keys created in the console. Authenticate with `Authorization: Bearer wtk_<key>`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/work-logs` | Create a log (supports an `Idempotency-Key` header). |
| `GET` | `/api/v1/work-logs` | List logs. Filters: `query`, `authorId`, `from`, `to`, `cursor`, `limit`. |
| `POST` | `/api/v1/api-keys` | Create an API key (the secret is returned once). |
| `GET` | `/api/v1/api-keys` | List your API keys. |
| `PATCH` | `/api/v1/api-keys/:id` | Update a key's status (enable / disable / revoke). |
| `POST` | `/api/v1/api-keys/:id/reveal` | Reveal a key's secret (one-time). |

Admin endpoints (e.g. `/api/v1/admin/members`) require the `ADMIN` role.

## MCP integration

WorkTrace exposes a streamable-HTTP [MCP](https://modelcontextprotocol.io) server at `/mcp`, authenticated with the same API key.

Example MCP client configuration:

```json
{
  "mcpServers": {
    "worktrace": {
      "type": "http",
      "url": "https://your-domain/mcp",
      "headers": { "Authorization": "Bearer wtk_..." }
    }
  }
}
```

Tools:

| Tool | Description |
| --- | --- |
| `prepare_work_log` | Turn raw notes into a structured draft for user confirmation. |
| `create_work_log` | Create or replace today's log. |
| `update_work_log` | Update an existing log. |
| `list_work_logs` | Paged team summaries with filters. |
| `get_work_log` | Read one full log. |
| `get_daily_submission_status` | Submitted / missing members for a Shanghai date. |

A ready-to-use agent **Skill** (`SKILL.md`) is served at `/skill/worktrace`.

## Testing

```bash
npm test
```

## Deployment

A production image and reverse-proxy config are included.

```bash
docker compose up -d
```

The container serves Next.js on `127.0.0.1:16063`. See `deploy/Caddyfile.worktrace` for the Caddy reverse proxy and `deploy/worktrace.env.example` for the production variable set. In production set `AUTH_URL`, `AUTH_TRUST_HOST`, `NEXT_PUBLIC_APP_URL`, and `KEY_ENCRYPTION_SECRET`, and replace local file storage with your object storage.

## Project structure

```
src/
  app/            App Router pages and API/MCP routes
  components/     React components
  lib/            Domain logic: db, auth, api-keys, mcp, skill, …
server/           Standalone access-control reference server
prisma/           Reference Prisma schema
stitch-worktrace/ Design source (HTML mockups + design-system JSON)
docs/             Product, frontend, and backend requirements
deploy/           Caddyfile and production env example
```
