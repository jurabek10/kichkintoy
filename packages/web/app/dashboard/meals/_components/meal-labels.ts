import type {
  MealAudienceType,
  MealEatingStatus,
  MealType,
} from "@kichkintoy/shared";

type MealStatus = "draft" | "published";

export function mealTypeLabelKey(type: MealType) {
  if (type === "breakfast") return "mealType.breakfast";
  if (type === "lunch") return "mealType.lunch";
  if (type === "snack") return "mealType.snack";
  return "mealType.dinner";
}

export function mealAudienceLabelKey(type: MealAudienceType) {
  return type === "center"
    ? "audience.wholeCenter"
    : "audience.selectedClasses";
}

export function mealStatusLabelKey(status: MealStatus) {
  return status === "draft" ? "status.draft" : "status.published";
}

export function eatingStatusLabelKey(status: MealEatingStatus) {
  if (status === "ate_all") return "eatingStatus.ateAll";
  if (status === "ate_most") return "eatingStatus.ateMost";
  if (status === "ate_some") return "eatingStatus.ateSome";
  return "eatingStatus.didNotEat";
}
