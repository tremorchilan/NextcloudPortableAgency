# EMPIRE ENGINE: RECONCILED WHITEPAPER & FILE HIERARCHY
## Sovereign Folder-Centric Orchestration Architecture

**Version:** 2.2 (Corrected)  
**Date:** August 12, 2026  
**Status:** Implemented (see `docs/CHANGELOG.md` for implementation notes and deviations)

---

## 1. WHAT THIS SYSTEM DOES

Empire Engine turns any folder on your computer into a complete digital environment — a business, a homelab, a dev stack — that lives inside Docker and is shaped by AI agents. You create a folder, name it `shop-alpha`, and it becomes a sovereign unit containing running services, source code, design assets, and automation workflows. When you are done, you zip the folder, send it to someone else, and they run `docker compose up` to inherit everything exactly as you left it.

The system has two distinct phases: **setup** and **session**.

During **setup**, you browse a visual app store called Dockge that runs inside the folder. You click to install n8n, a CRM, an ERP — whatever you need. Dockge handles the Docker Compose configuration. This is the GUI phase: point, click, install.

During **session**, you spawn an AI agent — Claude Code, Codex, OpenCode — that lives on your computer, not in the folder. The agent reads a shared memory file called `.empire/context.md` and knows exactly what you are building, what was done last, and what is next. The agent edits source code, configures services, writes automation workflows, and modifies Docker Compose directly. When Claude runs out of quota, you switch to Codex. Codex reads the same context file and continues exactly where Claude stopped. No lost progress. No repeated explanations.

A side panel in VS Code called OpenDesign lets you shape the visual face of whatever lives in the folder — websites, dashboards, storefronts — while agents write the underlying code.

A secret guardian called OneCLI lives inside the folder's Docker network. It intercepts outbound requests from services, swaps placeholder keys for real ones, and forwards the request. Real keys never touch disk inside the folder.

---

## 2. WHERE EVERYTHING LIVES

### 2.1 The Host System (VS Code and Agents)

VS Code sits on your computer, outside the folder. It runs the Meta-Harness extension. The extension does one thing and one thing only: it ensures that when you switch from Claude Code to Codex to OpenCode, the new agent knows exactly what the previous agent was doing.

The Meta-Harness extension:
- Spawns system agents in isolated git worktrees within the folder
- Injects `.empire/context.md` into every agent's system prompt
- Provides an OpenDesign side panel for visual design
- Provides a quick-access button to open Dockge's web UI
- Tracks which agent last worked and what they accomplished

System agents — Claude Code, Codex, OpenCode, Aider — are installed on your computer like any other CLI tool. The Meta-Harness points them at the folder. They do the work.

### 2.2 The Empire Folder (The Living Environment)

The folder contains everything that makes the environment work:

