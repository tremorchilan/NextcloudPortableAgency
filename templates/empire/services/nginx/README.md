# nginx

Reverse proxy and static file server for {{EMPIRE_NAME}}.

- Serves `src/website/` (including the OpenDesign `generated/` output).
- Route configs live here and are mounted into the container at
  `/etc/nginx/conf.d`.
