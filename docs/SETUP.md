# Setup & Development

## Requirements

- Node.js ≥ 20 and npm
- Git
- For the full loop: Docker with the compose plugin, VS Code, and at least
  one agent CLI (Claude Code, Codex, OpenCode, or Aider)

## Install & verify

```bash
npm install --workspaces   # hoists dev dependencies for both workspaces
npm run verify             # builds extension + onecli, runs all 61 tests
```

Per-workspace:

```bash
npm run build -w onecli
npm test -w onecli          # 28 tests
npm run build -w extension  # bundles webviews + compiles TS
npm test -w extension       # 33 tests (no VS Code needed)
```

## Run OneCLI standalone

```bash
cd onecli && npm run build
export ONECLI_MASTER_KEY=$(openssl rand -hex 32)   # or any ≥16-byte secret
export ONECLI_ADMIN_TOKEN=$(openssl rand -hex 24)
node dist/main.js
```

Then:

```bash
# health (open)
curl http://127.0.0.1:8080/health

# register a key (admin token required)
curl -X PUT http://127.0.0.1:8080/api/vault/keys/OPENAI_API_KEY \
  -H "Authorization: Bearer $ONECLI_ADMIN_TOKEN" \
  -d '{"value":"sk-…","services":["hermes"]}'

# proxy a request through it, placeholder-style
curl -x http://127.0.0.1:8080 \
  -H 'X-OneCLI-Service: hermes' \
  -H 'Authorization: Bearer {{OPENAI_API_KEY}}' \
  https://api.example.com/v1/whatever
```

The dev config (`onecli/config/default.yaml`) trusts any listed service
without a token; inside an Empire the mounted `services/onecli/policy.yaml`
is authoritative.

## Run the Meta-Harness extension

1. `npm install --workspaces && npm run build -w extension`
2. Open `extension/` in VS Code, press **F5** (Extension Development Host).
3. In the dev host: **Empire: Create New Empire** → pick a name and parent
   folder. This scaffolds the full §2.2 hierarchy and initializes git.
4. **Empire: Start Stack** (needs Docker) → boots Dockge (port 5001) and
   OneCLI (port 58080) with the master key injected from SecretStorage.
5. **Empire: Open Dockge** → install services from the app store.
6. **Empire: Register Secret** → store real keys in the OneCLI vault.
7. **Empire: Spawn Agent** → agent opens in `worktrees/<agent>/` with
   `.empire/context.md` injected. Work, then **Empire: Switch Agent** — the
   next agent picks up where the last one stopped.
8. **Empire: Export Empire (.zip)** → zip it, copy it anywhere, and
   **Empire: Import Empire (.zip)** on the new machine. The vault never
   travels; `.env` is restored from `.env.example`.

### Extension settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `empire.dockge.port` | 5001 | Dockge host port inside Empires |
| `empire.onecli.port` | 58080 | OneCLI host port inside Empires |
| `empire.agents.extraPaths` | `[]` | Extra dirs scanned for agent CLIs |
| `empire.export.includeLogs` | `false` | Include `logs/` in exports |
| `empire.export.includeData` | `true` | Include `data/` (vault always excluded) |
| `empire.export.includeGit` | `false` | Include `.git` history in exports |

## Standalone Empire folder (no extension)

```bash
cp -r templates/empire ~/shop-alpha
cd ~/shop-alpha
# replace {{EMPIRE_NAME}} / {{EMPIRE_ID}} / {{EMPIRE_CREATED_AT}} / {{EMPIRE_ENGINE_VERSION}}
# copy .env.example → .env and replace GENERATE_ME markers
cp -r ../empire-engine/onecli services/onecli   # or use the published image
docker compose up -d
```

## Docker image for OneCLI

```bash
cd onecli
docker build -t ghcr.io/empire-engine/onecli:0.1.0 .
```
