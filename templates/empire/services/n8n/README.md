# n8n

Automation nervous system of {{EMPIRE_NAME}}.

- Install via Dockge during setup; Dockge writes its own compose stack into
  `dockge-stacks/` and its data into `data/n8n`.
- Sessions: agents customize n8n via its REST API or by exporting workflows
  into `workflows/`.
- Outbound credentials: use placeholders (e.g. `{{MAILGUN_API_KEY}}`) and
  route through OneCLI (`HTTP_PROXY=http://onecli:8080`).