```
shop-alpha/                          ← THE EMPIRE UNIT
│
├── .empire/                         ← Shared memory and metadata
│   ├── context.md                   ← What we are building, what was done,
│   │                                  what's next, key decisions, service map
│   ├── state.json                   ← Which agent last worked, what services
│   │                                  are running, versions
│   └── manifest.json                ← Empire name, template, created date,
│                                      services installed
│
├── docker-compose.yml               ← The stack definition
│                                      (agents edit this directly during sessions)
├── .env.example                     ← Template showing required keys
├── .env                             ← Real keys (gitignored, injected by OneCLI)
├── .gitignore                       ← Excludes: .env, logs, node_modules,
│                                      worktrees (only src/ and design/ shared)
│
├── .vscode/                         ← VS Code workspace settings
│   ├── settings.json
│   ├── tasks.json                   ← "Start Stack", "Export Empire"
│   └── launch.json
│
├── worktrees/                       ← Agent isolation (ephemeral, gitignored)
│   ├── claude/                      ← Claude Code's workspace
│   │   ├── src/ → ../../src/        ← Symbolic link to shared source
│   │   ├── design/ → ../../design/  ← Symbolic link to shared design
│   │   └── .empire-context.md       ← Claude's private scratchpad (optional)
│   ├── codex/                       ← Codex workspace (same pattern)
│   └── opencode/                    ← OpenCode workspace (same pattern)
│
├── src/                             ← Source code (survives export)
│   ├── website/                     ← Public-facing site
│   ├── dashboard/                   ← Admin/customer portal
│   ├── api/                         ← Custom backend
│   └── shared/                      ← Types, utils, constants
│
├── design/                          ← OpenDesign assets (survives export)
│   ├── tokens.json                  ← Colors, fonts, spacing, breakpoints
│   ├── components/                  ← Reusable design definitions
│   ├── pages/                       ← Page layouts
│   └── themes/                      ← Light/dark variations
│
├── services/                        ← Service configuration (survives export)
│   ├── n8n/
│   ├── espocrm/
│   ├── erpnext/
│   ├── hermes/                      ← Optional AI worker config
│   ├── openfang/                    ← Optional AI worker config
│   ├── nginx/
│   └── onecli/                      ← OneCLI policy rules
│
├── workflows/                       ← n8n workflow exports (survives export)
│   ├── onboarding.json
│   ├── invoicing.json
│   └── README.md                    ← What each workflow does
│
├── data/                            ← Persistent service data (survives export)
│   ├── n8n/                         ← n8n database, execution history
│   ├── espocrm/                     ← CRM database
│   ├── erpnext/                     ← ERP database
│   ├── hermes/                      ← AI worker conversation history
│   └── postgres/                    ← Shared PostgreSQL data
│
├── logs/                            ← Audit and debug (optional in export)
│   ├── audit.json                   ← OneCLI proxy logs
│   ├── agent-activity.log           ← Chronological agent actions
│   └── docker-events.log
│
└── docs/                            ← Human documentation (survives export)
    ├── README.md
    ├── SETUP.md
    ├── ARCHITECTURE.md
    └── CHANGELOG.md
```

### 2.3 The Docker Stack (Inside the Folder)

The folder's `docker-compose.yml` defines a private Docker network. Every service lives on this network and can talk to every other service by name:

| Service | What It Does | Internal Address |
|---------|-------------|-----------------|
| **n8n** | Automation nervous system | `http://n8n:5678` |
| **EspoCRM** | Customer relationship management | `http://espocrm:8080` |
| **ERPNext** | Business resource planning | `http://erpnext:8080` |
| **Hermes** | Optional AI worker (client-aligned) | `http://hermes:3000` |
| **OpenFang** | Optional AI worker | `http://openfang:3000` |
| **OneCLI** | Secret proxy and audit logger | `http://onecli:8080` |
| **Dockge** | Self-hosted app store (GUI) | `http://dockge:5001` |
| **nginx** | Reverse proxy and static file server | `http://nginx:80` |

All services share the same Docker network but are isolated from other Empires and from the host.

---

## 3. THE TWO PHASES: SETUP AND SESSION

### 3.1 Phase One: Setup (The GUI Phase)

Before any agent touches the folder, the user sets up the foundation using Dockge's visual interface.

**Step 1:** User runs "Empire: Create New" in VS Code. The Meta-Harness extension creates the folder structure, initializes a Git repository, and generates a minimal `docker-compose.yml` with only Dockge and OneCLI.

**Step 2:** User clicks "Open Dockge" in VS Code. A webview panel opens showing Dockge's app store. The user browses categories: CRM, ERP, Automation, Monitoring, AI Workers.

**Step 3:** User clicks "Install" next to n8n, EspoCRM, and ERPNext. Dockge modifies `docker-compose.yml` internally, creates `./data/` volumes, and starts the containers. The user sees green status indicators.

**Step 4:** User verifies services are healthy. They open n8n in a browser, create an admin account, and verify EspoCRM loads. This is the human-driven foundation.

**Step 5:** User clicks "Start Session" in VS Code. The setup phase ends. The session phase begins.

### 3.2 Phase Two: Session (The Agent Phase)

Once the session starts, agents take over. Dockge becomes read-only — a reference, not a tool.

