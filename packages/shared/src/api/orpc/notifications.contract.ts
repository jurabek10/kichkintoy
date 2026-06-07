import { oc } from "@orpc/contract";
import {
  markNotificationReadInputSchema,
  notificationListInputSchema,
  notificationListResponseSchema,
  notificationSummarySchema,
  notificationUnreadCountResponseSchema,
} from "../notifications.js";

export const notificationsContract = {
  list: oc.input(notificationListInputSchema).output(notificationListResponseSchema),
  unreadCount: oc.output(notificationUnreadCountResponseSchema),
  markRead: oc
    .input(markNotificationReadInputSchema)
    .output(notificationSummarySchema),
  markAllRead: oc.output(notificationUnreadCountResponseSchema),
};
