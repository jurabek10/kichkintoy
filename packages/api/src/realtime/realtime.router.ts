import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createRealtimeRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    createTicket: os.realtime.createTicket
      .use(access.authed)
      .handler(({ context }) =>
        deps.realtimeService.createTicket(context.user.id),
      ),
  };
}
