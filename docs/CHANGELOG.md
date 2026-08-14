# Changelog

## 0.1.1 — 2026-08-13 — PRD published

- Added `docs/PRD.md` — product requirements document (goals, personas, user
  journeys, functional/non-functional requirements, milestones with
  acceptance criteria, success metrics, risk owners, traceability to the
  whitepaper).
- README now links the **Whitepaper** and **PRD** in a "Key documents" block.

## 0.1.0 — 2026-08-13 — initial implementation of the v2.2 whitepaper

The previous `NextcloudPortableAgency` repository contents were removed and
replaced with the Empire Engine implementation specified by
`Empire_Engine_v2.2_Corrected.md` (preserved verbatim in `docs/WHITEPAPER.md`).

### Built (P0–P5 of the build plan)

**P0 — Meta-Harness skeleton, Empire creation, context.md system**
- `extension/src/core/EmpireManager.ts` — scaffold from `templates/empire/`,
  placeholder substitution, `.env` derivation from `.env.example`, fresh
  local OneCLI credentials, git init with identity fallback.
- `extension/src/core/ContextEngine.ts` — read/write/append `.empire/context.md`,
  handoff records, "What Is Next" replacement, context compaction.
- `extension/src/core/StateManager.ts` — `.empire/state.json` (last agent,
  sessions, services, stack status) with atomic writes.

**P1 — Worktrees, agent adapter pattern, context persistence across switches**
- `extension/src/core/WorktreeManager.ts` — per-agent git worktrees with
  `src/`, `design/`, `docs/` replaced by shared symlinks.
- `extension/src/agents/` — `AgentRegistry` (PATH discovery),
  `AgentSpawner`, `ContextInjector` (system prompt from context.md, injected
  via `EMPIRE_CONTEXT` + `CLAUDE.md`/`AGENTS.md`/`CONVENTIONS.md`), adapters
  for Claude Code, Codex, OpenCode, Aider.
- Switch flow records a `Handoff: a → b` entry so the next agent continues
  without loss.

**P2 — Dockge quick access, OpenDesign panel skeleton**
- `extension/src/dockge/DockgeLauncher.ts` — URL resolution + stack health,
  start-stack fallback prompts.
- `extension/src/opendesign/OpenDesignPanel.ts` + React webview — palette,
  canvas, drag-and-drop, property editor, token editor, page management.
- Empire Explorer activity-bar view; Dashboard webview with
  services/agents/context overview and one-click actions.

**P3 — OneCLI sidecar, secret injection, placeholder system**
- `onecli/` service — forward proxy, placeholder swapping (template + bare
  forms), default-deny policy, AES-256-GCM vault, key rotation, structured
  audit, alert thresholds, admin API.
- `extension/src/onecli/` — REST client, SecretManager (host SecretStorage),
  audit viewer; `Empire: Register Secret` command.

**P4 — OpenDesign design-to-code pipeline**
- `design/tokens.json`, `design/pages/*.json`, `design/components/`,
  `design/themes/` data model.
- `CodegenEngine` — deterministic generation of `src/website/generated/`
  (tokens.css, components.jsx, theme.js, pages/*.jsx); `CodeSync` watcher
  regenerates on design changes; `Empire: Generate Code From Design`.

**P5 — Export/Import, portability, documentation**
- `extension/src/utils/zip.ts` — dependency-free ZIP writer/reader with
  zip-slip protection.
- `ExportManager` — export strips `.env`, vault, worktrees, node_modules
  (configurable for logs/data/git); import restores `.env` from
  `.env.example`, re-inits git when history was excluded.
- `templates/empire/` — the full §2.2 hierarchy with docs, service READMEs,
  VS Code tasks, example compose for n8n/EspoCRM/ERPNext/nginx.

### Testing

- `onecli`: 28 tests — yaml subset parser, encryption/vault/rotation,
  swapper, policy, admin API, end-to-end proxy (real socket round-trips,
  deny/miss/swap audit verification).
- `extension`: 33 tests — context engine, Empire creation/validation,
  export→import round-trip with secret stripping, zip + zip-slip, worktree
  spawn with shared symlinks, spawn/handoff with a fake VS Code host, agent
  discovery on a fake PATH, SecretManager, design codegen.

All run headless with `node --test` — no VS Code instance required.

### Deviations from the whitepaper (with rationale)

| Deviation | Rationale |
|-----------|-----------|
| **OneCLI implemented in TypeScript (Node), not Rust** | The build environment has no Rust toolchain and no crates.io access. The module layout, config format, wire API, and data formats mirror the Rust hierarchy in §12 exactly; a Rust port remains a drop-in replacement. Zero runtime dependencies. |
| OneCLI vault keyed by a **per-host master key** injected as an env var, with a per-Empire admin-token pin | The whitepaper says "Other Empires have separate vaults"; we get that by construction (each Empire has its own vault file) while keeping a single secret in host SecretStorage. |
| `.env` is **derived from `.env.example`** at scaffold/import time rather than shipped | `.env` is gitignored by design; shipping it in the template would risk committing real values. |
| Context compaction summarizes rather than delegating to a model | Deterministic, dependency-free, and sufficient to bound the file (risk #1 mitigation). |
| OpenDesign codegen is a deterministic generator + agent review, not agent-only generation | Guarantees the canvas is always representable as real, runnable code (risk "OpenDesign generates poor code"). |
| Worktree symlinks point at the **shared** `src/`/`design/` trees, replacing the committed snapshot copies | Matches §2.2's "symbolic link to shared source"; the worktree branch still isolates everything else the agent writes. |

### Known limitations (next milestones)

- No .vsix packaging pipeline yet (`npx @vscode/vsce package` once available).
- OneCLI image tag `ghcr.io/empire-engine/onecli:0.1.0` is documented in
  compose but not published — build locally from `onecli/` (Dockerfile
  included).
- Dockge is launched in an external browser (webview integration is a
  follow-up; the launcher already handles URL + stack state).
- Context summarization is structural (keep N entries), not semantic.
- OpenDesign themes (light/dark variants) are defined but the theme switcher
  UI is a follow-up.
