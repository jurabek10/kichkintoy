import { PrismaService } from "../database/prisma.service";
import { tashkentDayBounds } from "./cron-date";

/** Canonical scheduled-event lookup used by parent and teacher tomorrow jobs. */
export function scheduledEventsForDate(prisma: PrismaService, date: string) {
  const bounds = tashkentDayBounds(date);
  return prisma.calendarEvent.findMany({
    where: {
      status: "scheduled",
      startsAt: { gte: bounds.start, lt: bounds.end },
    },
    include: { classes: true, children: true },
    orderBy: { startsAt: "asc" },
  });
}
