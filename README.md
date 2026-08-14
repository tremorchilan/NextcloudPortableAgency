# Empire Engine

**Sovereign Folder-Centric Orchestration Architecture** — v2.2 (implemented)

📄 **Key documents**
- **[Whitepaper (v2.2)](docs/WHITEPAPER.md)** — the reconciled architecture: what the system does, where everything lives, the two phases, context persistence, security, and the build plan.
- **[Product Requirements Document (PRD)](docs/PRD.md)** — goals, personas, user journeys, functional & non-functional requirements, milestones with acceptance criteria, and success metrics.
- [Architecture](docs/ARCHITECTURE.md) · [Setup & development](docs/SETUP.md) · [Changelog & deviations](docs/CHANGELOG.md)

Empire Engine turns any folder on your computer into a complete digital
environment — a business, a homelab, a dev stack — that lives inside Docker
and is shaped by AI agents. Create a folder named `shop-alpha` and it becomes
a sovereign unit containing running services, source code, design assets, and
automation workflows. Zip it, send it to someone else, and they run
`docker compose up` to inherit everything exactly as you left it.

## The three pieces

| Piece | What it is | Where it lives |
|-------|-----------|----------------|
| **Meta-Harness** | VS Code extension — the cockpit. Creates Empires, spawns system agents (Claude Code / Codex / OpenCode / Aider) in isolated git worktrees with `.empire/context.md` injected into their system prompt, hosts the OpenDesign side panel, talks to Dockge and OneCLI. | `extension/` — on the host |
| **OneCLI** | The secret guardian — an HTTP forward proxy inside the Empire's Docker network that swaps `PLACEHOLDER_*` keys for real keys at runtime. AES-256-GCM encrypted vault, per-service policy (default deny), structured audit trail. | `onecli/` — runs inside the Empire |
| **Empire template** | The sovereign folder skeleton: shared memory (`.empire/`), stack definition, design tokens, service configs, workflows, docs, gitignore that keeps secrets out. | `templates/empire/` — copied into every new Empire |

## The two phases

**Setup (GUI).** You create an Empire from VS Code, open Dockge's app store in
a browser, and point-and-click install n8n, EspoCRM, ERPNext — whatever the
environment needs. Dockge manages `docker-compose.yml` during this phase.

**Session (agents).** You spawn an agent. It reads `.empire/context.md` — what
we're building, what was done last, what's next — and gets to work in its own
worktree, editing source, service config, and compose directly. When Claude
runs out of quota, you switch to Codex: the same context file is injected, and
Codex continues exactly where Claude stopped. No lost progress. No repeated
explanations.

```
VS Code (cockpit)                shop-alpha/ (the engine)
┌─────────────────────┐          ┌──────────────────────────────┐
│ Meta-Harness        │  spawns  │ .empire/context.md  ← memory │
│ ├ Empire Explorer   │─────────▶│ docker-compose.yml ← stack   │
│ ├ OpenDesign panel  │  design  │ src/  design/  workflows/    │
│ ├ Dockge launcher   │  secrets │ data/  services/  logs/      │
│ └ OneCLI SecretMgr  │─────────▶│ OneCLI (vault, proxy, audit) │
└─────────────────────┘          └──────────────────────────────┘
        │                               ▲
        └── system agents ── worktrees/<agent>/ (ephemeral, isolated)
            Claude · Codex · OpenCode · Aider   src/→../../src (symlink)
```

## Repository layout

```
empire-engine/
├── extension/          Meta-Harness VS Code extension (TypeScript)
│   ├── src/core/       EmpireManager, ContextEngine, WorktreeManager,
│   │                   StateManager, ExportManager          (§11 of the whitepaper)
│   ├── src/agents/     AgentRegistry, AgentSpawner, ContextInjector, adapters
│   ├── src/onecli/     OneCLIClient, SecretManager, AuditViewer
│   ├── src/opendesign/ OpenDesignPanel, CodegenEngine, CodeSync
│   ├── src/dockge/     DockgeLauncher
│   ├── src/ui/         Empire Explorer, Dashboard webview, commands
│   └── test/           unit tests (node:test, no VS Code required)
├── onecli/             OneCLI secret guardian (TypeScript, zero runtime deps)
│   ├── src/vault/      encryption (AES-256-GCM), storage, rotation
│   ├── src/proxy/      interceptor, swapper, policy
│   ├── src/audit/      logger, alert
│   ├── src/api/        routes, models   (mirrors the Rust hierarchy in §12)
│   ├── config/         default.yaml
│   └── test/           unit + end-to-end proxy tests
├── templates/empire/   the Empire folder skeleton (§2.2)
└── docs/               whitepaper, architecture, changelog, setup
```

## Try it

Everything runs on Node ≥ 20. The sandbox-friendly path:

```bash
npm install --workspaces     # hoists dev deps for both workspaces
npm run verify               # builds extension + onecli, runs all tests
```

Real usage:

1. **OneCLI standalone:** `cd onecli && npm run build && ONECLI_MASTER_KEY=$(openssl rand -hex 32) ONECLI_ADMIN_TOKEN=$(openssl rand -hex 24) node dist/main.js`
   then exercise the API or point a service's `HTTP_PROXY` at it (see
   [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for request examples).
2. **Meta-Harness extension:** open `extension/` in VS Code and press F5
   (Extension Development Host). Run **Empire: Create New Empire**, then
   **Empire: Spawn Agent**, **Empire: Open Dockge**, **Empire: Export Empire**.
3. **Empire folder by hand:** copy `templates/empire/` anywhere, replace the
   `{{…}}` placeholders, then `docker compose up -d` with `services/onecli/`
   pointed at this repo's `onecli/` build.

## Security model

- Services reference secrets only as `PLACEHOLDER_NAME` or `{{PLACEHOLDER_NAME}}`.
- OneCLI's vault is a single AES-256-GCM blob, keyed by a master key that
  Meta-Harness keeps in the host's SecretStorage and injects at container
  start. The real key never touches disk inside the Empire.
- Policy is default-deny per service; denials, misses, and swaps are audited
  (`logs/audit.jsonl`, plus `/api/audit`).
- Export strips `.env` and the vault automatically. A stolen folder contains
  only placeholders; a new owner starts with an empty vault.

## Status & deviations

This build covers P0–P5 of the build plan (scaffolding, worktrees + handoffs,
Dockge access, OneCLI, OpenDesign → code, export/import) as a working v0.1.0.
Known deviations from the whitepaper — including OneCLI being implemented in
TypeScript rather than Rust — are documented in [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
with rationale.

**Remember:** VS Code is the cockpit, not the engine. The folder is the
engine. Context is everything. The folder is sovereign.
