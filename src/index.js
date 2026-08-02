/**
 * Worker for docs.pymcu.org — the PyMCU compiler documentation.
 *
 *   docs.pymcu.org/*              → env.PYMCU_DOCS_URL (path passed through 1:1)
 *   docs.pymcu.org/pymcu/*        → 301 to the same path at the root (legacy prefix)
 *   docs.pymcu.org/rp2040sharp/*  → env.RP2040SHARP_DOCS_URL (until docs.silicontwin.co)
 *   docs.pymcu.org/avr8sharp/*    → env.AVR8SHARP_DOCS_URL   (until docs.silicontwin.co)
 *
 * The compiler docs moved from the /pymcu/ sub-path to the domain root; the old
 * multi-project hub landing is gone. The emulator sub-paths keep reverse-proxying
 * to their Pages projects until they move to docs.silicontwin.co, at which point
 * their entries here become redirects (or disappear).
 */
const EMULATOR_VARS = {
  rp2040sharp: "RP2040SHARP_DOCS_URL",
  avr8sharp: "AVR8SHARP_DOCS_URL",
};

function proxyHeaders(upstream, base, prefix) {
  const headers = new Headers(upstream.headers);
  const location = headers.get("location");
  if (location) {
    try {
      const loc = new URL(location, base);
      if (loc.origin === new URL(base).origin) {
        headers.set("location", `${prefix}${loc.pathname}${loc.search}`);
      }
    } catch { /* leave as-is */ }
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const segment = url.pathname.split("/")[1];

    // Legacy /pymcu/ prefix → permanent redirect to the root path.
    if (segment === "pymcu") {
      const rest = url.pathname.slice("/pymcu".length) || "/";
      return Response.redirect(`${url.origin}${rest}${url.search}`, 301);
    }

    // Emulator sub-paths: same stripped-prefix reverse proxy as before.
    if (EMULATOR_VARS[segment]) {
      if (url.pathname === `/${segment}`) {
        return Response.redirect(`${url.origin}/${segment}/`, 308);
      }
      const base = env[EMULATOR_VARS[segment]].replace(/\/+$/, "");
      const rest = url.pathname.slice(("/" + segment).length) || "/";
      const upstream = await fetch(base + rest + url.search, request);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: proxyHeaders(upstream, base, `/${segment}`),
      });
    }

    // Everything else — including the root — is the compiler documentation.
    const base = env.PYMCU_DOCS_URL.replace(/\/+$/, "");
    const upstream = await fetch(base + url.pathname + url.search, request);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: proxyHeaders(upstream, base, ""),
    });
  },
};
