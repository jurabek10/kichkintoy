/**
 * Hardcoded sample data for the Kichkintoy parent app. Shapes mirror the web
 * project's parent views (children, daily reports, albums, notices, calendar,
 * attendance). Swap these for real API data later — screens read only from here.
 *
 * User-facing chrome (labels, titles) comes from i18n; the *content* below
 * (a child's name, a notice body) is sample data that would arrive from the API.
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const account = {
  username: 'eda23',
};

export const center = {
  name: 'Kichkintoy kindergarten',
};

export type Child = {
  id: string;
  name: string;
  birthLabel: string;
  ageLabel: string;
  photo: string | null;
  className?: string;
};

export const children: Child[] = [
  {
    id: 'eda-1',
    name: 'Eda',
    birthLabel: '04.12.2023',
    ageLabel: '2 y 6 m',
    photo: 'https://i.pravatar.cc/200?img=47',
    className: 'Quyoshcha',
  },
  {
    id: 'eda-2',
    name: 'Amir',
    birthLabel: '04.12.2023',
    ageLabel: '2 y 6 m',
    photo: 'https://i.pravatar.cc/200?img=15',
    className: 'Yulduzcha',
  },
  {
    id: 'eda-3',
    name: 'Sora',
    birthLabel: '04.12.2023',
    ageLabel: '2 y 6 m',
    photo: null,
  },
];

/** The child currently in focus on the home screen. */
export const currentChild = children[0];

/**
 * Home feature grid. `navKey` resolves a label from the shared `nav` namespace
 * so the grid is localized; `route` is where the tile navigates.
 */
export type Feature = {
  key: string;
  navKey: string;
  route: Href;
  icon: IoniconName;
  bg: string;
  fg: string;
  isNew?: boolean;
};

export const features: Feature[] = [
  { key: 'reports', navKey: 'items.reports', route: '/(tabs)/reports', icon: 'book', bg: '#FBEBD2', fg: '#E29A45' },
  { key: 'notices', navKey: 'items.notices', route: '/(tabs)/notices', icon: 'megaphone', bg: '#E1F0FF', fg: '#4D9FEC' },
  { key: 'albums', navKey: 'items.albums', route: '/(tabs)/albums', icon: 'images', bg: '#FFF1CF', fg: '#F4A621' },
  { key: 'calendar', navKey: 'items.calendar', route: '/feature/calendar', icon: 'calendar', bg: '#FFE2DD', fg: '#F05A47' },
  { key: 'meals', navKey: 'items.meals', route: '/meals', icon: 'restaurant', bg: '#FFF6D4', fg: '#EFB019' },
  { key: 'medications', navKey: 'items.medications', route: '/feature/medications', icon: 'medkit', bg: '#FFE0E0', fg: '#F0594C' },
  { key: 'pickups', navKey: 'items.pickups', route: '/(tabs)/pickups', icon: 'walk', bg: '#DBECFF', fg: '#4D9FEC' },
  { key: 'documents', navKey: 'items.documents', route: '/feature/documents', icon: 'document-text', bg: '#DCF2E3', fg: '#46B06A', isNew: true },
];

/** Latest "what happened today" feed items for the home screen. */
export const feed = {
  report: {
    title: 'Eda had a calm, happy day',
    note: 'Slept well after lunch and joined the music circle.',
    mood: '🙂',
    photoCount: 4,
    updateCount: 3,
    dateLabel: '12 Jun',
  },
  album: {
    caption: 'Morning play outside',
    photoCount: 8,
    dateLabel: '12 Jun',
  },
  notice: {
    title: 'Spring photo day on Friday',
    body: 'Please dress your child in bright clothes for the class photo.',
    dateLabel: '11 Jun',
  },
};

/** This-month attendance summary (parent aside in the web app). */
export const attendance = {
  attended: 14,
  total: 16,
};

export type HomeFeed = typeof feed;

