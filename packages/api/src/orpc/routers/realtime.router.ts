import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createRealtimeRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    createTicket: os.realtime.createTicket.handler(async ({ context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.realtimeService.createTicket(user.id);
    }),
  };
}
