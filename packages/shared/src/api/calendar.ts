import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const calendarAudienceTypeValues = ["center", "class", "child"] as const;
export const calendarAudienceTypeSchema = z.enum(calendarAudienceTypeValues);
export type CalendarAudienceType = z.infer<typeof calendarAudienceTypeSchema>;

export const calendarEventStatusValues = [
  "scheduled",
  "cancelled",
  "completed",
] as const;
export const calendarEventStatusSchema = z.enum(calendarEventStatusValues);
export type CalendarEventStatus = z.infer<typeof calendarEventStatusSchema>;

export const calendarReminderMinutesValues = [60, 1440, 4320] as const;
export const calendarReminderMinutesSchema = z.union([
  z.literal(60),
  z.literal(1440),
  z.literal(4320),
]);
export type CalendarReminderMinutes = z.infer<
  typeof calendarReminderMinutesSchema
>;

export const calendarEventSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
  authorUserId: uuidSchema,
  authorName: z.string(),
  audienceType: calendarAudienceTypeSchema,
  classIds: z.array(uuidSchema),
  classNames: z.array(z.string()),
  childIds: z.array(uuidSchema),
  childNames: z.array(z.string()),
  title: z.string(),
  description: z.string().nullable(),
  locationText: z.string().nullable(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullable(),
  allDay: z.boolean(),
  status: calendarEventStatusSchema,
  cancellationReason: z.string().nullable(),
  reminderMinutesBefore: calendarReminderMinutesSchema.nullable(),
  reminderSentAt: isoDateTimeSchema.nullable(),
  seenByMe: z.boolean(),
  seenCount: z.number().int().min(0),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type CalendarEventSummary = z.infer<typeof calendarEventSummarySchema>;

export const calendarEventListResponseSchema = z.array(
  calendarEventSummarySchema,
);
export type CalendarEventListResponse = z.infer<
  typeof calendarEventListResponseSchema
>;

const calendarEventInputShape = {
  audienceType: calendarAudienceTypeSchema,
  classIds: z.array(uuidSchema).optional(),
  childIds: z.array(uuidSchema).optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  locationText: z.string().trim().max(300).optional(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.optional(),
  allDay: z.boolean().optional(),
  reminderMinutesBefore: calendarReminderMinutesSchema.nullable().optional(),
};

function validateCalendarEventCreateAudience(
  value: {
    audienceType: CalendarAudienceType;
    classIds?: string[];
    childIds?: string[];
    startsAt: string;
    endsAt?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "End time must be after start time.",
    });
  }
  if (value.audienceType === "class" && !value.classIds?.length) {
    ctx.addIssue({
      code: "custom",
      path: ["classIds"],
      message: "Choose at least one class.",
    });
  }
  if (value.audienceType === "child" && !value.childIds?.length) {
    ctx.addIssue({
      code: "custom",
      path: ["childIds"],
      message: "Choose at least one child.",
    });
  }
  if (value.audienceType === "center") {
    if (value.classIds?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["classIds"],
        message: "Center events cannot include class IDs.",
      });
    }
    if (value.childIds?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["childIds"],
        message: "Center events cannot include child IDs.",
      });
    }
  }
}

export const createCalendarEventInputSchema = z
  .object({
    centerId: uuidSchema,
    ...calendarEventInputShape,
  })
  .superRefine(validateCalendarEventCreateAudience);
export type CreateCalendarEventInput = z.infer<
  typeof createCalendarEventInputSchema
>;

export const updateCalendarEventInputSchema = z.object({
  eventId: uuidSchema,
  body: z.object(calendarEventInputShape).partial().superRefine((value, ctx) => {
    if (
      value.endsAt &&
      value.startsAt &&
      new Date(value.endsAt) <= new Date(value.startsAt)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must be after start time.",
      });
    }
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one event field is required.",
      });
    }
  }),
});
export type UpdateCalendarEventInput = z.infer<
  typeof updateCalendarEventInputSchema
>;

export const cancelCalendarEventInputSchema = z.object({
  eventId: uuidSchema,
  cancellationReason: z.string().trim().max(500).optional(),
});
export type CancelCalendarEventInput = z.infer<
  typeof cancelCalendarEventInputSchema
>;

export const calendarListInputSchema = z.object({
  centerId: uuidSchema.optional(),
  childId: uuidSchema.optional(),
  from: isoDateTimeSchema,
  to: isoDateTimeSchema,
  status: calendarEventStatusSchema.optional(),
});
export type CalendarListInput = z.infer<typeof calendarListInputSchema>;

export const calendarUpcomingInputSchema = z
  .object({
    centerId: uuidSchema.optional(),
    childId: uuidSchema.optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .optional();
export type CalendarUpcomingInput = z.infer<
  typeof calendarUpcomingInputSchema
>;

export const calendarEventIdInputSchema = z.object({
  eventId: uuidSchema,
});

// --- Birthdays ------------------------------------------------------------
// Derived (non-persisted) classmate birthdays for the parent's calendar. A
// child's date of birth is reduced to the occurrence date + the age reached,
// so raw DOB is never exposed across the class.

export const calendarBirthdaysInputSchema = z.object({
  centerId: uuidSchema.optional(),
  childId: uuidSchema.optional(),
  from: isoDateSchema,
  to: isoDateSchema,
});
export type CalendarBirthdaysInput = z.infer<
  typeof calendarBirthdaysInputSchema
>;

export const calendarBirthdayEntrySchema = z.object({
  childId: uuidSchema,
  childName: z.string(),
  photoUrl: z.string().nullable(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
  /** The birthday's occurrence inside the requested range ("YYYY-MM-DD"). */
  date: isoDateSchema,
  /** Age the child reaches on `date`. */
  turningAge: z.number().int().min(0),
  /** True when this is one of the requesting parent's own children. */
  isOwnChild: z.boolean(),
});
export type CalendarBirthdayEntry = z.infer<
  typeof calendarBirthdayEntrySchema
>;

export const calendarBirthdayListResponseSchema = z.array(
  calendarBirthdayEntrySchema,
);
export type CalendarBirthdayListResponse = z.infer<
  typeof calendarBirthdayListResponseSchema
>;

export const calendarReminderPublishInputSchema = z
  .object({
    now: isoDateTimeSchema.optional(),
  })
  .optional();

export const calendarReminderPublishResponseSchema = z.object({
  sent: z.number().int().min(0),
});
export type CalendarReminderPublishResponse = z.infer<
  typeof calendarReminderPublishResponseSchema
>;