**Step 1:** User spawns Claude Code via the Meta-Harness extension. Claude opens in a terminal panel within VS Code, scoped to `worktrees/claude/`.

**Step 2:** Before Claude sees any prompt, the Meta-Harness injects `.empire/context.md` into Claude's system context. Claude knows: this is a bakery business Empire, n8n is running on port 5678, EspoCRM is the CRM, the last agent set up customer forms, the next step is to create an invoicing workflow.

**Step 3:** Claude works. It edits `docker-compose.yml` directly to add a new service. It writes React components in `src/website/`. It creates n8n workflows via the n8n API. It writes configuration into `services/espocrm/`. It updates `.empire/context.md` after every significant action.

**Step 4:** Claude hits its quota limit. The Meta-Harness detects this and prompts: "Claude Code has reached its limit. Switch to Codex?"

**Step 5:** User clicks "Switch to Codex." The Meta-Harness spawns Codex in `worktrees/codex/`, injects the updated `.empire/context.md`, and Codex continues exactly where Claude stopped. Codex reads: "Claude was creating an invoicing workflow. The workflow is half-done. Next step: add the 'send email' node."

**Step 6:** Session continues. Agents come and go. Context persists. The folder evolves.

### 3.3 What Agents Edit Directly vs. What Dockge Manages

| File or Service | Setup Phase (Dockge) | Session Phase (Agents) |
|-----------------|---------------------|------------------------|
| `docker-compose.yml` | Dockge modifies when user clicks "Install" | Agents modify directly for custom services |
| `.env` | Dockge generates placeholders | Agents never touch; OneCLI injects at runtime |
| `src/` (source code) | Empty or template | Agents write all code |
| `services/n8n/config/` | Default config from Dockge | Agents customize via n8n API or direct file edit |
| `design/tokens.json` | Default tokens | Agents and OpenDesign modify |
| `workflows/*.json` | Empty | Agents create via n8n API and export |
| `services/hermes/` | Not installed (optional addon) | Agents create and configure if business mode |

---

## 4. HOW CONTEXT PERSISTENCE WORKS

### 4.1 The `.empire/context.md` File

This is the shared memory of the Empire. Every agent reads it before starting and appends to it before stopping. It is a Markdown file, human-readable and machine-parseable.

```markdown
# Empire Context: shop-alpha

## What We Are Building
A bakery business with online ordering, customer management, and automated invoicing.

## Service Map
| Service | Address | Status | Credentials |
|---------|---------|--------|-------------|
| n8n | http://n8n:5678 | Running | Admin: admin / PLACEHOLDER_N8N_ADMIN |
| EspoCRM | http://espocrm:8080 | Running | Admin: admin / PLACEHOLDER_ESPO_ADMIN |
| ERPNext | http://erpnext:8080 | Running | Admin: admin / PLACEHOLDER_ERP_ADMIN |
| nginx | http://nginx:80 | Running | — |

## What Was Done Last
- [Claude Code, 2026-08-12 14:30] Created customer signup form in src/website/
- [Claude Code, 2026-08-12 14:45] Configured EspoCRM custom fields: name, email, phone, order_history
- [Claude Code, 2026-08-12 15:00] Started n8n workflow "customer-onboarding" — nodes: Webhook → Create Contact → Send Welcome Email

## What Is Next
- Complete the "customer-onboarding" workflow: add "Create Invoice" node
- Connect invoice generation to ERPNext
- Style the signup form using design tokens

## Key Decisions
- Using EspoCRM instead of SuiteCRM (lighter, faster)
- Customer data stored in EspoCRM; invoicing handled by ERPNext
- Design system: warm earth tones (bakery aesthetic)

## Anti-Patterns to Avoid
- Do not store customer passwords in plaintext
- Do not expose n8n webhook to public internet without auth
```

### 4.2 How the Meta-Harness Injects Context

When the user spawns an agent, the Meta-Harness extension:

