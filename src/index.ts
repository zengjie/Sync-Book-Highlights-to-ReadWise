import { Env } from './types';
import { HighlightManager } from './managers/highlight';
import { printJSON } from './utils';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // only allow access to root endpoint
    if (new URL(request.url).pathname !== "/force-sync") {
      return new Response("", { status: 404 });
    }

    const results = await new HighlightManager(env).syncBookHighlights();
    return printJSON(results);
  },
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(new HighlightManager(env).syncBookHighlights());
  },
};
