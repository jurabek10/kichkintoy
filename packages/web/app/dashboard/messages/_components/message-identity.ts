import type { MessageContact, MessageParticipant } from "@kichkintoy/shared";
import type { TFunction } from "i18next";

type IdentityPerson = Pick<MessageContact | MessageParticipant, "displayName" | "parentContext"> & {
  role?: MessageContact["role"];
  classLabel?: string | null;
};

export type IdentityParts = {
  /** Bold line: staff name, or the child + relationship for parents. */
  primary: string;
  /** Muted context line: role/class for staff, class + parent name for parents. */
  secondary: string | null;
  /** Everything joined, for search filtering. */
  searchText: string;
};

export function messageIdentityParts(person: IdentityPerson, t: TFunction<"messages">): IdentityParts {
  const context = person.parentContext;
  if (!context) {
    const role = person.role ? t(`roles.${person.role}`) : null;
    const secondary = [role, person.classLabel].filter(Boolean).join(" · ") || null;
    return {
      primary: person.displayName,
      secondary,
      searchText: [person.displayName, secondary].filter(Boolean).join(" "),
    };
  }
  const relationshipLabel = translateRelationship(context.relationship, t);
  const primary = `${context.childName} · ${relationshipLabel}`;
  const secondary = `${context.className} · ${person.displayName}`;
  return { primary, secondary, searchText: `${primary} ${secondary}` };
}

function translateRelationship(relationship: string, t: TFunction<"messages">) {
  const normalized = relationship.trim().toLocaleLowerCase();
  const key = normalized === "father" ? "dad" : normalized === "mother" ? "mom" : normalized;
  const fallback = normalized
    ? normalized.replace(/^./, (letter) => letter.toLocaleUpperCase())
    : t("relationships.guardian", { defaultValue: "Guardian" });
  return t(`relationships.${key}` as "relationships.guardian", { defaultValue: fallback });
}