export const upcomingEvents = [
  { id: 'e1', title: 'Parent meeting', whenLabel: '18 Jun · 17:00' },
  { id: 'e2', title: 'Spring concert', whenLabel: '24 Jun' },
];

export type UpcomingEvent = (typeof upcomingEvents)[number];

/** Profile-settings form seed (maps to web signup child step). */
export const profile = {
  name: 'Eda',
  birthDateLabel: '04.12.2023',
  gender: 'girl' as 'boy' | 'girl',
  relationship: 'dad',
};

/** Admission / documents contact list seed. */
export const documentContacts = [
  { id: 'eda-1', name: 'Eda', phone: '+998 90 123 45 67', photo: 'https://i.pravatar.cc/200?img=47' },
];

// ---------------------------------------------------------------------------
// Daily reports (알림장) — shapes mirror @kichkintoy/shared DailyReportSummary /
// DailyReportDetail. `mood` is a moodOptions key; report item `valueKey` points
// into the shared `reports` namespace (composer.*Options) so values localize;
// free values (temperature) use `value`.
// ---------------------------------------------------------------------------
export type MoodKey = 'happy' | 'calm' | 'tired' | 'sad' | 'irritable' | 'excited';

export const MOOD_EMOJI: Record<MoodKey, string> = {
  happy: '😊',
  calm: '🙂',
  tired: '😴',
  sad: '😢',
  irritable: '😣',
  excited: '🤩',
};

export type ReportItemType = 'mood' | 'health' | 'temperature' | 'meal' | 'sleep' | 'activity';

export type ReportItem = {
  id: string;
  itemType: ReportItemType;
  /** Key into reports `composer.*Options` (localized). */
  valueKey?: string;
  /** Free value when there's no option set (e.g. temperature). */
  value?: string;
};

export type ReportComment = {
  id: string;
  authorName: string;
  body: string;
  dateLabel: string;
};

export type ReportSummary = {
  id: string;
  reportDate: string; // ISO "2026-06-12"
  authorName: string;
  className: string;
  mood: MoodKey;
  teacherNote: string;
  photoCount: number;
  commentCount: number;
  coverPhoto: string | null;
};

export type ReportDetail = ReportSummary & {
  photos: string[];
  items: ReportItem[];
  comments: ReportComment[];
};

const TEACHER = 'Dilnoza Karimova';
const CLASS_NAME = 'Quyoshcha';

export const reports: ReportSummary[] = [
  {
    id: 'r-12',
    reportDate: '2026-06-12',
    authorName: TEACHER,
    className: CLASS_NAME,
    mood: 'happy',
    teacherNote:
      'Eda had orange snack twice and joined the “my face like Picasso” art activity — sticking on eyes, nose and mouth and adding stickers.',
    photoCount: 3,
    commentCount: 1,
    coverPhoto: 'https://picsum.photos/id/1062/400',
  },
  {
    id: 'r-11',
    reportDate: '2026-06-11',
    authorName: TEACHER,
    className: CLASS_NAME,
    mood: 'calm',
    teacherNote:
      'A calm, happy day — Eda ate porridge in the morning and went off to the football class full of energy.',
    photoCount: 0,
    commentCount: 0,
    coverPhoto: null,
  },
  {
    id: 'r-10',
    reportDate: '2026-06-10',
    authorName: TEACHER,
    className: CLASS_NAME,
    mood: 'excited',
    teacherNote:
      'Reminder: tomorrow (the 11th) there is a football class, so please drop off by 9:40 in the morning.',
    photoCount: 1,
    commentCount: 1,
    coverPhoto: 'https://picsum.photos/id/1025/400',
  },
];

const ITEMS_GOOD_DAY: ReportItem[] = [
  { id: 'i1', itemType: 'mood', valueKey: 'moodOptions.happy' },
  { id: 'i2', itemType: 'health', valueKey: 'healthOptions.healthy' },
  { id: 'i3', itemType: 'temperature', value: '36.6°C' },
  { id: 'i4', itemType: 'meal', valueKey: 'mealOptions.all' },
  { id: 'i5', itemType: 'sleep', valueKey: 'sleepOptions.well_1h30' },
];

