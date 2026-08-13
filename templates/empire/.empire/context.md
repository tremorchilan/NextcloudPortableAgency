# Empire Context: {{EMPIRE_NAME}}

This file is the shared memory of this Empire. Every agent reads it before starting
and appends to it before stopping. Keep it human-readable and up to date.

## What We Are Building

Describe the business, homelab, or stack this Empire exists for. Example:
"A bakery business with online ordering, customer management, and automated invoicing."

## Service Map

| Service | Address | Status | Credentials |
|---------|---------|--------|-------------|
| OneCLI | http://onecli:8080 | — | admin token via Meta-Harness SecretStorage |
| Dockge | http://dockge:5001 | — | create your account on first launch |

Add each service you install here, with its internal address and placeholder
credentials only (PLACEHOLDER_*) — never real keys.

## What Was Done Last

- [empire-engine, {{EMPIRE_CREATED_AT}}] Empire scaffolded from the default template.

## What Is Next

- Start the stack, open Dockge, and install the services this Empire needs.
- Register real API keys with OneCLI via "Empire: Register Secret".
- Spawn an agent to begin the session phase.

## Key Decisions

- (none yet — record decisions here as the Empire evolves)

## Anti-Patterns to Avoid

- Do not store customer passwords in plaintext.
- Do not expose n8n webhooks to the public internet without auth.
- Never write real API keys into files inside this folder.
