export type NotificationTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type JsonObject = Record<string, unknown>;

export function renderCronNotificationBody(
  notificationType: string,
  metadata: unknown,
  t: NotificationTranslate,
  fallback: string | null = null,
): string | null {
  if (notificationType === "digest.daily")
    return renderDaily(metadata, t) ?? fallback;
  if (notificationType === "digest.tomorrow_events")
    return renderEvents(metadata, t) ?? fallback;
  if (notificationType === "payment.reminder")
    return renderPayment(metadata, t) ?? fallback;
  if (notificationType === "digest.weekly")
    return renderWeekly(metadata, t) ?? fallback;
  if (notificationType === "document.deadline_reminder")
    return renderDocument(metadata, t) ?? fallback;
  if (notificationType === "notice.unread_nudge")
    return renderNotices(metadata, t) ?? fallback;
  if (notificationType === "teacher.attendance_summary")
    return renderTeacherAttendance(metadata, t) ?? fallback;
  if (notificationType === "teacher.medications_today")
    return renderTeacherMedications(metadata, t) ?? fallback;
  if (notificationType === "teacher.end_of_day")
    return renderTeacherEndOfDay(metadata, t) ?? fallback;
  if (notificationType === "teacher.tomorrow_reminder")
    return renderTeacherTomorrow(metadata, t) ?? fallback;
  if (notificationType === "teacher.notice_reminder")
    return renderTeacherNotices(metadata, t) ?? fallback;
  return fallback;
}

function renderTeacherAttendance(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const classes = array(value)
    .map(object)
    .filter((item): item is JsonObject => item !== null);
  if (classes.length === 0) return null;
  const lines = classes
    .filter((item) => string(item.className) && number(item.total))
    .map((item) => {
      const reasons = array(item.absences)
        .map(object)
        .map((absence) => absence?.reason)
        .filter(string);
      return t("cron.teacher.attendance.class", {
        className: item.className,
        total: item.total,
        present: number(item.presentCount) ? item.presentCount : 0,
        absent: array(item.absences).length,
        reasons: reasons.length > 0 ? ` (${reasons.join("; ")})` : "",
        notMarked: number(item.notMarkedCount) ? item.notMarkedCount : 0,
      });
    });
  return lines.length > 0 ? lines.join(" · ") : null;
}

function renderTeacherMedications(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const rows = array(value)
    .map(object)
    .filter((item): item is JsonObject => item !== null);
  if (rows.length === 0) return null;
  const lines = rows
    .filter((item) => string(item.childFirstName) && string(item.medicineName))
    .map((item) =>
      t("cron.teacher.medications.item", {
        child: item.childFirstName,
        medicine: item.medicineName,
        dosage: item.dosage ?? "",
        time: item.medicationTime ?? "",
      }),
    );
  return lines.length > 0 ? lines.join(" · ") : null;
}

