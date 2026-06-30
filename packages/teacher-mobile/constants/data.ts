/**
 * Hardcoded sample data for the Kichkintoy parent app. Shapes mirror the web
 * project's parent views (children, daily reports, albums, notices, calendar,
 * attendance). Swap these for real API data later — screens read only from here.
 *
 * User-facing chrome (labels, titles) comes from i18n; the *content* below
 * (a child's name, a notice body) is sample data that would arrive from the API.
 */
import type { ComponentProps } from 'react';
import type { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type MaterialCommunityName = ComponentProps<typeof MaterialCommunityIcons>['name'];

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
  centerName?: string;
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
  /** Optional override when an Ionicon can't express the tile (e.g. a parent
   *  and child for pickup). Rendered from MaterialCommunityIcons instead. */
  mciIcon?: MaterialCommunityName;
  bg: string;
  fg: string;
  isNew?: boolean;
};

/** Teacher home shortcut grid — every left-sidebar menu from the web teacher
 *  dashboard, in the same candy palette as the parent app. Paginated 2×4 with a
 *  swiper (see components/home/feature-grid.tsx). */
export const features: Feature[] = [
  { key: 'classes', navKey: 'items.myClasses', route: '/classes', icon: 'people', bg: '#DDF3E4', fg: '#46B06A' },
  { key: 'attendance', navKey: 'items.attendance', route: '/attendance', icon: 'calendar-number', bg: '#DDF3E4', fg: '#46B06A' },
  { key: 'reports', navKey: 'items.reports', route: '/(tabs)/reports', icon: 'document-text', bg: '#FFE8E2', fg: '#E8674E' },
  { key: 'notices', navKey: 'items.notices', route: '/(tabs)/notices', icon: 'megaphone', bg: '#E1F0FF', fg: '#3E8FE0' },
  { key: 'albums', navKey: 'items.albums', route: '/(tabs)/albums', icon: 'images', bg: '#EEE6FF', fg: '#7C5CD8' },
  { key: 'calendar', navKey: 'items.calendar', route: '/calendar', icon: 'calendar', bg: '#E1F0FF', fg: '#3E8FE0' },
  { key: 'meals', navKey: 'items.meals', route: '/meals', icon: 'restaurant', bg: '#FFF1CF', fg: '#F4A621' },
  { key: 'medications', navKey: 'items.medications', route: '/medications', icon: 'medkit', bg: '#FFE8E2', fg: '#E8674E' },
  { key: 'pickups', navKey: 'items.pickups', route: '/(tabs)/pickups', icon: 'walk', mciIcon: 'human-male-child', bg: '#E1F0FF', fg: '#3E8FE0' },
  { key: 'documents', navKey: 'items.documents', route: '/documents', icon: 'document-attach', bg: '#DDF3E4', fg: '#46B06A' },
  { key: 'requests', navKey: 'items.requests', route: '/requests', icon: 'person-add', bg: '#EEE6FF', fg: '#7C5CD8' },
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

// Meals (식단표) now live in data/meals.ts, wired to the real meals API.
