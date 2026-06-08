import { oc } from "@orpc/contract";
import { z } from "zod";
import { isoDateSchema, uuidSchema } from "../../lib/validators.js";
import {
  attendanceChildrenResponseSchema,
  attendanceDetailSchema,
  attendanceStatusSchema,
  markAttendanceStatusInputSchema,
  parentSubmitAttendanceAbsenceInputSchema,
  parentAttendanceListResponseSchema,
  recordAttendanceCheckInInputSchema,
  recordAttendanceCheckOutInputSchema,
  staffAttendanceListResponseSchema,
} from "../attendance.js";

const attendanceChildrenInputSchema = z
  .object({
    centerId: uuidSchema.optional(),
  })
  .optional();

const staffAttendanceListInputSchema = z.object({
  centerId: uuidSchema,
  date: isoDateSchema.optional(),
  classId: uuidSchema.optional(),
  status: attendanceStatusSchema.optional(),
});

const parentAttendanceListInputSchema = z
  .object({
    childId: uuidSchema.optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .optional();

const attendanceDetailInputSchema = z.object({
  recordId: uuidSchema,
});

export const attendanceContract = {
  children: oc
    .input(attendanceChildrenInputSchema)
    .output(attendanceChildrenResponseSchema),
  staffList: oc
    .input(staffAttendanceListInputSchema)
    .output(staffAttendanceListResponseSchema),
  parentList: oc
    .input(parentAttendanceListInputSchema)
    .output(parentAttendanceListResponseSchema),
  detail: oc.input(attendanceDetailInputSchema).output(attendanceDetailSchema),
  checkIn: oc
    .input(recordAttendanceCheckInInputSchema)
    .output(attendanceDetailSchema),
  checkOut: oc
    .input(recordAttendanceCheckOutInputSchema)
    .output(attendanceDetailSchema),
  markStatus: oc
    .input(markAttendanceStatusInputSchema)
    .output(attendanceDetailSchema),
  parentSubmitAbsence: oc
    .input(parentSubmitAttendanceAbsenceInputSchema)
    .output(attendanceDetailSchema),
};
