import { authContract } from "./orpc/auth.contract.js";
import { albumsContract } from "./orpc/albums.contract.js";
import {
  centersContract,
  geoContract,
  teacherContract,
} from "./orpc/catalog.contract.js";
import { directorContract } from "./orpc/director.contract.js";
import { mediaContract } from "./orpc/media.contract.js";
import { medicationsContract } from "./orpc/medications.contract.js";
import { mealsContract } from "./orpc/meals.contract.js";
import { noticesContract } from "./orpc/notices.contract.js";
import { pickupsContract } from "./orpc/pickups.contract.js";
import { reportsContract } from "./orpc/reports.contract.js";

export const appContract = {
  auth: authContract,
  albums: albumsContract,
  geo: geoContract,
  centers: centersContract,
  teacher: teacherContract,
  director: directorContract,
  media: mediaContract,
  medications: medicationsContract,
  meals: mealsContract,
  reports: reportsContract,
  notices: noticesContract,
  pickups: pickupsContract,
};

export type AppContract = typeof appContract;

export * from "./orpc/director.contract.js";
