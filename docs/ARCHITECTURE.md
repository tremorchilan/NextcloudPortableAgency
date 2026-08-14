# Architecture

How the pieces of Empire Engine fit together, and the contracts between them.

## Components and their contracts

### 1. Meta-Harness (VS Code extension, `extension/`)

The cockpit. All orchestration logic lives behind a `Host` façade
(`src/core/types.ts`) so the entire core is unit-testable without VS Code.

Core services (mirroring whitepaper §11):

- **EmpireManager** — creates an Empire from `templates/empire/`, substitutes
  `{{EMPIRE_NAME}}`-style placeholders, derives a gitignored `.env` from
  `.env.example`, generates fresh local OneCLI credentials, and initializes
  git (with a local identity fallback so the scaffold commit always lands).
- **ContextEngine** — reads/writes `.empire/context.md`. Activities are
  appended as `- [agent, timestamp] action` under `## What Was Done Last`;
  handoffs are recorded as `- [meta-harness, …] Handoff: a → b`. `compact()`
  bounds the file (risk register #1).
- **WorktreeManager** — `git worktree add -b empire/<agent> worktrees/<agent>`
  and replaces the committed `src/`, `design/`, `docs/` snapshots with
  symlinks to the shared trees, so every agent edits the same real files.
- **StateManager** — `.empire/state.json`: last agent, session counts,
  service status, stack status. Atomic writes.
- **AgentSpawner + ContextInjector** — the spawn/switch flow:

  ```
  spawn(agent) =
    worktrees.spawn()                      # isolated branch + symlinks
    injector.inject()                      # build system prompt from context.md
       → writes .empire-context.md + CLAUDE.md / AGENTS.md / CONVENTIONS.md
       → sets EMPIRE_CONTEXT, EMPIRE_PATH, EMPIRE_ID, EMPIRE_AGENT env vars
    terminal = host.createTerminal(cwd=worktree, env=…)
    state.recordAgentSession()             # lastAgent, session count
    if previous agent: context.recordHandoff(previous → new)
  ```

  Because the context file is re-read at every spawn, switching agents is
  stateless: the next agent always starts from the freshest memory.
- **ExportManager** — dependency-free ZIP writer/reader. Always excludes
  `.env`, `worktrees/`, `data/onecli/vault.enc`, `node_modules/`; optionally
  excludes `logs/`, `data/`, `.git/`. Import re-derives `.env` from
  `.env.example`, re-initializes git when history was excluded, and protects
  against zip-slip.
- **DockgeLauncher** — resolves Dockge's URL and checks container state;
  Dockge itself runs as-is inside the Empire (never reimplemented).
- **SecretManager** — keeps the OneCLI master key + admin token in VS Code
  SecretStorage; injects them as env vars when starting the stack. Never
  written into `.env` (a per-Empire admin-token pin is the only override).
- **OpenDesign** — panel webview (React, bundled by esbuild) reads/writes
  `design/tokens.json` and `design/pages/*.json`; `CodegenEngine`
  deterministically generates `src/website/generated/` (tokens.css,
  components.jsx, theme.js, pages/*.jsx); `CodeSync` watches `design/` and
  regenerates on change. The pipeline is a two-step: generator → agent review.

### 2. OneCLI (`onecli/`)

The secret guardian, running inside the Empire's Docker network (whitepaper
§5, §12). A single Node process, zero runtime dependencies:

- **Forward proxy** (`/vault → /proxy` module split per §12):
  services send absolute-form requests with `X-OneCLI-Service: <name>` and
  placeholders in headers/bodies.
- **Swapper** — two matching forms:
  - template: `{{NAME}}` anywhere in a header value or JSON/text body
  - bare: an exact `NAME` value (e.g. `Authorization: Bearer OPENAI_API_KEY`,
    or an exact string value in JSON)
- **Policy** — YAML-driven, default **deny**. Each service lists its allowed
  placeholders and an optional token (`X-OneCLI-Token`).
- **Vault** — one AES-256-GCM blob (SHA-256-derived key, random 12-byte
  nonce per encryption, atomic tmp+rename writes). Rotation generates fresh
  secrets and audits the event.
- **Audit** — one JSON event per line: `deny`, `miss`, `swap`, `register`,
  `rotate`, `alert`, `policy_reload`, `upstream_error`. Alert thresholds per
  minute raise `alert` events.
- **API** (admin-token bearer auth): `/health`, `/api/vault/keys`,
  `/api/vault/keys/:placeholder`, `/api/vault/rotate`, `/api/audit`,
  `/api/policy`, `/api/policy/reload`.

#### Failure semantics

- Header placeholder **denied by policy** → `403`, upstream never contacted.
- Header placeholder **missing from vault** → `502` (a needed secret must
  never be sent upstream as a literal placeholder).
- Body placeholder missing/denied → left untouched, audited, alerted
  (bodies are data; callers receive the upstream's own 401/4xx).
- Unknown service, missing `X-OneCLI-Service`, bad token → `403` + audit.

### 3. Empire template (`templates/empire/`)

The sovereign folder (whitepaper §2.2). Key properties:

- `.empire/context.md` — shared memory, human- and machine-readable.
- `docker-compose.yml` — starts with Dockge + OneCLI only; the rest is
  installed via Dockge during setup, and agents edit compose during sessions.
- `.env.example` ships placeholders; the real `.env` is derived at scaffold
  time, gitignored, and never exported.
- `services/onecli/policy.yaml` — mounted into the OneCLI container.
- `data/` survives export; `logs/`, `worktrees/`, `.env` never do.
- The OneCLI image is `ghcr.io/empire-engine/onecli:0.1.0`; compose also
  documents how to `build:` it locally from `services/onecli/`.

## Request examples

```bash
# OneCLI as an HTTP proxy for a service (absolute-form request):
curl -x http://onecli:8080 \
     -H 'X-OneCLI-Service: hermes' \
     -H 'Authorization: Bearer {{OPENAI_API_KEY}}' \
     -d '{"model":"gpt-4","key":"{{OPENAI_API_KEY}}"}' \
     https://api.openai.com/v1/chat/completions

# Meta-Harness API (admin token):
curl -H 'Authorization: Bearer <admin-token>' \
     -X PUT http://127.0.0.1:58080/api/vault/keys/OPENAI_API_KEY \
     -d '{"value":"sk-…","services":["hermes"]}'
```

## Performance targets vs. implementation

| Goal | Target | Implementation note |
|------|--------|---------------------|
| Create an Empire | < 10 s | Scaffold is a local copy + git init; typically well under 2 s |
| Spawn agent | < 5 s | Worktree add + prompt injection is IO-bound |
| Switch agents | < 3 s | Same path; context is re-read, nothing is rebuilt |
| Export/Import | < 1 / < 2 min | Streaming zip, deflate level 9 |

## Testing

- `onecli`: 28 tests — yaml, encryption/vault, swapper, policy, API, and a
  real end-to-end proxy run against a fake upstream.
- `extension`: 33 tests — context engine, Empire create/validate, export →
  import round-trip (secrets stripped), zip safety (incl. zip-slip), worktree
  spawn with symlinks, agent spawn/handoff with a fake host, registry
  discovery against a fake PATH, SecretManager, codegen.
