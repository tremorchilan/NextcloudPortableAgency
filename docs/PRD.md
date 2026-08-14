# Empire Engine — Product Requirements Document

**Document version:** 1.0
**Date:** August 13, 2026
**Status:** Implemented (v0.1.0) — see `docs/CHANGELOG.md`
**Companion document:** [`docs/WHITEPAPER.md`](WHITEPAPER.md) (Empire Engine v2.2)

---

## 1. Summary

Empire Engine turns any folder on a computer into a complete digital
environment — a business, a homelab, a dev stack — that lives inside Docker
and is shaped by AI agents. A folder named `shop-alpha` becomes a **sovereign
unit**: running services, source code, design assets, and automation
workflows, all inheritable by anyone who unzips it and runs
`docker compose up`.

The system has two phases:

- **Setup (GUI):** the user browses a self-hosted app store (Dockge) running
  inside the folder and point-and-click installs services.
- **Session (agents):** system agents (Claude Code, Codex, OpenCode, Aider)
  run against the folder with a shared memory file (`.empire/context.md`)
  injected into their system prompt, so switching agents loses zero progress.

A side panel (OpenDesign) provides visual design that generates real code, and
a secret guardian (OneCLI) keeps real API keys out of the folder entirely.

## 2. Problem statement

Today, a "project" is scattered: code lives in git, services in a cloud
account, credentials in a password manager, automations in someone's n8n
instance, and design in a SaaS tool. Nothing is **portable**, nothing is
**sovereign**, and AI agents working on a project have no shared memory —
switching tools means repeating yourself.

Empire Engine collapses all of that into one folder with clear ownership
boundaries and a persistent context file that makes agents interchangeable.

## 3. Goals & non-goals

### Goals

| ID | Goal |
|----|------|
| G1 | One folder = one complete environment: services, code, design, workflows, docs, data. |
| G2 | Agent switching without context loss: the next agent always starts from the freshest shared memory. |
| G3 | Secrets never touch disk inside the folder; placeholders only. |
| G4 | Export = zip; import = unzip + `docker compose up`. No lock-in, no cloud. |
| G5 | Visual design (OpenDesign) that produces a real, editable codebase. |
| G6 | Fast: create <10 s, spawn agent <5 s, switch <3 s, export <1 min, import <2 min. |

### Non-goals

- Not a cloud service. Everything runs on the user's machine and in their folder.
- Not an agent runtime. We orchestrate existing agents (Claude Code, Codex,
  OpenCode, Aider); we never bundle or reimplement them.
- Not a replacement for Dockge, n8n, EspoCRM, or ERPNext — they run as-is inside the Empire.
- Not a Figma clone. OpenDesign is a folder-local, code-first design tool.

## 4. Personas

| Persona | Who they are | Primary need |
|---------|-------------|--------------|
| **Agency owner** | Runs a small web agency. Spins up a business stack per client. | One folder per client, hand the whole environment to a contractor, get it back with everything inside. |
| **Solo maker** | Ships a shop or SaaS with automations and a CRM. | Set up once via GUI, then let agents iterate without re-explaining. |
| **Homelab tinkerer** | Runs services for fun and self-hosting. | Per-project isolation; folders they can archive, share, delete. |
| **AI power user** | Rotates between Claude Code, Codex, and OpenCode daily. | Quota runs out → switch tools → continue exactly where they stopped. |
| **Receiver** | Imports someone else's Empire zip. | One command to run it; register their own keys and go. |

## 5. User journeys

### 5.1 Create and set up an Empire (setup phase)

1. In VS Code, run **Empire: Create New Empire**, name it `shop-alpha`, pick a parent folder.
2. The extension scaffolds the full hierarchy (§2.2 of the whitepaper) and
   initializes git. Under 10 seconds.
3. User clicks **Empire: Open Dockge** — Dockge's app store opens in a browser.
4. User installs n8n, EspoCRM, ERPNext from the store. Dockge writes compose
   config, creates `./data/` volumes, starts containers.
