import { authContract } from "./orpc/auth.contract.js";
import { attendanceContract } from "./orpc/attendance.contract.js";
import { albumsContract } from "./orpc/albums.contract.js";
import { calendarContract } from "./orpc/calendar.contract.js";
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
import { notificationsContract } from "./orpc/notifications.contract.js";
import { pickupsContract } from "./orpc/pickups.contract.js";
import { realtimeContract } from "./orpc/realtime.contract.js";
import { reportsContract } from "./orpc/reports.contract.js";

export const appContract = {
  auth: authContract,
  attendance: attendanceContract,
  albums: albumsContract,
  calendar: calendarContract,
  geo: geoContract,
  centers: centersContract,
  teacher: teacherContract,
  director: directorContract,
  media: mediaContract,
  medications: medicationsContract,
  meals: mealsContract,
  reports: reportsContract,
  notices: noticesContract,
  notifications: notificationsContract,
  pickups: pickupsContract,
  realtime: realtimeContract,
};

export type AppContract = typeof appContract;

export * from "./orpc/director.contract.js";
export * from "./orpc/attendance.contract.js";
export * from "./orpc/calendar.contract.js";
export * from "./orpc/notifications.contract.js";
export * from "./orpc/realtime.contract.js";
