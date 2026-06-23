import { oc } from "@orpc/contract";
import { z } from "zod";
import { centerSearchResultSchema } from "../../centers/models.js";
import { uuidSchema } from "../../lib/validators.js";
import {
  centerByCodeQuerySchema,
  centerClassesResponseSchema,
  centerSearchQuerySchema,
  centerSearchResponseSchema,
} from "../centers.js";
import {
  childDetailSchema,
  classRosterChildSchema,
  teacherClassesResponseSchema,
  updateChildRequestSchema,
} from "../classes.js";
import { districtsResponseSchema, regionsResponseSchema } from "../geo.js";
import {
  centerIdInputSchema,
  emptyInputSchema,
  successResponseSchema,
} from "./common.contract.js";

export const geoContract = {
  regions: oc.input(emptyInputSchema).output(regionsResponseSchema),
  districts: oc
    .input(z.object({ regionId: uuidSchema }))
    .output(districtsResponseSchema),
};

export const centersContract = {
  search: oc.input(centerSearchQuerySchema).output(centerSearchResponseSchema),
  byCode: oc.input(centerByCodeQuerySchema).output(centerSearchResultSchema),
  classes: oc.input(centerIdInputSchema).output(centerClassesResponseSchema),
};

export const teacherContract = {
  classes: oc.input(emptyInputSchema).output(teacherClassesResponseSchema),
  classChildren: oc
    .input(z.object({ classId: uuidSchema }))
    .output(z.array(classRosterChildSchema)),
  // A teacher may open, edit, and remove a child — but only one that is
  // enrolled in a class she is actively assigned to (enforced in the service).
  child: oc.input(z.object({ childId: uuidSchema })).output(childDetailSchema),
  updateChild: oc
    .input(z.object({ childId: uuidSchema, body: updateChildRequestSchema }))
    .output(childDetailSchema),
  deleteChild: oc
    .input(z.object({ childId: uuidSchema }))
    .output(successResponseSchema),
};
