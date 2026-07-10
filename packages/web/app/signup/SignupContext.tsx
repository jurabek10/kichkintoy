"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ChildGender,
  FacilityType,
  InvitationKind,
  PendingInvitation,
  RelationshipType,
  UserRole,
} from "@kichkintoy/shared";
import { signupDraftStorageKey } from "@/lib/config";

export type SignupDraft = {
  fullName: string;
  phoneNumber: string;
  verificationCode: string;
  phoneVerificationToken: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: UserRole | "";

  invitationId: string | null;
  invitationKind: InvitationKind | null;
  invitationLabel: string | null;

  centerId: string | null;
  centerName: string | null;
  centerCode: string | null;
  classId: string | null;
  className: string | null;

  director: {
    mode: "create_new" | "claim_existing" | "";
    claimCenterId: string | null;
    claimCenterName: string | null;
    facilityType: FacilityType;
    organizationName: string;
    centerName: string;
    regionId: string;
    districtId: string;
    address: string;
    centerPhone: string;
    defaultLanguage: "uz" | "ru";
  };

  childName: string;
  childImageUrl: string;
  childDateOfBirth: string;
  childGender: ChildGender | "";
  relationshipType: RelationshipType | "";
  customRelationshipLabel: string;
};

export const initialDraft: SignupDraft = {
  fullName: "",
  phoneNumber: "",
  verificationCode: "",
  phoneVerificationToken: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "",
  invitationId: null,
  invitationKind: null,
  invitationLabel: null,
  centerId: null,
  centerName: null,
  centerCode: null,
  classId: null,
  className: null,
  director: {
    mode: "",
    claimCenterId: null,
    claimCenterName: null,
    facilityType: "kindergarten",
    organizationName: "",
    centerName: "",
    regionId: "",
    districtId: "",
    address: "",
    centerPhone: "",
    defaultLanguage: "uz",
  },
  childName: "",
  childImageUrl: "",
  childDateOfBirth: "",
  childGender: "",
  relationshipType: "",
  customRelationshipLabel: "",
};

type SignupContextValue = {
  draft: SignupDraft;
  setDraft: (updater: (current: SignupDraft) => SignupDraft) => void;
  reset: () => void;
  acceptInvitation: (invitation: PendingInvitation) => void;
  declineInvitation: () => void;
};

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<SignupDraft>(initialDraft);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(signupDraftStorageKey);
    if (raw) {
      try {
        setDraftState({ ...initialDraft, ...JSON.parse(raw) });
      } catch {
        // ignore
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    window.sessionStorage.setItem(signupDraftStorageKey, JSON.stringify(draft));
  }, [draft, loaded]);

  const setDraft = useCallback(
    (updater: (current: SignupDraft) => SignupDraft) => {
      setDraftState((current) => updater(current));
    },
    [],
  );

  const reset = useCallback(() => {
    setDraftState(initialDraft);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(signupDraftStorageKey);
    }
  }, []);

  const acceptInvitation = useCallback(
    (invitation: PendingInvitation) => {
      setDraftState((current) => ({
        ...current,
        // The invitation kind decides the signup role — including "director"
        // for platform-admin invitations, which skip the center-setup step.
        role: invitation.kind,
        invitationId: invitation.id,
        invitationKind: invitation.kind,
        invitationLabel: `${invitation.center.name}${invitation.class ? ` · ${invitation.class.name}` : ""}`,
        centerId: invitation.center.id,
        centerName: invitation.center.name,
        centerCode: invitation.center.centerCode,
        classId: invitation.class?.id ?? null,
        className: invitation.class?.name ?? null,
      }));
    },
    [],
  );

  const declineInvitation = useCallback(() => {
    setDraftState((current) => ({
      ...current,
      invitationId: null,
      invitationKind: null,
      invitationLabel: null,
    }));
  }, []);

  const value = useMemo<SignupContextValue>(
    () => ({ draft, setDraft, reset, acceptInvitation, declineInvitation }),
    [draft, setDraft, reset, acceptInvitation, declineInvitation],
  );

  return (
    <SignupContext.Provider value={value}>{children}</SignupContext.Provider>
  );
}

export function useSignup(): SignupContextValue {
  const value = useContext(SignupContext);
  if (!value) {
    throw new Error("useSignup must be used inside <SignupProvider>");
  }
  return value;
}

export function stepIndexFor(
  pathname: string,
  draft: SignupDraft,
): { current: number; total: number } {
  const order = stepOrderFor(draft);
  // Every step path starts with "/signup", so a plain prefix check always
  // matches the first entry. Pick the most specific (longest) matching step.
  let index = -1;
  let bestLength = -1;
  order.forEach((step, stepIndex) => {
    const matches = pathname === step || pathname.startsWith(`${step}/`);
    if (matches && step.length > bestLength) {
      index = stepIndex;
      bestLength = step.length;
    }
  });
  return {
    current: index === -1 ? 1 : index + 1,
    total: order.length,
  };
}

export function stepOrderFor(draft: SignupDraft): string[] {
  if (draft.role === "director") {
    // An invited director joins the prepared center directly — no
    // claim-or-create setup step.
    if (draft.invitationId) {
      return ["/signup", "/signup/credentials", "/signup/role"];
    }
    return [
      "/signup",
      "/signup/credentials",
      "/signup/role",
      "/signup/director-setup",
    ];
  }

  if (draft.role === "parent") {
    if (draft.invitationId) {
      return [
        "/signup",
        "/signup/credentials",
        "/signup/role",
        "/signup/child",
        "/signup/relationship",
      ];
    }
    return [
      "/signup",
      "/signup/credentials",
      "/signup/role",
      "/signup/center",
      "/signup/class",
      "/signup/child",
      "/signup/relationship",
    ];
  }

  if (draft.role === "teacher") {
    if (draft.invitationId) {
      return ["/signup", "/signup/credentials", "/signup/role"];
    }
    return [
      "/signup",
      "/signup/credentials",
      "/signup/role",
      "/signup/center",
    ];
  }

  return ["/signup", "/signup/credentials", "/signup/role"];
}
