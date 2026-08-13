# Architecture Notes — {{EMPIRE_NAME}}

This folder is the engine; VS Code is the cockpit.

- **Two phases.** Setup = Dockge GUI (browse, click, install). Session =
  agents edit everything directly, including `docker-compose.yml`.
- **One memory.** `.empire/context.md` is read by every agent before work and
  appended to after. Switching agents loses nothing.
- **Sovereign folder.** Everything needed to reproduce this environment is
  inside this folder. Zip it (vault excluded), move it, `docker compose up`.

The Meta-Harness extension and OneCLI service that power this folder live in
the Empire Engine repository (see the root README there).
