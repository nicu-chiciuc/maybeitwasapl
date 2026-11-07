# This website was built in APL

No React, no JSX, no framework. Conway's Game of Life, with one board for everyone. Click a cell
to flip it.

[`public/life.apl`](public/life.apl) is the program: the rules, each frame, and the page. A
Cloudflare Durable Object loads it into [ngn/apl](https://github.com/abrudz/ngn-apl), an APL
interpreter written in JavaScript. It steps the board twice a second while someone is watching and
sends every browser the next frame as HTML.

The rest is glue: [`src/worker.ts`](src/worker.ts) passes requests and clicks to the APL, and
[`public/client.js`](public/client.js) puts each frame on the page.

## Run and deploy

`pnpm install`, then `pnpm exec alchemy dev`. On a laptop, set `CONVEX_DEPLOYMENT` to any
deployment of the Convex team that holds the Alchemy state.

[Alchemy](https://alchemy.run) deploys from GitHub Actions: a push to `main` deploys production, and
each pull request gets a preview Worker that goes away when it closes. See
[`alchemy.run.ts`](alchemy.run.ts) and [`.github/workflows/alchemy.yml`](.github/workflows/alchemy.yml).
