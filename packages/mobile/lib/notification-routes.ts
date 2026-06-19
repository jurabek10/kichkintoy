import type { Href } from 'expo-router';

export function routeForNotification(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): Href | null {
  const source = `${input.notificationType}:${input.entityType ?? ''}`;
  const id = input.entityId;

  if (id && source.includes('report')) return { pathname: '/report/[id]', params: { id } };
  if (id && source.includes('notice')) return { pathname: '/notice/[id]', params: { id } };
  if (id && source.includes('album')) return { pathname: '/album/[id]', params: { id } };
  if (source.includes('meal')) return '/meals';

  return null;
}
