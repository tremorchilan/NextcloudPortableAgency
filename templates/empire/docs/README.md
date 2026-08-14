# {{EMPIRE_NAME}}

A sovereign Empire unit: a folder that contains running services, source code,
design assets, and automation workflows — shaped by AI agents that share one
memory (`.empire/context.md`).

## Quick start

1. Start the stack: `docker compose up -d` (or **Empire: Start Stack** in VS Code).
2. Open Dockge at http://127.0.0.1:5001 and install the services this Empire needs.
3. Register real API keys: **Empire: Register Secret** (stored in OneCLI's vault).
4. Spawn an agent: **Empire: Spawn Agent** — it reads `.empire/context.md` and gets to work.
5. Export: **Empire: Export Empire (.zip)** — the vault never travels with it.

## Folder map

| Path | Purpose |
|------|---------|
| `.empire/` | Shared memory: context.md, state.json, manifest.json |
| `docker-compose.yml` | Stack definition (Dockge manages it during setup; agents edit it during sessions) |
| `src/` | Source code (website, dashboard, api, shared) |
| `design/` | OpenDesign assets (tokens, components, pages, themes) |
| `services/` | Per-service configuration |
| `workflows/` | n8n workflow exports |
| `data/` | Persistent service volumes (survives export, excluded from git) |
| `logs/` | Audit & debug logs (optional in exports) |

See the Empire Engine whitepaper (`docs/WHITEPAPER.md` in the repo) for the
full architecture.
