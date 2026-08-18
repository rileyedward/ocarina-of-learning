# Deploying to Laravel Cloud

This app is a Nuxt 4 application running with `ssr: false` — a single-page app
served by Nitro. Laravel Cloud lists Nuxt in its framework picker, so it deploys
as a first-class application with no wrapper and no custom web server.

## Settings

Create the application from this repository, then set:

| Setting | Value |
| --- | --- |
| Framework | **Nuxt** |
| Mode | **Server** (not static — see below) |
| Runtime | Node.js **24** (22 also works; `package.json` requires >= 22.19) |
| Port | Cloud's default is fine; Nitro reads `PORT` |
| Build command | `npm ci --audit false && npm run build` |
| Start command | leave Cloud's default (`node .output/server/index.mjs`) |
| Deploy command | leave empty |
| Environment variables | none required |

No database, cache, queue, or object storage resource is needed. Cloud sets
`NODE_ENV=production` and `NUXT_PUBLIC_SITE_URL` on its own; nothing in the app
reads them.

`npm ci` runs the `postinstall` hook (`nuxt prepare`), which generates the types
under `.nuxt/`. That is expected and takes a second.

## Why server mode and not static generation

`nuxt generate` prerenders only the routes its crawler can discover:

```
index.html  200.html  404.html  reference/  scales/  song/new/
```

Songs are user data in `localStorage`, so `/song/<id>`, `/song/<id>/edit`, and
`/scales/<id>` are never prerendered. Serving the generated directory means
those deep links resolve only if the host rewrites unknown paths to the SPA
fallback (`200.html`). Cloud's Nginx rewrite behaviour for static Nuxt output is
not documented, so a bookmarked practice screen could 404.

Server mode removes the question: Nitro answers every path with the SPA shell.
This was verified against a local production build — `/`, `/reference`,
`/scales/chromatic`, `/song/seed-twinkle`, `/song/seed-twinkle/edit`, and an
unknown path all return `200`.

The app is still fully client-rendered; the Node process only hands out the
shell, so Scale to Zero costs nothing while nobody is practising.

If you would rather host the static output somewhere with an explicit SPA
fallback (Cloudflare Pages, Netlify), `npm run generate` writes it to
`.output/public` and the fallback file is `200.html`.

## Do not set a Nitro preset

Laravel Cloud runs Nitro's default `node-server` preset. Adding `nitro.preset`
to `nuxt.config.ts` — or a `NITRO_PRESET` environment variable — for Vercel,
Netlify, or Cloudflare still builds green but produces output Cloud cannot
serve, and the deployment finishes without routing traffic.

## Local check before pushing

```bash
npm ci
npm test
npm run typecheck
npm run build
npm start        # http://localhost:3000
```
