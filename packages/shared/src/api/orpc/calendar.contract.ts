import { oc } from "@orpc/contract";
import {
  calendarEventIdInputSchema,
  calendarEventListResponseSchema,
  calendarEventSummarySchema,
  calendarListInputSchema,
  calendarReminderPublishInputSchema,
  calendarReminderPublishResponseSchema,
  calendarUpcomingInputSchema,
  cancelCalendarEventInputSchema,
  createCalendarEventInputSchema,
  updateCalendarEventInputSchema,
} from "../calendar.js";

export const calendarContract = {
  staffList: oc
    .input(calendarListInputSchema)
    .output(calendarEventListResponseSchema),
  parentList: oc
    .input(calendarListInputSchema)
    .output(calendarEventListResponseSchema),
  upcoming: oc
    .input(calendarUpcomingInputSchema)
    .output(calendarEventListResponseSchema),
  detail: oc.input(calendarEventIdInputSchema).output(calendarEventSummarySchema),
  create: oc
    .input(createCalendarEventInputSchema)
    .output(calendarEventSummarySchema),
  update: oc
    .input(updateCalendarEventInputSchema)
    .output(calendarEventSummarySchema),
  cancel: oc
    .input(cancelCalendarEventInputSchema)
    .output(calendarEventSummarySchema),
  markSeen: oc
    .input(calendarEventIdInputSchema)
    .output(calendarEventSummarySchema),
  publishDueReminders: oc
    .input(calendarReminderPublishInputSchema)
    .output(calendarReminderPublishResponseSchema),
};
