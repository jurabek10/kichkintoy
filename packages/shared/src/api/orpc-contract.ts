import { authContract } from "./orpc/auth.contract.js";
import {
  centersContract,
  geoContract,
  teacherContract,
} from "./orpc/catalog.contract.js";
import { directorContract } from "./orpc/director.contract.js";
import { reportsContract } from "./orpc/reports.contract.js";

export const appContract = {
  auth: authContract,
  geo: geoContract,
  centers: centersContract,
  teacher: teacherContract,
  director: directorContract,
  reports: reportsContract,
};

export type AppContract = typeof appContract;

export * from "./orpc/director.contract.js";
