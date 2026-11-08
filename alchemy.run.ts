// The Alchemy stack of this site. .github/workflows/alchemy.yml runs it: the stage `prod` on each
// push to main, and the stage `pr-<number>` on each pull request, a Worker of its own that
// `alchemy destroy` deletes when the pull request closes.
//
// The stack name is the repository. Its state is in the `alchemy-state-store` project of the Convex
// team of the credential: the team token CONVEX_ACCESS_TOKEN in CI. On a laptop, the Convex CLI
// login with CONVEX_DEPLOYMENT set to any deployment of that team names it. The Worker needs
// CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Convex from "@samebase/alchemy-convex";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";
import type { Life } from "./src/worker.ts";

export default Alchemy.Stack(
  "nicu-chiciuc/maybeitwasapl",
  {
    providers: Cloudflare.providers(),
    state: Convex.withRunRecord(Convex.state()),
  },
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    // public/ holds life.apl and client.js, served as they are. Any other path, `/` included,
    // runs src/worker.ts, which hands it to the Durable Object `Life`: one per stage. `prod` also
    // serves maybeapl.tsx.md, a custom domain in the tsx.md zone of the same Cloudflare account;
    // previews stay on workers.dev.
    const site = yield* Cloudflare.Worker("Site", {
      name: stage === "prod" ? "maybeitwasapl" : `maybeitwasapl-${stage}`,
      domain: stage === "prod" ? "maybeapl.tsx.md" : undefined,
      main: "./src/worker.ts",
      assets: {
        directory: "./public",
        notFoundHandling: "none",
      },
      env: {
        Life: Cloudflare.DurableObject<Life>("Life"),
      },
      // The board stores nothing, so a deploy restarts it at once instead of waiting up to five
      // minutes for it to go idle with the old life.apl loaded.
      codeUpdateStrategy: { mode: "immediate" },
      compatibility: { date: "2026-11-01" },
    });

    return { url: site.url };
  }),
);
