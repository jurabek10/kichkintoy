"use client";

import { usePathname } from "next/navigation";
import { StepIndicator } from "@/components/step-indicator";
import { stepIndexFor, useSignup } from "./SignupContext";

const labels: Record<string, string> = {
  "/signup": "Phone",
  "/signup/credentials": "Account",
  "/signup/role": "Role",
  "/signup/center": "Kindergarten",
  "/signup/class": "Class",
  "/signup/director-setup": "Center setup",
  "/signup/child": "Child",
  "/signup/relationship": "Relationship",
  "/signup/review": "Review",
};

export function SignupProgress() {
  const pathname = usePathname();
  const { draft } = useSignup();
  const { current, total } = stepIndexFor(pathname, draft);

  const matchKey = Object.keys(labels).find(
    (key) => pathname === key || pathname.startsWith(`${key}/`),
  );
  const label = matchKey ? labels[matchKey] : undefined;

  return <StepIndicator current={current} total={total} label={label} />;
}
