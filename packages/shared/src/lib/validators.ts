import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const phoneNumberSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\+?[0-9\s()-]{9,18}$/);

export const isoDateTimeSchema = z.string().datetime();

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.");