const reportDetails: Record<string, ReportDetail> = {
  'r-12': {
    ...reports[0],
    photos: ['https://picsum.photos/id/1062/600', 'https://picsum.photos/id/1080/600'],
    items: ITEMS_GOOD_DAY,
    comments: [{ id: 'c1', authorName: 'Eda’s mom', body: 'Thank you, she looks so happy! 💕', dateLabel: '12 Jun' }],
  },
  'r-11': {
    ...reports[1],
    photos: [],
    items: ITEMS_GOOD_DAY,
    comments: [],
  },
  'r-10': {
    ...reports[2],
    photos: ['https://picsum.photos/id/1025/600'],
    items: ITEMS_GOOD_DAY,
    comments: [{ id: 'c2', authorName: 'Eda’s dad', body: 'Got it, we’ll be on time. 🙌', dateLabel: '10 Jun' }],
  },
};

export function getReportDetail(id: string): ReportDetail | null {
  return reportDetails[id] ?? null;
}

// ---------------------------------------------------------------------------
// Notices (공지사항) — shapes mirror @kichkintoy/shared NoticeSummary /
// NoticeDetail. Audience is the target type (center/class); pinned, important
// and requiresConfirmation drive the badges and the confirm action.
// ---------------------------------------------------------------------------
export type NoticeAudience = 'center' | 'class';

export type NoticeSummary = {
  id: string;
  title: string;
  bodyPreview: string;
  authorName: string;
  centerName: string;
  audience: NoticeAudience;
  isPinned: boolean;
  isImportant: boolean;
  requiresConfirmation: boolean;
  allowComments: boolean;
  publishedDate: string; // ISO date
  time: string; // "11:13"
};

export type NoticeDetail = NoticeSummary & {
  body: string;
};

const DIRECTOR = 'Kichkintoy director';
const CENTER = 'Kichkintoy kindergarten';

export const notices: NoticeSummary[] = [
  {
    id: 'n-1',
    title: 'Parent education No. 26-16',
    bodyPreview: 'Parent education materials for this term.',
    authorName: DIRECTOR,
    centerName: CENTER,
    audience: 'center',
    isPinned: true,
    isImportant: true,
    requiresConfirmation: false,
    allowComments: true,
    publishedDate: '2026-06-13',
    time: '09:20',
  },
  {
    id: 'n-2',
    title: 'Week 3 family newsletter & home safety guide',
    bodyPreview:
      'Hello Kichkintoy parents! This week we’re sharing the family newsletter along with home-safety tips.',
    authorName: 'Dilnoza Karimova',
    centerName: CENTER,
    audience: 'center',
    isPinned: false,
    isImportant: false,
    requiresConfirmation: false,
    allowComments: true,
    publishedDate: '2026-06-12',
    time: '17:31',
  },
  {
    id: 'n-3',
    title: 'Meal info disclosure for catering support 26-30',
    bodyPreview: 'Have a pleasant afternoon.',
    authorName: DIRECTOR,
    centerName: CENTER,
    audience: 'center',
    isPinned: false,
    isImportant: false,
    requiresConfirmation: false,
    allowComments: true,
    publishedDate: '2026-06-10',
    time: '14:02',
  },
  {
    id: 'n-4',
    title: 'Infection prevention guidance',
    bodyPreview: 'Hello, this is the director. Health guidance for infants and toddlers.',
    authorName: DIRECTOR,
    centerName: CENTER,
    audience: 'center',
    isPinned: false,
    isImportant: true,
    requiresConfirmation: true,
    allowComments: true,
    publishedDate: '2026-06-10',
    time: '11:13',
  },
];

