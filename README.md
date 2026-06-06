# PyMCU Documentation Hub

The landing page and router for **[docs.pymcu.org](https://docs.pymcu.org)**, in the style
of [docs.astral.sh](https://docs.astral.sh).

Each project keeps its own documentation **in its own repository** and deploys to its own
Cloudflare Pages project. This repo only hosts the landing page and a worker that
reverse-proxies a sub-path to each project:

```
docs.pymcu.org/               → landing            (this repo · site/)
docs.pymcu.org/pymcu/         → PyMCU compiler      (PyMCU/PyMCU      → pymcu-docs)
docs.pymcu.org/rp2040sharp/   → RP2040Sharp emulator (PyMCU/RP2040Sharp → rp2040sharp-docs)
```

## Layout

| Path | What it is |
|---|---|
| `site/index.html` | The static landing page (dark/light, project cards) |
| `site/_worker.js` | Cloudflare Pages router: serves the landing, proxies project sub-paths |
| `wrangler.toml` | Pages project config (`pymcu-docs-hub`) |
| `.github/workflows/deploy.yml` | Deploys the hub on push to `main` |

## How routing works

`site/_worker.js` maps the first path segment to a project's Pages deployment, strips the
prefix, and proxies the request. Each project's docs are built with
`html_baseurl = "https://docs.pymcu.org/<name>/"` and Sphinx's relative links, so they
render correctly under the sub-path.

## Adding a project

1. In the project's repo, build its docs (Sphinx) and deploy to a Pages project
   `<name>-docs`, with `html_baseurl = "https://docs.pymcu.org/<name>/"`.
2. Add `"<name>": "https://<name>-docs.pages.dev"` to `PROJECTS` in `site/_worker.js`.
3. Add a card to `site/index.html`.

## Cloudflare setup

- One Pages project per docs site: `pymcu-docs-hub` (this repo, owns the
  `docs.pymcu.org` custom domain), `pymcu-docs`, `rp2040sharp-docs`, …
- Repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (org-level secrets work too).
- The `docs.pymcu.org` custom domain is attached to **`pymcu-docs-hub`**; the project
  Pages deployments are reached by the worker via their `*.pages.dev` URLs.

## Local preview

The landing is static — open `site/index.html`, or:

```bash
python -m http.server -d site 8000   # → http://localhost:8000
```

(Project sub-paths only resolve once deployed, since the worker proxies live Pages
deployments.)
