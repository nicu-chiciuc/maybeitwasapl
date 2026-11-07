// The bridge between Cloudflare and life.apl. The rules of the game, the frames, and the page are
// APL; this file only moves strings between the network and the interpreter.
//
// Cloudflare serves the files in public/ before this Worker runs. Every other request goes to one
// Durable Object, the board everyone shares. It loads public/life.apl into ngn/apl, steps the board
// while a browser is connected, and sends each frame to every connected browser. Nothing is
// stored: when the last browser leaves, the object is evicted and the next visitor gets a new board.
import { DurableObject } from "cloudflare:workers";
// ngn/apl, vendored unchanged from https://github.com/abrudz/ngn-apl (MIT, vendor/LICENCE-ngn-apl).
import apl from "../vendor/apl.js";

interface Env {
  ASSETS: Fetcher;
  Life: DurableObjectNamespace<Life>;
}

/** An APL value as ngn/apl returns it: the items in `a`, flattened. */
interface AplArray {
  a: ArrayLike<string | number>;
}

/** The time between two generations, in milliseconds. */
const TICK_MS = 500;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.Life.getByName("board").fetch(request);
  },
};

export class Life extends DurableObject<Env> {
  #run!: (code: string) => AplArray;
  #cells = 0;
  #sockets = new Set<WebSocket>();
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      const source = await env.ASSETS.fetch("https://assets.invalid/life.apl");
      this.#run = apl.ws();
      this.#run(await source.text());
      this.#run("prev←board←seed size ⋄ gen←0");
      this.#cells = Number(this.#run("×/size").a[0]);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/") {
      return new Response(this.#text("gen page board"), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (pathname === "/live" && request.headers.get("upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
      server.accept();
      this.#sockets.add(server);
      server.addEventListener("message", (event) => this.#flip(event.data));
      server.addEventListener("close", () => this.#leave(server));
      server.addEventListener("error", () => this.#leave(server));
      this.#timer ??= setInterval(() => this.#tick(), TICK_MS);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Not found\n", { status: 404 });
  }

  /** Runs APL code and returns its result as a string. */
  #text(code: string): string {
    return Array.from(this.#run(code).a).join("");
  }

  #tick(): void {
    this.#run("next←prev tick board ⋄ prev←board ⋄ board←next ⋄ gen←gen+1");
    this.#send();
  }

  /** A click: the index of one cell. It goes into APL code, so it must be a number on the board. */
  #flip(data: unknown): void {
    if (typeof data !== "string" || !/^\d{1,6}$/.test(data) || Number(data) >= this.#cells) return;
    this.#run(`board←${data} flip board`);
    this.#send();
  }

  #send(): void {
    const frame = this.#text("gen frame board");
    for (const socket of this.#sockets) socket.send(frame);
  }

  #leave(socket: WebSocket): void {
    this.#sockets.delete(socket);
    if (this.#sockets.size === 0 && this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }
}