const noticeBodies: Record<string, string> = {
  'n-1': 'Parent education materials for this term are attached. Please take a moment to read through them at home.',
  'n-2':
    'Hello Kichkintoy parents!\n\nThis week we’re uploading the family newsletter together with guidance you can use at home.\n\nHome accidents happen often. The health authority prepared a booklet on keeping infants and toddlers safe at home, so please read it through Kichkintoy and check your home as well.',
  'n-3':
    'Have a pleasant afternoon.\n\nMeal information for this period is now disclosed as part of the catering environment support program.',
  'n-4':
    'Hello, this is the director.\n\nThe health authority has shared guidance regarding infant and toddler health and safety.\n\nPlease review the prevention guidelines and follow them at home for your child’s health and safety. Thank you.',
};

const noticeDetails: Record<string, NoticeDetail> = Object.fromEntries(
  notices.map((notice) => [notice.id, { ...notice, body: noticeBodies[notice.id] ?? notice.bodyPreview }]),
);

export function getNoticeDetail(id: string): NoticeDetail | null {
  return noticeDetails[id] ?? null;
}

// ---------------------------------------------------------------------------
// Albums (앨범) — shapes mirror @kichkintoy/shared AlbumPostSummary /
// AlbumPostDetail. `caption` holds the title on its first line and the body
// after it; `photos` is the media set (summary uses the first few as cover).
// ---------------------------------------------------------------------------
export type Album = {
  id: string;
  caption: string; // first line = title, rest = body
  authorName: string;
  className: string;
  taggedFamilies: number; // "+N families" beyond the first
  heartCount: number;
  commentCount: number;
  mediaCount: number;
  publishedDate: string; // ISO date
  time: string;
  photos: string[];
};

export type AlbumComment = {
  id: string;
  authorName: string;
  body: string;
  dateLabel: string;
};

export type AlbumDetail = Album & {
  comments: AlbumComment[];
  allowComments: boolean;
};

/** Split a caption into its title (first line) and body (the rest). */
export function splitCaption(caption: string): { title: string; body: string } {
  const [title, ...rest] = caption.split('\n');
  return { title: title.trim(), body: rest.join('\n').trim() };
}

function photoSet(ids: number[]): string[] {
  return ids.map((id) => `https://picsum.photos/id/${id}/500`);
}

export const albums: Album[] = [
  {
    id: 'al-1',
    caption: 'Soccer class @ outdoor walk\n\nHere are our friends in action. Enjoy the photos together!',
    authorName: 'Dilnoza Karimova',
    className: 'Quyoshcha',
    taggedFamilies: 6,
    heartCount: 2,
    commentCount: 0,
    mediaCount: 100,
    publishedDate: '2026-06-11',
    time: '14:16',
    photos: photoSet([1011, 1025, 1062, 1080, 1084, 1074, 109, 110, 111, 112]),
  },
  {
    id: 'al-2',
    caption: 'We visited the memorial park~\n\nA calm morning walk among the trees with our friends.',
    authorName: 'Dilnoza Karimova',
    className: 'Quyoshcha',
    taggedFamilies: 5,
    heartCount: 1,
    commentCount: 1,
    mediaCount: 48,
    publishedDate: '2026-06-02',
    time: '10:05',
    photos: photoSet([1043, 1039, 1027, 1035, 1044, 1050]),
  },
  {
    id: 'al-3',
    caption: 'Fun snack museum~~\n\nWe explored, tasted and played all morning.',
    authorName: 'Dilnoza Karimova',
    className: 'Quyoshcha',
    taggedFamilies: 4,
    heartCount: 3,
    commentCount: 2,
    mediaCount: 32,
    publishedDate: '2026-04-30',
    time: '11:40',
    photos: photoSet([1060, 1069, 1070, 1071, 1059, 1057]),
  },
];