5. User verifies health, creates admin accounts, registers real API keys via
   **Empire: Register Secret** (stored only in OneCLI's vault).

### 5.2 Run a session (agent phase)

1. User clicks **Empire: Spawn Agent** and picks Claude Code.
2. A terminal opens scoped to `worktrees/claude/` with `.empire/context.md`
   injected into Claude's system prompt.
3. Claude edits source in `src/`, configures services, creates n8n workflows,
   and appends to `.empire/context.md` after each significant action.
4. Claude hits its quota. User clicks **Empire: Switch Agent** and picks Codex.
5. Codex reads the updated context — including a recorded
   `Handoff: claude → codex` entry — and continues mid-task without loss.

### 5.3 Export and hand over

1. User clicks **Empire: Export Empire (.zip)**. The vault and `.env` are
   stripped automatically; source, design, workflows, docs, and (optionally)
   data survive.
2. The zip is sent to a receiver, who runs **Empire: Import Empire (.zip)**
   (or unzips manually), starts the stack, and registers their own keys.
   `.env` is restored from `.env.example` (placeholders only).

### 5.4 Design visually

1. User opens the **OpenDesign** panel, drags components onto the canvas, and
   edits design tokens.
2. Changes persist to `design/`; the watcher regenerates
   `src/website/generated/` automatically (or on **Empire: Generate Code From Design**).
3. The result is real, editable React code + CSS custom properties.

## 6. Functional requirements

Priorities: **P0** critical · **P1** high · **P2** medium.

### 6.1 Empire lifecycle

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Create an Empire folder from the bundled template with placeholder substitution (`{{EMPIRE_NAME}}`, `{{EMPIRE_ID}}`, …) and git init. | P0 |
| FR-1.2 | The template must produce the exact §2.2 hierarchy: `.empire/`, `docker-compose.yml`, `.env.example`, `.gitignore`, `.vscode/`, `worktrees/` (ephemeral), `src/`, `design/`, `services/`, `workflows/`, `data/`, `logs/`, `docs/`. | P0 |
| FR-1.3 | Opening an existing Empire validates `.empire/manifest.json` and restores last-session state. | P0 |
| FR-1.4 | Deleting an Empire removes the folder (after explicit user confirmation in the UI flow). | P2 |

### 6.2 Context persistence (the shared memory)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | `.empire/context.md` holds the canonical sections: What We Are Building, Service Map, What Was Done Last, What Is Next, Key Decisions, Anti-Patterns to Avoid. | P0 |
| FR-2.2 | Every agent spawn injects the full context file into the agent's system prompt (`EMPIRE_CONTEXT` env var + the agent's standing-context file: `CLAUDE.md` / `AGENTS.md` / `CONVENTIONS.md`). | P0 |
| FR-2.3 | Agents append activities as `- [agent, timestamp] action`; the extension records handoffs (`Handoff: a → b`) on switches. | P0 |
| FR-2.4 | Context compaction keeps the file bounded (keep newest N entries, summarize the rest). | P1 |
| FR-2.5 | `.empire/state.json` tracks last agent, session counts, service status, and stack status, with atomic writes. | P1 |

### 6.3 Agent orchestration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Spawn agents in isolated git worktrees (`worktrees/<agent>/`, branch `empire/<agent>`), with `src/`, `design/`, `docs/` symlinked to the shared trees. | P0 |
| FR-3.2 | Adapters for Claude Code, Codex, OpenCode, Aider; discover them on PATH (plus user-configured extra paths). | P0 |
| FR-3.3 | Spawning an unavailable agent must fail with actionable guidance, never silently. | P0 |
| FR-3.4 | Switching agents reads the freshest context and records the handoff. | P0 |

### 6.4 Setup phase (Dockge)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | The scaffolded stack starts with Dockge + OneCLI only; everything else is installed via Dockge. | P0 |
| FR-4.2 | **Empire: Open Dockge** resolves Dockge's URL, checks stack health, offers to start the stack, and opens the UI. | P1 |
| FR-4.3 | Phase separation: Dockge manages compose during setup; agents edit compose directly during sessions (documented, enforced by convention and context rules). | P1 |

### 6.5 OneCLI — secrets

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Services reference secrets only as `PLACEHOLDER_NAME` / `{{PLACEHOLDER_NAME}}`; OneCLI swaps them at request time. | P0 |
| FR-5.2 | Vault is a single AES-256-GCM blob keyed by a host master key injected at container start; real keys never touch disk in the folder. | P0 |
| FR-5.3 | Policy is default-deny per service (allowed placeholders + optional service token). | P0 |
| FR-5.4 | Unresolved header placeholders fail loudly (502) and are never forwarded literally; policy denials return 403 before contacting upstream. | P0 |
| FR-5.5 | Structured audit trail: swap, deny, miss, register, rotate, alert events — viewable via **Empire: View OneCLI Audit Log**. | P1 |
| FR-5.6 | Key registration and rotation from the Meta-Harness UI (values never echoed back unmasked). | P1 |
| FR-5.7 | Export strips `.env` and the vault automatically; imports start with an empty vault. | P0 |

### 6.6 OpenDesign

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Side-panel canvas: component palette, drag-and-drop, selection, property editing. | P1 |
| FR-6.2 | Design data model in `design/`: tokens, pages, components, themes. | P1 |
| FR-6.3 | Deterministic generation of real code into `src/website/generated/` (components, pages, CSS custom properties). | P1 |
| FR-6.4 | File watcher regenerates on design changes; manual **Generate Code From Design** command. | P2 |
| FR-6.5 | Generated code must always be real, editable source (agents may refine it before commit). | P1 |