function renderTeacherEndOfDay(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const data = object(value);
  if (!data) return null;
  const keys = [
    "missingCheckouts",
    "missingMealStatuses",
    "missingReports",
    "unansweredParents",
    "submissionsToReview",
  ] as const;
  const parts = keys
    .filter((key) => number(data[key]) && (data[key] as number) > 0)
    .map((key) => t(`cron.teacher.endOfDay.${key}`, { count: data[key] }));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function renderTeacherTomorrow(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const data = object(value);
  if (!data) return null;
  const events = array(data.events)
    .map(object)
    .filter((item): item is JsonObject => item !== null);
  const birthdays = array(data.birthdays)
    .map(object)
    .filter((item): item is JsonObject => item !== null);
  const parts: string[] = [];
  if (events.length > 0) {
    parts.push(
      events
        .map((event) =>
          t("cron.teacher.tomorrow.event", {
            title: event.title ?? "",
            time:
              string(event.startsAt) && !event.allDay
                ? time(event.startsAt as string)
                : t("cron.events.allDay"),
          }),
        )
        .join(" · "),
    );
  }
  const names = birthdays.map((item) => item.childFirstName).filter(string);
  if (names.length > 0)
    parts.push(
      t("cron.teacher.tomorrow.birthdays", { names: names.join(", ") }),
    );
  return parts.length > 0
    ? t("cron.teacher.tomorrow.summary", { items: parts.join(" · ") })
    : null;
}

function renderTeacherNotices(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const notices = array(value)
    .map(object)
    .filter((item): item is JsonObject => item !== null);
  const titles = notices.map((item) => item.title).filter(string);
  return titles.length > 0
    ? t("cron.teacher.notices.summary", {
        count: titles.length,
        titles: titles.join(" · "),
      })
    : null;
}

function renderDaily(value: unknown, t: NotificationTranslate): string | null {
  const data = object(value);
  if (!data) return null;
  const parts: string[] = [];
  if (string(data.checkInAt))
    parts.push(
      t("cron.daily.arrived", { time: time(data.checkInAt as string) }),
    );
  if (string(data.checkOutAt))
    parts.push(t("cron.daily.left", { time: time(data.checkOutAt as string) }));
  if (string(data.pickedUpBy)) {
    parts.push(
      t("cron.daily.pickedUp", {
        name: data.pickedUpBy,
        relationship: string(data.pickedUpRelationship)
          ? t(`cron.relationships.${data.pickedUpRelationship}`, {
              defaultValue: data.pickedUpRelationship,
            })
          : "",
      }),
    );
  }
  for (const rawMeal of array(data.meals)) {
    const meal = object(rawMeal);
    if (!meal || !string(meal.mealType) || !string(meal.menuText)) continue;
    parts.push(
      t("cron.daily.meal", {
        meal: t(`cron.mealTypes.${meal.mealType}`, {
          defaultValue: meal.mealType,
        }),
        menu: meal.menuText,
        status: string(meal.eatingStatus)
          ? t(`cron.eatingStatus.${meal.eatingStatus}`, {
              defaultValue: meal.eatingStatus,
            })
          : t("cron.eatingStatus.not_recorded"),
      }),
    );
  }
  if (number(data.sleepMinutes) && (data.sleepMinutes as number) > 0) {
    parts.push(
      t("cron.daily.sleep", {
        duration: duration(data.sleepMinutes as number, t),
      }),
    );
  } else if (data.sleepRestless === true) {
    parts.push(t("cron.daily.sleepRestless"));
  }
  const activities = array(data.activities)
    .map((item) => object(item)?.title)
    .filter(string);
  if (activities.length > 0)
    parts.push(t("cron.daily.activities", { items: activities.join(", ") }));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function renderEvents(value: unknown, t: NotificationTranslate): string | null {
  const events = array(value)
    .map(object)
    .filter((item): item is JsonObject => item !== null);
  if (events.length === 0) return null;
  const labels = events.map((event) => {
    const details = [
      string(event.startsAt) && !event.allDay
        ? time(event.startsAt as string)
        : t("cron.events.allDay"),
      string(event.locationText) ? event.locationText : null,
    ]
      .filter(string)
      .join(", ");
    return t("cron.events.item", { title: event.title, details });
  });
  return t("cron.events.summary", {
    count: events.length,
    items: labels.join(" · "),
  });
}

function renderPayment(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const data = object(value);
  if (!data || !number(data.amount) || !string(data.phase)) return null;
  return t("cron.payment.summary", {
    child: data.childFirstName ?? "",
    amount: money(data.amount as number, String(data.currency ?? "UZS")),
    dueDate: string(data.dueDate) ? numericDate(data.dueDate as string) : "",
    phase: t(`cron.payment.phases.${data.phase}`),
  });
}

function renderWeekly(value: unknown, t: NotificationTranslate): string | null {
  const data = object(value);
  if (!data) return null;
  const parts = [
    t("cron.weekly.attendance", {
      attended: data.attendedDays ?? 0,
      operating: data.operatingDays ?? 0,
    }),
    t("cron.weekly.photos", { count: data.photoCount ?? 0 }),
    t("cron.weekly.reports", { count: data.reportCount ?? 0 }),
    t("cron.weekly.notices", { count: data.noticeCount ?? 0 }),
  ];
  return parts.join(" · ");
}

function renderDocument(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const data = object(value);
  if (!data || !string(data.title) || !number(data.daysLeft)) return null;
  return t("cron.document.summary", {
    title: data.title,
    count: data.daysLeft,
  });
}

function renderNotices(
  value: unknown,
  t: NotificationTranslate,
): string | null {
  const notices = array(value)
    .map(object)
    .filter((item): item is JsonObject => item !== null);
  if (notices.length === 0) return null;
  return t("cron.notices.summary", {
    count: notices.length,
    titles: notices
      .map((notice) => notice.title)
      .filter(string)
      .join(" · "),
  });
}

function duration(minutes: number, t: NotificationTranslate): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest)
    return t("cron.duration.hoursMinutes", { hours, minutes: rest });
  if (hours) return t("cron.duration.hours", { count: hours });
  return t("cron.duration.minutes", { count: rest });
}

function money(amount: number, currency: string): string {
  const formatted = Math.round(amount).toLocaleString("de-DE");
  return currency === "UZS" ? `${formatted} so'm` : `${formatted} ${currency}`;
}

function numericDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

function time(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function number(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
