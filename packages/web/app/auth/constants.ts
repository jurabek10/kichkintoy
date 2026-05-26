import type { RelationshipType, SignupForm, UserRole } from "./types";

export const authTokenStorageKey = "kichkintoy_auth_token";

export const authApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export const roleOptions: Array<{
  value: UserRole;
  title: string;
  description: string;
}> = [
  {
    value: "director",
    title: "Director",
    description: "Manage your kindergarten, classes, teachers, and messages."
  },
  {
    value: "parent",
    title: "Parent",
    description: "Follow your child's day and communicate with the center."
  },
  {
    value: "teacher",
    title: "Teacher",
    description: "Share reports, photos, notices, and attendance with families."
  }
];

export const relationshipOptions: Array<{
  value: RelationshipType;
  label: string;
}> = [
  { value: "mom", label: "Mom" },
  { value: "dad", label: "Dad" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" }
];

export const initialSignupForm: SignupForm = {
  fullName: "",
  phoneNumber: "",
  verificationCode: "",
  phoneVerificationToken: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "",
  childClass: "",
  childImageName: "",
  childImagePreview: "",
  childName: "",
  childDateOfBirth: "",
  childGender: "",
  relationshipType: "",
  customRelationshipLabel: ""
};