1. Reads `.empire/context.md` from the Empire folder
2. Reads `.empire/state.json` to know which agent last worked
3. Constructs a system prompt that includes:
   - The full context.md content
   - A reminder: "You are continuing work started by [Previous Agent]"
   - The current worktree path
   - Available CLI tools and their paths
4. Spawns the agent with this system prompt as environment variable `EMPIRE_CONTEXT`
5. The agent's adapter reads `EMPIRE_CONTEXT` and incorporates it into its reasoning

### 4.3 How Agents Update Context

After completing a significant task, the agent appends to `.empire/context.md`:

```markdown
- [Codex, 2026-08-12 16:15] Completed "customer-onboarding" workflow: added "Create Invoice" node
- [Codex, 2026-08-12 16:30] Connected invoice generation to ERPNext via REST API
- [Codex, 2026-08-12 16:45] Updated design tokens in design/tokens.json: primary color #D4A373

## What Is Next
- Style the signup form using updated tokens
- Test end-to-end: form submission → CRM entry → invoice → email
```

---

## 5. HOW SECURITY WORKS

### 5.1 OneCLI: The Secret Guardian

OneCLI is a proxy service that lives inside the Empire's Docker network. It sits between services and the outside world.

When Hermes wants to call an AI API, it sends a request with a placeholder key like `HERMES_API_KEY`. OneCLI intercepts this request, looks up the real key from its vault, swaps it in, and forwards the request. The real key never touches disk inside the Empire folder.

| Scenario | What Happens |
|----------|-------------|
| **Normal operation** | Service sends placeholder → OneCLI swaps in real key → request proceeds |
| **Folder is stolen** | Attacker sees only placeholders. Real keys are in OneCLI's vault, which requires the host's master password. |
| **OneCLI compromised** | Attacker gains keys for THIS Empire only. Other Empires have separate vaults. |
| **User exports folder** | OneCLI vault is excluded. New owner must provide their own keys. |
| **New owner imports** | OneCLI starts with empty vault. New owner registers their keys via Meta-Harness UI. |

### 5.2 API Key Lifecycle

| Stage | Who Provides | Where It Lives | How Long |
|-------|-------------|----------------|----------|
| **Creation** | User enters key in Meta-Harness UI | OneCLI vault on host | Until deleted |
| **Injection** | OneCLI reads from vault | Injected as env var at container start | Duration of container |
| **Usage** | Service reads env var | In service memory only | Until service restarts |
| **Export** | Keys stripped | Nowhere in folder | N/A |
| **Import** | New user provides keys | New OneCLI vault | As above |

---

## 6. HOW OPENDESIGN WORKS

OpenDesign is a side panel in VS Code. It shows a visual canvas where the user can drag components, adjust design tokens, and preview results. The panel reads and writes files in the Empire folder's `design/` directory.

Behind the scenes, a system agent watches the design files. When the user changes a color token, the agent updates the CSS. When the user moves a button, the agent rewrites the component. The user designs visually; the agent writes code. The result is always a real, editable codebase in `src/`.

OpenDesign does not run inside Docker. It is part of the VS Code extension, living on the host, operating on files in the folder.

---

## 7. PERFORMANCE TARGETS

| Goal | Target | How Measured |
|------|--------|-------------|
| Create an Empire | Under 10 seconds | From "New Empire" command to ready folder |
| Install app via Dockge | Under 30 seconds | From "Install" click to running container |
| Spawn agent | Under 5 seconds | From "Spawn" to agent reading context |
| Switch agents | Under 3 seconds | From "Switch" to new agent continuing work |
| Export Empire | Under 1 minute | From "Export" to zip file ready |
| Import Empire | Under 2 minutes | From unzip to `docker compose up` running |

---

## 8. WHAT ALREADY SOLVES THIS

