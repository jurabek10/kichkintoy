import type {
  SpecialInterestLevel,
  SpecialParticipation,
  SpecialProgressLevel,
} from "@kichkintoy/shared";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type ObservationDraft = {
  participation: SpecialParticipation;
  progressLevel: SpecialProgressLevel;
  interestLevel: SpecialInterestLevel;
  strongSkillKeys: string;
  needsPracticeSkillKeys: string;
  teacherNote: string;
  homePractice: string;
  visibleToParent: boolean;
};

export const participationOptions: SpecialParticipation[] = [
  "active",
  "normal",
  "shy",
  "absent",
];

export const progressOptions: SpecialProgressLevel[] = [
  "strong",
  "improving",
  "needs_support",
];

export const interestOptions: SpecialInterestLevel[] = ["high", "medium", "low"];

export function defaultObservation(): ObservationDraft {
  return {
    participation: "normal",
    progressLevel: "improving",
    interestLevel: "medium",
    strongSkillKeys: "",
    needsPracticeSkillKeys: "",
    teacherNote: "",
    homePractice: "",
    visibleToParent: true,
  };
}

export function splitSkills(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean)
    .slice(0, 20);
}

export function specialClassLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function todayWeekday() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function monthStart() {
  return `${currentMonth()}-01`;
}

export function monthEnd() {
  const [year, month] = currentMonth().split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export async function invalidateSpecial(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.specialClasses.all(),
  });
}
