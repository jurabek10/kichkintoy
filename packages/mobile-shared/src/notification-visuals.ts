import { Ionicons } from '@expo/vector-icons';
import { notificationRouteTarget } from '@kichkintoy/shared';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type NotificationVisual = {
  icon: IconName;
  /** Tailwind background class for the icon tile. */
  tileClass: string;
  /** Hex ink for the Ionicon (Tailwind can't reach the `color` prop). */
  ink: string;
};

/**
 * A notification wears the colour of the screen it came from — a report reads
 * coral, a notice sky, an album grape — so the inbox is scannable by domain at a
 * glance rather than a wall of identical bells. Keyed by the shared route kind.
 */
const VISUALS: Record<string, NotificationVisual> = {
  report: { icon: 'reader', tileClass: 'bg-coral', ink: '#E8674E' },
  notice: { icon: 'megaphone', tileClass: 'bg-sky', ink: '#3E8FE0' },
  album: { icon: 'images', tileClass: 'bg-grape', ink: '#7C5CD8' },
  meal: { icon: 'restaurant', tileClass: 'bg-sunshine', ink: '#F4A621' },
  medication: { icon: 'medkit', tileClass: 'bg-coral', ink: '#E8674E' },
  pickup: { icon: 'walk', tileClass: 'bg-sunshine', ink: '#F4A621' },
  attendance: { icon: 'checkmark-circle', tileClass: 'bg-mint', ink: '#46B06A' },
  calendar: { icon: 'calendar', tileClass: 'bg-sky', ink: '#3E8FE0' },
  documents: { icon: 'document-text', tileClass: 'bg-grape', ink: '#7C5CD8' },
  message: { icon: 'chatbubble', tileClass: 'bg-grape', ink: '#7C5CD8' },
  notifications: { icon: 'notifications', tileClass: 'bg-sky', ink: '#3E8FE0' },
};

export function notificationVisual(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): NotificationVisual {
  return VISUALS[notificationRouteTarget(input).kind] ?? VISUALS.notifications!;
}
