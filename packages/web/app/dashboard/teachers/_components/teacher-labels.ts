import type { AssignmentRole } from "@kichkintoy/shared";

export function assignmentRoleLabelKey(role: AssignmentRole) {
  if (role === "assistant_teacher") return "assignmentRole.assistantTeacher";
  return "assignmentRole.teacher";
}
