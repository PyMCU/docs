# PyMCU Documentation Hub

The landing page and router for **[docs.pymcu.org](https://docs.pymcu.org)**, in the style
of [docs.astral.sh](https://docs.astral.sh).

Each project keeps its own documentation **in its own repository** and deploys to its own
Cloudflare Worker. This repo hosts the landing page and a worker that reverse-proxies a
sub-path to each project:

```
docs.pymcu.org/               → landing             (this repo)
docs.pymcu.org/rp2040sharp/   → RP2040Sharp emulator (PyMCU/RP2040Sharp → rp2040sharp-docs)
docs.pymcu.org/avr8sharp/     → AVR8Sharp emulator   (PyMCU/AVR8Sharp   → avr8sharp-docs)
docs.pymcu.org/pymcu/         → PyMCU compiler        (coming soon)
```

## Layout

| Path | What it is |
|---|---|
| `site/index.html` | The static landing page (dark/light, project cards) |
| `src/index.js` | The Worker: serves the landing (Static Assets) and proxies project sub-paths |
| `wrangler.toml` | Worker config (`pymcu-docs-hub`) with a Static Assets binding for `site/` |

It deploys as a **Cloudflare Worker with Static Assets** — assets in `site/` are served
first; the worker runs for any path without a matching file (the project sub-paths).

## How routing works

`src/index.js` maps the first path segment to a project's Worker, strips the prefix, and
reverse-proxies the request. Each project's docs are built with
`html_baseurl = "https://docs.pymcu.org/<name>/"` and Sphinx's relative links, so they
render correctly under the sub-path.

## Adding a project

1. In the project's repo, build its docs (Sphinx) and deploy to a Worker `<name>-docs`,
   with `html_baseurl = "https://docs.pymcu.org/<name>/"`.
2. Add `"<name>": "https://<name>-docs.workers.dev"` to `PROJECTS` in `src/index.js`.
3. Add a card to `site/index.html`.

## Deployment

Cloudflare's Git integration (Workers Builds) builds and deploys on every push to `main` —
no GitHub Actions. For a static landing there is no build step; Cloudflare runs
`wrangler deploy`, which uploads `src/index.js` and the `site/` assets.

The `docs.pymcu.org` custom domain is attached to the **`pymcu-docs-hub`** worker; project
workers are reached via their `*.workers.dev` URLs by the router.

## Local preview

```bash
npx wrangler dev          # runs the worker + assets locally
# or just open the static landing:
python -m http.server -d site 8000
```
