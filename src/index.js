/**
 * Worker for docs.pymcu.org — the documentation hub (docs.astral.sh model).
 *
 * Deployed as a Worker with Static Assets:
 *   - the landing page in ../site is served directly (assets-first);
 *   - any other path is handled here, reverse-proxying project sub-paths to each
 *     project's own Worker.
 *
 *   docs.pymcu.org/               → landing (Static Assets)
 *   docs.pymcu.org/rp2040sharp/*  → env.RP2040SHARP_DOCS_URL
 *   docs.pymcu.org/avr8sharp/*    → env.AVR8SHARP_DOCS_URL
 *
 * Target URLs are configured as vars in wrangler.toml. Each project's docs are built with
 * html_baseurl = https://docs.pymcu.org/<name>/ and relative links, so they render
 * correctly under the sub-path. (The PyMCU compiler docs are not published yet.)
 */
const PROJECT_VARS = {
  rp2040sharp: "RP2040SHARP_DOCS_URL",
  avr8sharp: "AVR8SHARP_DOCS_URL",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const segment = url.pathname.split("/")[1];
    const origin = PROJECT_VARS[segment] ? env[PROJECT_VARS[segment]] : null;

    // Not a configured project sub-path → serve the hub landing / assets.
    if (!origin) {
      return env.ASSETS.fetch(request);
    }

    // Bare "/<project>" → redirect to "/<project>/" so relative links resolve.
    if (url.pathname === `/${segment}`) {
      return Response.redirect(`${url.origin}/${segment}/`, 308);
    }

    // Strip the "/<project>" prefix and proxy to that project's Worker.
    const base = origin.replace(/\/+$/, "");
    const rest = url.pathname.slice(("/" + segment).length) || "/";
    const upstream = await fetch(base + rest + url.search, request);

    const headers = new Headers(upstream.headers);
    // Keep any upstream redirect inside docs.pymcu.org/<project>/.
    const location = headers.get("location");
    if (location) {
      try {
        const loc = new URL(location, base);
        if (loc.origin === new URL(base).origin) {
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
