import {
  childGenderSchema,
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

export const sendCodeSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const verifyCodeSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: z.string().trim().min(4).max(8),
});

const childRegistrationSchema = z
  .object({
    className: z.string().trim().min(1, "Child class is required."),
    imageUrl: z.string().trim().url().optional(),
    name: z.string().trim().min(1, "Child name is required."),
    dateOfBirth: z.coerce.date(),
    gender: childGenderSchema,
    relationshipType: relationshipTypeSchema,
    customRelationshipLabel: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.dateOfBirth > new Date()) {
      context.addIssue({
        code: "custom",
        message: "Date of birth cannot be in the future.",
        path: ["dateOfBirth"],
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
    child: childRegistrationSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.role === "parent" && !value.child) {
      context.addIssue({
        code: "custom",
        message: "Child information is required for parent registration.",
        path: ["child"],
      });
    }

    if (value.role !== "parent" && value.child) {
      context.addIssue({
        code: "custom",
        message: "Child information is only accepted for parent registration.",
        path: ["child"],
      });
    }
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export const logoutSchema = z.object({
  token: z.string().trim().min(1).optional(),
});

export type SendCodeInput = z.infer<typeof sendCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type UserRoleInput = z.infer<typeof roleSchema>;