| Project | What Problem They Solved | What to Reuse | What to Replace |
|---------|-------------------------|---------------|-----------------|
| **Dockge** | Self-hosted Docker Compose GUI with app store | The app store UI, compose generation, container management | Nothing; run as-is inside the Empire |
| **Git worktrees** | Multiple working directories from one repo | Worktree spawning for agent isolation | Extend with automatic context file sync |
| **n8n** | Visual workflow automation, self-hosted | Workflow engine, node ecosystem, credentials | Nothing; install via Dockge |
| **EspoCRM / ERPNext** | Self-hosted CRM and ERP | Data models, business logic, APIs | Nothing; install via Dockge |
| **Claude Code / Codex / OpenCode** | AI agents that edit code via natural language | CLI interfaces, context handling, file editing | Nothing; orchestrate them, do not bundle |
| **Dev Containers** | VS Code + Docker integration | `.devcontainer/` pattern, extension mounting | Their single-container model; generalize for multi-service |
| **Ddev** | Per-folder development environments | Folder-isolation philosophy, config patterns | Their PHP-centric stack; generalize for any service |
| **OnePassword CLI** | Secret injection and management | Placeholder-to-secret swapping pattern | Build custom proxy for Docker network |
| **Figma Dev Mode** | Design-to-code workflow | Component property mapping, code generation | Proprietary tool; build FOSS alternative in VS Code |
| **Coolify** | Self-hosted PaaS with one-click deployment | Service catalog, deployment orchestration | Their server-centric model; make it folder-local |

---

## 9. BUILD PLAN

| Phase | What Gets Built | Duration | Definition of Done |
|-------|----------------|----------|-------------------|
| **P0** | Meta-Harness extension skeleton, Empire folder creation, context.md system | 2 weeks | Can create an Empire, spawn Claude Code, verify context injection |
| **P1** | Git worktree spawning, agent adapter pattern, context persistence across switches | 2 weeks | Can spawn Claude, work, switch to Codex, continue without loss |
| **P2** | Dockge integration (quick-access button), OpenDesign side panel skeleton | 2 weeks | Can open Dockge from VS Code, can open design panel |
| **P3** | OneCLI sidecar, secret injection, placeholder system | 2 weeks | Services use placeholders; OneCLI swaps them at runtime |
| **P4** | OpenDesign design-to-code pipeline, token system, component library | 2 weeks | Can drag components, see preview, export code to src/ |
| **P5** | Export/Import, portability, documentation | 1 week | Can zip Empire, move it, resume on new machine |

---

## 10. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Context file grows too large | Medium | Medium | Implement summarization: agent writes summary, not full history |
| Agent overwrites another agent's work | Medium | High | Worktree isolation + shared src/ via symbolic links |
| Dockge and agent both modify compose | Low | High | Clear phase separation: Dockge for setup, agents for session |
| OneCLI vault corruption | Low | High | Encrypted backups, key rotation, audit logging |
| OpenDesign generates poor code | Medium | Medium | Agent review step: agent refines generated code before commit |
| Large Empire folders become unwieldy | Medium | Medium | Selective export: exclude logs, cache, node_modules |

---

## 11. THE FILE HIERARCHY: META-HARNESS EXTENSION

