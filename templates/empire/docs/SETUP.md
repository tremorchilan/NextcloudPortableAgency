# Setup Notes — {{EMPIRE_NAME}}

## Setup phase (human, GUI)

1. `docker compose up -d` — boots Dockge + OneCLI.
2. Dockge: http://127.0.0.1:5001 — create an account, then install n8n,
   EspoCRM, ERPNext, or whatever this Empire needs from the app store.
3. Verify each service loads; create its admin accounts.
4. Record the service map in `.empire/context.md`.

## Session phase (agents)

- Spawn an agent from VS Code (**Empire: Spawn Agent**). It opens scoped to
  `worktrees/<agent>/` with `src/`, `design/`, and `docs/` symlinked in, and
  `.empire/context.md` injected into its system prompt.
- Switching agents (**Empire: Switch Agent**) hands off automatically — the
  new agent reads what was done last and continues.
- Agents may edit `docker-compose.yml` directly during sessions. Dockge is
  for the human setup phase only.

## Secrets

- Services only ever see placeholder names (`PLACEHOLDER_*`).
- Real keys live in OneCLI's encrypted vault; register them with
  **Empire: Register Secret**.
- The vault is excluded from exports. A new owner registers their own keys.
