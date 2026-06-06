/**
 * Cloudflare Pages router for docs.pymcu.org (the documentation hub).
 *
 * The hub serves only the landing page. Each project's documentation lives in its own
 * repository and deploys to its own Cloudflare Pages project; this worker reverse-proxies
 * a sub-path to each one — the docs.astral.sh model.
 *
 *   docs.pymcu.org/               → this hub's landing (env.ASSETS)
 *   docs.pymcu.org/pymcu/*        → pymcu-docs.pages.dev
 *   docs.pymcu.org/rp2040sharp/*  → rp2040sharp-docs.pages.dev
 *
 * Each sub-site is built with html_baseurl = https://docs.pymcu.org/<name>/ and relative
 * asset links, so it renders correctly under its sub-path. To add a project: deploy its
 * docs to a Pages project and add an entry below.
 */
const PROJECTS = {
  pymcu: "https://pymcu-docs.pages.dev",
  rp2040sharp: "https://rp2040sharp-docs.pages.dev",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const segment = url.pathname.split("/")[1];
    const origin = PROJECTS[segment];

    // Not a project sub-path → serve the hub landing and its assets.
    if (!origin) {
      return env.ASSETS.fetch(request);
    }

    // Bare "/<project>" → redirect to "/<project>/" so relative links resolve.
    if (url.pathname === `/${segment}`) {
      return Response.redirect(`${url.origin}/${segment}/`, 308);
    }

    // Strip the "/<project>" prefix and proxy to that project's Pages deployment.
    const rest = url.pathname.slice(("/" + segment).length) || "/";
    const upstream = await fetch(origin + rest + url.search, request);

    const headers = new Headers(upstream.headers);
    // Keep any upstream redirect inside docs.pymcu.org/<project>/.
    const location = headers.get("location");
    if (location) {
      try {
        const loc = new URL(location, origin);
        if (loc.origin === origin) {
          headers.set("location", `/${segment}${loc.pathname}${loc.search}`);
        }
      } catch { /* leave as-is */ }
    }
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