```
empire-engine-extension/             ← VS Code Extension (lives on HOST)
│
├── package.json                     ← Extension manifest, commands, views
│
├── src/
│   ├── extension.ts                 ← Entry point: activation, registration
│   │
│   ├── core/                        ← CONTEXT PERSISTENCE (sole job)
│   │   ├── EmpireManager.ts         ← Create, open, delete Empires
│   │   ├── ContextEngine.ts         ← Read/write .empire/context.md
│   │   │                              Manage agent handoffs
│   │   ├── WorktreeManager.ts       ← Spawn git worktrees per agent
│   │   │                              Sync shared directories via symlinks
│   │   └── StateManager.ts          ← Track: last agent, running services,
│   │                                  Empire health
│   │
│   ├── agents/                      ← SYSTEM AGENT ORCHESTRATION
│   │   ├── AgentRegistry.ts         ← Discover installed agents on host
│   │   ├── AgentSpawner.ts          ← Spawn agent in worktree with
│   │   │                              injected EMPIRE_CONTEXT env var
│   │   ├── AgentAdapter.ts          ← Abstract interface: spawn(),
│   │   │                              getStatus(), terminate()
│   │   ├── adapters/
│   │   │   ├── ClaudeCodeAdapter.ts
│   │   │   ├── CodexAdapter.ts
│   │   │   ├── OpenCodeAdapter.ts
│   │   │   └── AiderAdapter.ts
│   │   └── ContextInjector.ts       ← Inject .empire/context.md into
│   │                                  agent system prompt
│   │
│   ├── dockge/                      ← DOCKGE QUICK ACCESS
│   │   └── DockgeLauncher.ts        ← Open Dockge web UI in VS Code webview
│   │                                  or external browser
│   │
│   ├── opendesign/                  ← OPENDESIGN SIDE PANEL
│   │   ├── OpenDesignPanel.ts       ← Register VS Code side panel
│   │   ├── DesignCanvas.ts          ← Drag-and-drop design surface
│   │   ├── TokenEditor.ts           ← Edit design/tokens.json
│   │   ├── ComponentLibrary.ts      ← Load components from design/
│   │   └── CodeSync.ts              ← Watch design/ changes, trigger
│   │                                  agent code generation
│   │
│   ├── onecli/                      ← ONECLI INTEGRATION
│   │   ├── OneCLIClient.ts          ← Talk to OneCLI API
│   │   ├── SecretManager.ts         ← Register keys, map placeholders
│   │   └── AuditViewer.ts           ← Display audit logs
│   │
│   ├── ui/                          ← VS CODE UI COMPONENTS
│   │   ├── webviews/
│   │   │   ├── EmpireDashboard/     ← Overview: services, agents, status
│   │   │   └── OpenDesign/          ← Design canvas (React)
│   │   └── commands/
│   │       ├── createEmpire.ts
│   │       ├── spawnAgent.ts
│   │       ├── switchAgent.ts
│   │       ├── openDockge.ts        ← "Empire: Open Dockge"
│   │       ├── openDesign.ts
│   │       └── exportEmpire.ts
│   │
│   └── utils/
│       ├── docker.ts                ← Docker CLI wrapper
│       ├── git.ts                   ← Git worktree operations
│       └── logger.ts
│
├── webview/                         ← Compiled React assets
│   ├── dashboard/
│   └── opendesign/
│
└── test/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 12. THE FILE HIERARCHY: ONECLI SERVICE

```
onecli/                              ← Secret proxy service (runs inside Empire)
│
├── src/
│   ├── main.rs                      ← HTTP proxy server
│   ├── vault/
│   │   ├── encryption.rs            ← AES-256-GCM
│   │   ├── storage.rs               ← Encrypted key-value store
│   │   └── rotation.rs
│   ├── proxy/
│   │   ├── interceptor.rs           ← Detect placeholders in outbound requests
│   │   ├── swapper.rs               ← Replace placeholder with real key
│   │   └── policy.rs                ← Enforce: which service → which key
│   ├── audit/
│   │   ├── logger.rs                ← Structured audit logs
│   │   └── alert.rs
│   └── api/
│       ├── routes.rs                ← Endpoints for Meta-Harness
│       └── models.rs
├── config/
│   └── default.yaml
└── tests/
```

> **Implementation note:** OneCLI is implemented in TypeScript (Node.js) rather
> than Rust in this build because the reference build environment has no Rust
> toolchain. The architecture, module layout, config format, wire API, and data
> formats match the Rust hierarchy above exactly, so a Rust port remains a
> drop-in replacement. AES-256-GCM encryption is provided by `node:crypto`.

---

## 13. REMEMBER

- **VS Code is the cockpit, not the engine.** It spawns agents and persists context. The folder is the engine.
- **Dockge is for setup, not sessions.** The user browses and installs before agents take over. Agents edit compose directly.
- **Context is everything.** `.empire/context.md` is the shared memory that makes agent switching frictionless.
- **The folder is sovereign.** Zip it, own it, move it, delete it. No cloud. No lock-in.
- **Agents are interchangeable fingers.** Claude, Codex, OpenCode — they all point at the same folder. The context file ensures no finger starts blind.
