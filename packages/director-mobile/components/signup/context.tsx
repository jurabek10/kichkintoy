import {
  childGenderValues,
  relationshipTypeValues,
  userRoleValues,
} from '@kichkintoy/shared';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type ChildGender = (typeof childGenderValues)[number];
export type RelationshipType = (typeof relationshipTypeValues)[number];
export type UserRole = (typeof userRoleValues)[number];

export type SignupDraft = {
  fullName: string;
  phoneNumber: string;
  phoneVerificationToken: string;
  username: string;
  password: string;
  role: UserRole;
  centerId: string | null;
  centerName: string | null;
  classId: string | null;
  className: string | null;
  childName: string;
  childDateOfBirth: string; // ISO date
  childGender: ChildGender | '';
  relationshipType: RelationshipType | '';
};

const initialDraft: SignupDraft = {
  fullName: '',
  phoneNumber: '',
  phoneVerificationToken: '',
  username: '',
  password: '',
  role: 'parent',
  centerId: null,
  centerName: null,
  classId: null,
  className: null,
  childName: '',
  childDateOfBirth: '',
  childGender: '',
  relationshipType: '',
};

/** Ordered steps of the parent signup wizard. */
export const SIGNUP_STEPS = [
  'account',
  'credentials',
  'role',
  'center',
  'child',
  'relationship',
  'review',
] as const;

export type SignupStep = (typeof SIGNUP_STEPS)[number];

type SignupContextValue = {
  draft: SignupDraft;
  update: (patch: Partial<SignupDraft>) => void;
  step: SignupStep;
  stepIndex: number;
  stepCount: number;
  next: () => void;
  back: () => void;
};

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SignupDraft>(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);

  const value = useMemo<SignupContextValue>(
    () => ({
      draft,
      update: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      step: SIGNUP_STEPS[stepIndex],
      stepIndex,
      stepCount: SIGNUP_STEPS.length,
      next: () => setStepIndex((i) => Math.min(i + 1, SIGNUP_STEPS.length - 1)),
      back: () => setStepIndex((i) => Math.max(i - 1, 0)),
    }),
    [draft, stepIndex],
  );

  return <SignupContext.Provider value={value}>{children}</SignupContext.Provider>;
}

export function useSignup() {
  const context = useContext(SignupContext);
  if (!context) throw new Error('useSignup must be used within SignupProvider');
  return context;
}
