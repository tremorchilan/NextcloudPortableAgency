# OneCLI (secret guardian)

This folder holds the per-Empire OneCLI policy (`policy.yaml`), mounted into
the OneCLI container at `/etc/onecli/policy.yaml`.

The OneCLI image is published at `ghcr.io/empire-engine/onecli`; to build it
locally, clone the Empire Engine repo and copy the `onecli/` workspace here
(then switch the compose file to `build: ./services/onecli`).

Rules of the road:

- Services call OneCLI as their HTTP(S) proxy and reference secrets only as
  `{{PLACEHOLDER_NAME}}` (or a bare `PLACEHOLDER_NAME` in an Authorization
  header / exact JSON string value).
- Real keys live only in the encrypted vault (`data/onecli/vault.enc`),
  keyed by the host master key that Meta-Harness injects at container start.
- The vault is excluded from exports automatically. A new owner starts with
  an empty vault and registers their own keys.