const albumDetails: Record<string, AlbumDetail> = {
  'al-1': { ...albums[0], allowComments: true, comments: [] },
  'al-2': {
    ...albums[1],
    allowComments: true,
    comments: [{ id: 'ac1', authorName: 'Eda’s mom', body: 'So lovely, thank you! 🌳', dateLabel: '2 Jun' }],
  },
  'al-3': {
    ...albums[2],
    allowComments: true,
    comments: [
      { id: 'ac2', authorName: 'Eda’s dad', body: 'Looks like so much fun!', dateLabel: '30 Apr' },
      { id: 'ac3', authorName: 'Amir’s mom', body: 'Great photos 💕', dateLabel: '30 Apr' },
    ],
  },
};

export function getAlbumDetail(id: string): AlbumDetail | null {
  return albumDetails[id] ?? null;
}

// ---------------------------------------------------------------------------
// Meals (식단표) — shapes mirror @kichkintoy/shared MealPostSummary. Uzbek
// kindergartens serve three meals a day, so each date carries breakfast,
// lunch and snack. `eatingStatus` is the active child's status for that meal.
// ---------------------------------------------------------------------------
export type MealType = 'breakfast' | 'lunch' | 'snack';
export type MealEatingStatus = 'ateAll' | 'ateMost' | 'ateSome' | 'didNotEat' | 'notRecorded';

/** Display order for a day's meals. */
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack'];

export type Meal = {
  id: string;
  mealDate: string; // ISO date
  mealType: MealType;
  menuText: string;
  allergyNote: string | null;
  eatingStatus: MealEatingStatus;
  photos: string[];
};

function mealPhotos(ids: number[]): string[] {
  return ids.map((id) => `https://picsum.photos/id/${id}/600/450`);
}

export const meals: Meal[] = [
  {
    id: 'm-12-b',
    mealDate: '2026-06-12',
    mealType: 'breakfast',
    menuText: 'Milk porridge, bread with butter, fruit tea',
    allergyNote: 'Contains milk, gluten',
    eatingStatus: 'ateAll',
    photos: mealPhotos([1080]),
  },
  {
    id: 'm-12-l',
    mealDate: '2026-06-12',
    mealType: 'lunch',
    menuText: 'Steamed rice, grilled fish, sautéed spinach, kimchi, yogurt drink',
    allergyNote: 'Contains fish, milk',
    eatingStatus: 'ateMost',
    photos: mealPhotos([1084, 292]),
  },
  {
    id: 'm-12-s',
    mealDate: '2026-06-12',
    mealType: 'snack',
    menuText: 'Banana, oat cookies, warm milk',
    allergyNote: 'Contains gluten, milk',
    eatingStatus: 'ateAll',
    photos: mealPhotos([1060]),
  },
  {
    id: 'm-11-b',
    mealDate: '2026-06-11',
    mealType: 'breakfast',
    menuText: 'Buckwheat porridge, cheese, herbal tea',
    allergyNote: 'Contains milk',
    eatingStatus: 'ateSome',
    photos: mealPhotos([1025]),
  },
  {
    id: 'm-11-l',
    mealDate: '2026-06-11',
    mealType: 'lunch',
    menuText: 'Steamed rice, beef bulgogi, seasoned greens, kimchi, watermelon',
    allergyNote: null,
    eatingStatus: 'ateAll',
    photos: mealPhotos([1078, 312]),
  },
  {
    id: 'm-11-s',
    mealDate: '2026-06-11',
    mealType: 'snack',
    menuText: 'Apple slices, rice crackers',
    allergyNote: null,
    eatingStatus: 'notRecorded',
    photos: mealPhotos([1069]),
  },
];

/** Meals grouped by date (newest first), with each day's meals in order. */
export function mealsByDate(): { date: string; meals: Meal[] }[] {
  const dates = [...new Set(meals.map((m) => m.mealDate))].sort((a, b) => b.localeCompare(a));
  return dates.map((date) => ({
    date,
    meals: meals
      .filter((m) => m.mealDate === date)
      .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)),
  }));
}