### 6.7 Export / import

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Export to a single zip; import restores the folder, re-derives `.env` from `.env.example`, and re-initializes git when history was excluded. | P1 |
| FR-7.2 | Configurable inclusion of `data/`, `logs/`, `.git/`; `worktrees/`, `node_modules/`, `.env`, and the vault are always excluded. | P1 |
| FR-7.3 | Zip-slip protection on import; clear errors for non-Empire archives. | P1 |

### 6.8 UX surface

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | Empire Explorer activity-bar view: Empire identity, services, agents, quick-open of context.md and docker-compose.yml. | P1 |
| FR-8.2 | Dashboard webview: stack status, service table, agent list with spawn buttons, context tail, Dockge/OneCLI URLs. | P2 |
| FR-8.3 | Welcome view for first-time users (create/open guidance). | P2 |

## 7. Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Create an Empire | < 10 s (measured end-to-end) |
| NFR-2 | Install an app via Dockge | < 30 s (container running) |
| NFR-3 | Spawn an agent | < 5 s (agent reading context) |
| NFR-4 | Switch agents | < 3 s (new agent continuing) |
| NFR-5 | Export / Import | < 1 min / < 2 min |
| NFR-6 | Security | Stolen folder ⇒ only placeholders. OneCLI compromise ⇒ keys of one Empire only. |
| NFR-7 | Portability | Any machine with Docker + Node ≥ 20 can resume an exported Empire. |
| NFR-8 | Privacy | No telemetry; all data stays in the folder. |
| NFR-9 | Testability | Core logic runs headless (`node --test`), no VS Code instance required. |

## 8. Milestones & acceptance criteria

| Phase | Scope | Definition of Done | Status (v0.1.0) |
|-------|-------|--------------------|-----------------|
| **P0** | Meta-Harness skeleton, Empire creation, context.md system | Create an Empire; spawn an agent; verify context injection. | ✅ Done |
| **P1** | Worktrees, agent adapters, context persistence across switches | Spawn Claude, work, switch to Codex, continue without loss. | ✅ Done |
| **P2** | Dockge quick access, OpenDesign panel skeleton | Open Dockge from VS Code; open and use the design panel. | ✅ Done |
| **P3** | OneCLI sidecar, secret injection, placeholder system | Services use placeholders; OneCLI swaps at runtime; deny/miss semantics enforced. | ✅ Done |
| **P4** | OpenDesign design-to-code pipeline, token system, component library | Drag components, see preview, export real code to `src/`. | ✅ Done |
| **P5** | Export/import, portability, documentation | Zip an Empire, move it, resume on a new machine. | ✅ Done |

## 9. Success metrics

| Metric | Target |
|--------|--------|
| Time from "Create New Empire" to first agent action | < 5 minutes |
| Context loss on agent switch (user-perceived re-explanation) | 0 |
| Secrets found in an exported zip (audit) | 0 |
| Time for a receiver to run an imported Empire | < 2 minutes |
| Empires that survive a move to a new machine without fixes | 100% |

## 10. Risks

From the whitepaper risk register, with owner + mitigation:

| Risk | L/M | Mitigation (implemented) |
|------|-----|--------------------------|
| Context file grows too large | M | `ContextEngine.compact()` — keep newest entries, summarize the rest (FR-2.4). |
| Agent overwrites another agent's work | M/H | Worktree isolation + shared `src/`/`design/` via symlinks (FR-3.1). |
| Dockge and agent both modify compose | L/H | Clear phase separation; enforced in context rules and docs (FR-4.3). |
| OneCLI vault corruption | L/H | Atomic writes (tmp+rename), clear decryption errors, rotation + audit logging. |
| OpenDesign generates poor code | M/M | Deterministic generator + agent review step before commit (FR-6.5). |
| Large Empire folders become unwieldy | M/M | Selective export: exclude logs, cache, node_modules (FR-7.2). |

## 11. Out of scope (v0.1.0, candidates for later)

- Semantic (model-driven) context summarization — currently structural only.
- In-extension Dockge webview (currently opens the external browser).
- Theme switcher UI for `design/themes/` (format defined, switcher pending).
- `.vsix` packaging pipeline and published OneCLI container image.
- Multi-agent concurrent sessions on the same Empire (worktrees make it
  possible; coordination UX is future work).

## 12. Traceability

| Whitepaper § | Covers | PRD |
|--------------|--------|-----|
| §1, §13 | What the system does, guiding principles | §1–§3 |
| §2.2 | Empire folder hierarchy | FR-1.2 |
| §3.1–3.3 | Setup vs. session phases | §5, FR-4 |
| §4 | Context persistence | FR-2, FR-3.4 |
| §5 | Security / OneCLI | FR-5, NFR-6 |
| §6 | OpenDesign | FR-6 |
| §7 | Performance targets | NFR-1…NFR-5 |
| §9 | Build plan | §8 |
| §10 | Risk register | §10 |
| §11, §12 | Component hierarchies | `docs/ARCHITECTURE.md` |
