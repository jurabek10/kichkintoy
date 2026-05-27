import type {
  AuthResponse,
  ChildGender,
  RelationshipType,
  UserRole,
} from "@kichkintoy/shared";
import type { ChangeEvent, FormEvent } from "react";

export type AuthMode = "login" | "signup";
export type SignupStep =
  | "phone"
  | "credentials"
  | "role"
  | "child"
  | "relationship";
export type { AuthResponse, RelationshipType, UserRole };
export type Gender = ChildGender;
export type CodeStatus = "idle" | "sending" | "sent" | "verified";

export type SignupForm = {
  fullName: string;
  phoneNumber: string;
  verificationCode: string;
  phoneVerificationToken: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: UserRole | "";
  childClass: string;
  childImageName: string;
  childImagePreview: string;
  childName: string;
  childDateOfBirth: string;
  childGender: Gender | "";
  relationshipType: RelationshipType | "";
  customRelationshipLabel: string;
};

export type FormErrors = Record<string, string>;

export type UpdateSignupField = <K extends keyof SignupForm>(
  field: K,
  value: SignupForm[K],
) => void;

export type SubmitHandler = (event: FormEvent<HTMLFormElement>) => void;
export type ImageChangeHandler = (event: ChangeEvent<HTMLInputElement>) => void;
