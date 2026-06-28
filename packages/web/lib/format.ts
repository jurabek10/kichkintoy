import { format } from "date-fns";
import type { FacilityType } from "@kichkintoy/shared";
import { fallbackLng } from "@kichkintoy/translations/settings";
import { dateLocale, toUzbekistanDate } from "./date";

/**
 * Locale-aware labels and dates.
 *
 * These are plain functions (called in render, not hooks), so they read the
 * active language from `<html lang>` — which the language switcher keeps in
 * sync by reloading the page on change. That avoids threading a `t`/locale
 * argument through dozens of call sites while still rendering enum labels and
 * dates in the chosen language (previously everything was hardcoded English /
 * the runtime default locale).
 */
function activeLanguage(): string {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang.slice(0, 2);
  }
  return fallbackLng.slice(0, 2);
}

type LabelMap = Record<string, Record<string, string>>;

function translate(map: LabelMap, value: string, fallback = value): string {
  const lang = activeLanguage();
  return map[lang]?.[value] ?? map.en?.[value] ?? fallback;
}

const facilityType: LabelMap = {
  en: { kindergarten: "Kindergarten", daycare: "Daycare", academy: "Academy" },
  ru: { kindergarten: "Детский сад", daycare: "Ясли", academy: "Академия" },
  uz: { kindergarten: "Bog‘cha", daycare: "Yasli", academy: "Akademiya" },
};

const assignmentRole: LabelMap = {
  en: { assistant_teacher: "Assistant", teacher: "Teacher" },
  ru: { assistant_teacher: "Помощник", teacher: "Воспитатель" },
  uz: { assistant_teacher: "Yordamchi", teacher: "Tarbiyachi" },
};

const reportStatus: LabelMap = {
  en: { published: "Published", scheduled: "Scheduled", draft: "Draft" },
  ru: { published: "Опубликован", scheduled: "Запланирован", draft: "Черновик" },
  uz: { published: "E’lon qilingan", scheduled: "Rejalashtirilgan", draft: "Qoralama" },
};

const attendanceStatus: LabelMap = {
  en: {
    not_checked_in: "Not checked in",
    present: "Present",
    absent: "Absent",
    late: "Late",
    left_early: "Left early",
    picked_up: "Picked up",
    excused: "Excused",
    cancelled: "Cancelled",
  },
  ru: {
    not_checked_in: "Не отмечен",
    present: "Присутствует",
    absent: "Отсутствует",
    late: "Опоздал",
    left_early: "Ушёл раньше",
    picked_up: "Забрали",
    excused: "По уважительной",
    cancelled: "Отменён",
  },
  uz: {
    not_checked_in: "Belgilanmagan",
    present: "Hozir",
    absent: "Yo‘q",
    late: "Kechikdi",
    left_early: "Erta ketdi",
    picked_up: "Olib ketildi",
    excused: "Sababli",
    cancelled: "Bekor qilindi",
  },
};

const reportItemType: LabelMap = {
  en: {
    meal: "Meal",
    sleep: "Sleep",
    toilet: "Toilet",
    mood: "Mood",
    activity: "Activity",
    temperature: "Temperature",
    medication: "Medication",
    health: "Health",
    class_participation: "Class participation",
    custom: "Custom",
  },
  ru: {
    meal: "Питание",
    sleep: "Сон",
    toilet: "Туалет",
    mood: "Настроение",
    activity: "Занятие",
    temperature: "Температура",
    medication: "Лекарство",
    health: "Здоровье",
    class_participation: "Участие в занятии",
    custom: "Другое",
  },
  uz: {
    meal: "Ovqat",
    sleep: "Uyqu",
    toilet: "Hojatxona",
    mood: "Kayfiyat",
    activity: "Mashg‘ulot",
    temperature: "Harorat",
    medication: "Dori",
    health: "Sog‘liq",
    class_participation: "Mashg‘ulotdagi ishtirok",
    custom: "Boshqa",
  },
};

const participationLevel: LabelMap = {
  en: {
    excellent: "Excellent",
    good: "Good",
    needs_support: "Needs support",
    not_observed: "Not observed",
    absent: "Absent",
  },
  ru: {
    excellent: "Отлично",
    good: "Хорошо",
    needs_support: "Нужна поддержка",
    not_observed: "Не наблюдалось",
    absent: "Отсутствовал",
  },
  uz: {
    excellent: "A’lo",
    good: "Yaxshi",
    needs_support: "Yordam kerak",
    not_observed: "Kuzatilmadi",
    absent: "Qatnashmadi",
  },
};

const participationInterest: LabelMap = {
  en: { high: "High", medium: "Medium", low: "Low", not_observed: "Not observed" },
  ru: { high: "Высокий", medium: "Средний", low: "Низкий", not_observed: "Не наблюдалось" },
  uz: { high: "Yuqori", medium: "O‘rta", low: "Past", not_observed: "Kuzatilmadi" },
};

const gender: LabelMap = {
  en: { boy: "Boy", girl: "Girl", prefer_not_to_say: "Prefer not to say" },
  ru: { boy: "Мальчик", girl: "Девочка", prefer_not_to_say: "Не указано" },
  uz: { boy: "O‘g‘il", girl: "Qiz", prefer_not_to_say: "Aytishni xohlamayman" },
};

export function facilityTypeLabel(value: FacilityType): string {
  return translate(facilityType, value);
}

export function assignmentRoleLabel(value: string): string {
  return translate(assignmentRole, value);
}

export function reportStatusLabel(value: string): string {
  return translate(reportStatus, value);
}

export function attendanceStatusLabel(value: string): string {
  return translate(attendanceStatus, value);
}

export function reportItemTypeLabel(value: string): string {
  return translate(reportItemType, value, translate(reportItemType, "custom"));
}

export function participationLevelLabel(value: string): string {
  return translate(participationLevel, value);
}

export function participationInterestLabel(value: string): string {
  return translate(participationInterest, value);
}

export function genderLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return translate(gender, value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toUzbekistanDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d MMM yyyy", { locale: dateLocale(activeLanguage()) });
}

/** Numeric, language-neutral date — e.g. "25.06.2026". */
export function formatDateNumeric(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = toUzbekistanDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd.MM.yyyy");
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = toUzbekistanDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d MMM yyyy, HH:mm", {
    locale: dateLocale(activeLanguage()),
  });
}

/** Clock time only — e.g. "14:05". Returns "—" when there is no value. */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toUzbekistanDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "HH:mm");
}

/** Day-of-month as a bare number — the big figure on a calendar date rail. */
export function formatDayOfMonth(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = toUzbekistanDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d");
}

/** Abbreviated weekday — e.g. "Mon" / "Dush" — to sit under the day number. */
export function formatWeekdayShort(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const date = toUzbekistanDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "EEE", { locale: dateLocale(activeLanguage()) });
}
