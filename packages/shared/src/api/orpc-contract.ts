import { authContract } from "./orpc/auth.contract.js";
import { attendanceContract } from "./orpc/attendance.contract.js";
import { albumsContract } from "./orpc/albums.contract.js";
import { calendarContract } from "./orpc/calendar.contract.js";
import { chatContract } from "./orpc/chat.contract.js";
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
import { paymentsContract } from "./orpc/payments.contract.js";
import { pickupsContract } from "./orpc/pickups.contract.js";
import { profileContract } from "./orpc/profile.contract.js";
import { realtimeContract } from "./orpc/realtime.contract.js";
import { reportsContract } from "./orpc/reports.contract.js";
import { studentDocumentsContract } from "./orpc/student-documents.contract.js";

export const appContract = {
  auth: authContract,
  attendance: attendanceContract,
  albums: albumsContract,
  calendar: calendarContract,
  chat: chatContract,
  geo: geoContract,
  centers: centersContract,
  teacher: teacherContract,
  director: directorContract,
  media: mediaContract,
  medications: medicationsContract,
  meals: mealsContract,
  reports: reportsContract,
  studentDocuments: studentDocumentsContract,
  notices: noticesContract,
  notifications: notificationsContract,
  payments: paymentsContract,
  pickups: pickupsContract,
  profile: profileContract,
  realtime: realtimeContract,
};

export type AppContract = typeof appContract;

export * from "./orpc/director.contract.js";
export * from "./orpc/attendance.contract.js";
export * from "./orpc/calendar.contract.js";
export * from "./orpc/notifications.contract.js";
export * from "./orpc/realtime.contract.js";
export * from "./orpc/student-documents.contract.js";
