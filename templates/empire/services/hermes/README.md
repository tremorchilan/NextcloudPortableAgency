# Hermes (optional AI worker)

Client-aligned AI worker for {{EMPIRE_NAME}}.

Not installed by default. If this Empire needs an AI worker, an agent creates
the service config here during a session:

- `config.yaml` — worker configuration (model, prompts, tools)
- `Dockerfile` or compose fragment — how it runs

Hermes talks to AI providers only through OneCLI, using `{{HERMES_API_KEY}}`
as its credential.
