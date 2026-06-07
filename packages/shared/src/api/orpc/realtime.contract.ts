import { oc } from "@orpc/contract";
import { createRealtimeTicketResponseSchema } from "../realtime.js";

export const realtimeContract = {
  createTicket: oc.output(createRealtimeTicketResponseSchema),
};
