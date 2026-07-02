import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  defaultNS,
  fallbackLng,
  isSupportedLanguage,
  languages,
  type Language,
} from '@kichkintoy/translations/settings';

import enAccount from '@kichkintoy/translations/locales/en/account.json';
import enAlbums from '@kichkintoy/translations/locales/en/albums.json';
import enApp from '@kichkintoy/translations/locales/en/app.json';
import enAttendance from '@kichkintoy/translations/locales/en/attendance.json';
import enCalendar from '@kichkintoy/translations/locales/en/calendar.json';
import enCommon from '@kichkintoy/translations/locales/en/common.json';
import enDocuments from '@kichkintoy/translations/locales/en/documents.json';
import enMeals from '@kichkintoy/translations/locales/en/meals.json';
import enMedications from '@kichkintoy/translations/locales/en/medications.json';
import enNav from '@kichkintoy/translations/locales/en/nav.json';
import enNotices from '@kichkintoy/translations/locales/en/notices.json';
import enNotifications from '@kichkintoy/translations/locales/en/notifications.json';
import enPickups from '@kichkintoy/translations/locales/en/pickups.json';
import enReports from '@kichkintoy/translations/locales/en/reports.json';
import enTeacher from '@kichkintoy/translations/locales/en/teacher.json';
import ruAccount from '@kichkintoy/translations/locales/ru/account.json';
import ruAlbums from '@kichkintoy/translations/locales/ru/albums.json';
import ruApp from '@kichkintoy/translations/locales/ru/app.json';
import ruAttendance from '@kichkintoy/translations/locales/ru/attendance.json';
import ruCalendar from '@kichkintoy/translations/locales/ru/calendar.json';
import ruCommon from '@kichkintoy/translations/locales/ru/common.json';
import ruDocuments from '@kichkintoy/translations/locales/ru/documents.json';
import ruMeals from '@kichkintoy/translations/locales/ru/meals.json';
import ruMedications from '@kichkintoy/translations/locales/ru/medications.json';
import ruNav from '@kichkintoy/translations/locales/ru/nav.json';
import ruNotices from '@kichkintoy/translations/locales/ru/notices.json';
import ruNotifications from '@kichkintoy/translations/locales/ru/notifications.json';
import ruPickups from '@kichkintoy/translations/locales/ru/pickups.json';
import ruReports from '@kichkintoy/translations/locales/ru/reports.json';
import ruTeacher from '@kichkintoy/translations/locales/ru/teacher.json';
import uzAccount from '@kichkintoy/translations/locales/uz/account.json';
import uzAlbums from '@kichkintoy/translations/locales/uz/albums.json';
import uzApp from '@kichkintoy/translations/locales/uz/app.json';
import uzAttendance from '@kichkintoy/translations/locales/uz/attendance.json';
import uzCalendar from '@kichkintoy/translations/locales/uz/calendar.json';
import uzCommon from '@kichkintoy/translations/locales/uz/common.json';
import uzDocuments from '@kichkintoy/translations/locales/uz/documents.json';
import uzMeals from '@kichkintoy/translations/locales/uz/meals.json';
import uzMedications from '@kichkintoy/translations/locales/uz/medications.json';
import uzNav from '@kichkintoy/translations/locales/uz/nav.json';
import uzNotices from '@kichkintoy/translations/locales/uz/notices.json';
import uzNotifications from '@kichkintoy/translations/locales/uz/notifications.json';
import uzPickups from '@kichkintoy/translations/locales/uz/pickups.json';
import uzReports from '@kichkintoy/translations/locales/uz/reports.json';
import uzTeacher from '@kichkintoy/translations/locales/uz/teacher.json';

const resources = {
  uz: { common: uzCommon, nav: uzNav, app: uzApp, account: uzAccount, reports: uzReports, notices: uzNotices, notifications: uzNotifications, albums: uzAlbums, meals: uzMeals, medications: uzMedications, pickups: uzPickups, documents: uzDocuments, attendance: uzAttendance, calendar: uzCalendar, teacher: uzTeacher },
  en: { common: enCommon, nav: enNav, app: enApp, account: enAccount, reports: enReports, notices: enNotices, notifications: enNotifications, albums: enAlbums, meals: enMeals, medications: enMedications, pickups: enPickups, documents: enDocuments, attendance: enAttendance, calendar: enCalendar, teacher: enTeacher },
  ru: { common: ruCommon, nav: ruNav, app: ruApp, account: ruAccount, reports: ruReports, notices: ruNotices, notifications: ruNotifications, albums: ruAlbums, meals: ruMeals, medications: ruMedications, pickups: ruPickups, documents: ruDocuments, attendance: ruAttendance, calendar: ruCalendar, teacher: ruTeacher },
};

const STORAGE_KEY = 'kichkintoy.language';

/** Pick the device language if we support it, otherwise fall back. */
function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? fallbackLng;
  return isSupportedLanguage(code) ? code : fallbackLng;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng,
  defaultNS,
  ns: ['common', 'nav', 'app', 'account', 'reports', 'notices', 'notifications', 'albums', 'meals', 'medications', 'pickups', 'documents', 'attendance', 'calendar', 'teacher'],
  interpolation: { escapeValue: false },
  returnNull: false,
  // Resources are bundled, so we never need to suspend while loading them —
  // and there is no <Suspense> boundary around the navigator.
  react: { useSuspense: false },
});

// Restore a previously chosen language (async, after the sync init above).
if (typeof window !== 'undefined') {
  void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
    if (stored && isSupportedLanguage(stored) && stored !== i18n.language) {
      void i18n.changeLanguage(stored);
    }
  });
}

/** Change the active language and remember it across launches. */
export async function setLanguage(language: Language) {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(STORAGE_KEY, language);
}

export { languages, type Language };
export default i18n;
