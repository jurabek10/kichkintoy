import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { NoticeSummary } from '@/constants/data';
import { formatLongDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const SKY = '#3E8FE0';

/** One notice in the list: audience badge, title, preview, date. Pinned ones
 *  get a soft highlight, the project's equivalent of Kidsnote's pinned row. */
export function NoticeListItem({ notice }: { notice: NoticeSummary }) {
  const { t, i18n } = useTranslation(['notices']);

  return (
    <Link href={{ pathname: '/notice/[id]', params: { id: notice.id } }} asChild>
      <Pressable
        className={cn('border-b border-border px-4 py-4', notice.isPinned ? 'bg-sunshine' : 'bg-card')}>
        <View className="flex-row items-center gap-2">
          <View className="rounded-md bg-pill px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-muted">
              {t(`audience.${notice.audience}`)}
            </Text>
          </View>
          {notice.isImportant ? (
            <View className="rounded-md bg-coral px-2 py-0.5">
              <Text className="text-[11px] font-bold text-coral-ink">{t('composer.important')}</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-2 flex-row items-center gap-1">
          {notice.isPinned ? <Ionicons name="bookmark" size={14} color={SKY} /> : null}
          <Text className="flex-1 text-[15px] font-bold text-foreground">{notice.title}</Text>
        </View>
        <Text numberOfLines={2} className="mt-1 text-sm leading-5 text-muted">
          {notice.bodyPreview}
        </Text>

        <View className="mt-2 flex-row items-center gap-2">
          <Text className="text-xs text-muted">
            {formatLongDate(notice.publishedDate, i18n.language)}
          </Text>
          {notice.requiresConfirmation ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="checkmark-circle-outline" size={13} color={SKY} />
              <Text className="text-xs font-semibold" style={{ color: SKY }}>
                {t('badges.confirmation')}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
