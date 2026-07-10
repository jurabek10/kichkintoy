import {
  childGenderSchema,
  directorSetupModeSchema,
  facilityTypeSchema,
  relationshipTypeSchema,
  userRoleSchema,
} from "@kichkintoy/shared";
import { z } from "zod";

export const roleSchema = userRoleSchema;

const phoneNumberSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .regex(/^\+?[0-9\s()-]{9,18}$/, "Phone number is invalid.");

const uuidSchema = z.string().trim().uuid("Must be a valid UUID.");

export const sendCodeSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const verifyCodeSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: z.string().trim().min(4).max(8),
});

export const childRegistrationSchema = z
  .object({
    imageUrl: z.string().trim().url().optional(),
    image: z.string().trim().url().optional(),
    name: z.string().trim().min(1, "Child name is required."),
    dateOfBirth: z.coerce.date(),
    gender: childGenderSchema,
    relationshipType: relationshipTypeSchema,
    customRelationshipLabel: z.string().trim().optional(),
  })
  .transform((value) => ({
    ...value,
    imageUrl: value.imageUrl ?? value.image,
  }))
  .superRefine((value, context) => {
    if (value.dateOfBirth > new Date()) {
      context.addIssue({
        code: "custom",
        message: "Date of birth cannot be in the future.",
        path: ["dateOfBirth"],
      });
    }
  });

const centerSelectionSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema.optional(),
});

const directorCreateNewSchema = z.object({
  facilityType: facilityTypeSchema,
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required."),
  centerName: z.string().trim().min(2, "Kindergarten name is required."),
  regionId: uuidSchema,
  districtId: uuidSchema,
  address: z.string().trim().optional(),
  centerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{6,18}$/, "Center phone is invalid.")
    .optional(),
  defaultLanguage: z.enum(["uz", "ru"]).default("uz"),
});

const directorClaimExistingSchema = z.object({
  centerId: uuidSchema,
});

const directorSetupSchema = z
  .object({
    mode: directorSetupModeSchema,
    claimExisting: directorClaimExistingSchema.optional(),
    createNew: directorCreateNewSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === "claim_existing" && !value.claimExisting) {
      context.addIssue({
        code: "custom",
        message:
          "claimExisting fields are required when mode is 'claim_existing'.",
        path: ["claimExisting"],
      });
    }

    if (value.mode === "create_new" && !value.createNew) {
      context.addIssue({
        code: "custom",
        message: "createNew fields are required when mode is 'create_new'.",
        path: ["createNew"],
      });
    }
  });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required."),
    phoneNumber: phoneNumberSchema,
    phoneVerificationToken: z.string().trim().min(1),
    username: z.string().trim().min(3).max(40),
    password: z
      .string()
      .min(8)
      .regex(/[A-Za-z]/, "Password must include a letter.")
      .regex(/\d/, "Password must include a number."),
    role: roleSchema,
    invitationId: uuidSchema.optional(),
    centerSelection: centerSelectionSchema.optional(),
    directorSetup: directorSetupSchema.optional(),
    child: childRegistrationSchema.optional(),
  })
  .superRefine((value, context) => {
    const hasInvitation = Boolean(value.invitationId);

    if (value.role === "parent") {
      if (!value.child) {
        context.addIssue({
          code: "custom",
          message: "Child information is required for parent registration.",
          path: ["child"],
        });
      }

      if (!hasInvitation && !value.centerSelection) {
        context.addIssue({
          code: "custom",
          message:
            "Center selection is required for parent registration without an invitation.",
          path: ["centerSelection"],
        });
      }
    }

    if (value.role === "teacher") {
      if (!hasInvitation && !value.centerSelection) {
        context.addIssue({
          code: "custom",
          message:
            "Center selection is required for teacher registration without an invitation.",
          path: ["centerSelection"],
        });
      }

      if (value.child) {
        context.addIssue({
          code: "custom",
          message:
            "Child information is only accepted for parent registration.",
          path: ["child"],
        });
      }
    }

    if (value.role === "director") {
      if (hasInvitation) {
        context.addIssue({
          code: "custom",
          message: "Director signup cannot accept an invitation.",
          path: ["invitationId"],
        });
      }

      if (!value.directorSetup) {
        context.addIssue({
          code: "custom",
          message: "Director setup is required for director registration.",
          path: ["directorSetup"],
        });
      }

      if (value.centerSelection) {
        context.addIssue({
          code: "custom",
          message:
            "Directors configure their center via directorSetup, not centerSelection.",
          path: ["centerSelection"],
        });
      }

      if (value.child) {
        context.addIssue({
          code: "custom",
          message:
            "Child information is only accepted for parent registration.",
          path: ["child"],
        });
      }
    }
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export const logoutSchema = z.object({
  token: z.string().trim().min(1).optional(),
});

export const submitJoinRequestSchema = z
  .object({
    centerSelection: centerSelectionSchema.optional(),
    directorSetup: directorSetupSchema.optional(),
    child: childRegistrationSchema.optional(),
  })
  .superRefine((value, context) => {
    const hasCenter = Boolean(value.centerSelection);
    const hasDirectorSetup = Boolean(value.directorSetup);

    if (!hasCenter && !hasDirectorSetup) {
      context.addIssue({
        code: "custom",
        message:
          "Either centerSelection or directorSetup is required to submit a new join request.",
        path: ["centerSelection"],
      });
    }

    if (hasCenter && hasDirectorSetup) {
      context.addIssue({
        code: "custom",
        message:
          "centerSelection and directorSetup cannot both be set in the same request.",
        path: ["directorSetup"],
      });
    }
  });

export const lookupInvitationsSchema = z.object({
  phoneVerificationToken: z.string().trim().min(1),
});

export const acceptInvitationSchema = z.object({
  child: childRegistrationSchema.optional(),
});

// In-app "add a kid" request from an already-active parent.
export const requestChildJoinSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema.optional(),
  child: childRegistrationSchema,
  message: z.string().trim().max(500).optional(),
});

export type SendCodeInput = z.infer<typeof sendCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type UserRoleInput = z.infer<typeof roleSchema>;
export type SubmitJoinRequestInput = z.infer<typeof submitJoinRequestSchema>;
export type RequestChildJoinInput = z.infer<typeof requestChildJoinSchema>;
export type ChildRegistrationInput = z.infer<typeof childRegistrationSchema>;
export type DirectorSetupInput = z.infer<typeof directorSetupSchema>;
export type LookupInvitationsInput = z.infer<typeof lookupInvitationsSchema>;
