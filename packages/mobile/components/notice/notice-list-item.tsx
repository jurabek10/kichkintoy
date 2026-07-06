import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { NoticeSummary } from '@/data/notices';
import { formatLongDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const SKY = '#3E8FE0';
const CORAL_INK = '#E8674E';

/** The leading glyph: an important notice reads coral, a pinned one sky, the
 *  rest a neutral megaphone — so the two that matter stand out in a scan. */
function LeadIcon({ notice }: { notice: NoticeSummary }) {
  if (notice.isImportant) {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-coral">
        <Ionicons name="star" size={17} color={CORAL_INK} />
      </View>
    );
  }
  if (notice.isPinned) {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-sky">
        <Ionicons name="bookmark" size={16} color={SKY} />
      </View>
    );
  }
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-pill">
      <Ionicons name="megaphone-outline" size={16} color={colors.textSecondary} />
    </View>
  );
}

/**
 * One notice on the parent's board. The card leans on read state — the parent's
 * whole question here is "what haven't I seen, what still needs me": unread
 * carries a sky edge and a New badge, a pending confirmation reads coral, and
 * everything settled recedes to quiet grey.
 */
export function NoticeListItem({ notice }: { notice: NoticeSummary }) {
  const { t, i18n } = useTranslation(['notices']);
  const unread = !notice.isRead;
  const needsConfirmation = notice.requiresConfirmation && !notice.isConfirmed;
  const confirmed = notice.requiresConfirmation && notice.isConfirmed;

  return (
    <Link href={{ pathname: '/notice/[id]', params: { id: notice.id } }} asChild>
      <Pressable
        className={cn(
          'flex-row items-start gap-3 overflow-hidden rounded-lg bg-card p-4 active:opacity-80',
          unread ? 'border-l-4 border-sky-ink' : '',
        )}>
        <LeadIcon notice={notice} />

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="rounded-md bg-pill px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-muted">{t(`audience.${notice.audience}`)}</Text>
            </View>
            {unread ? (
              <View className="rounded-md bg-sky px-2 py-0.5">
                <Text className="text-[11px] font-bold text-sky-ink">{t('badges.new')}</Text>
              </View>
            ) : null}
            <View className="flex-1" />
            <Text className="text-[11px] text-muted">
              {formatLongDate(notice.publishedDate, i18n.language)}
            </Text>
          </View>

          <Text
            numberOfLines={2}
            className={cn(
              'mt-2 text-[15px] leading-5 text-foreground',
              unread ? 'font-extrabold' : 'font-bold',
            )}>
            {notice.title}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-sm leading-5 text-muted">
            {notice.bodyPreview}
          </Text>

          {needsConfirmation ? (
            <View className="mt-2.5 flex-row items-center gap-1 self-start rounded-full bg-coral px-2.5 py-1">
              <Ionicons name="alert-circle" size={13} color={CORAL_INK} />
              <Text className="text-[11px] font-bold text-coral-ink">{t('badges.actionNeeded')}</Text>
            </View>
          ) : confirmed ? (
            <View className="mt-2.5 flex-row items-center gap-1">
              <Ionicons name="checkmark-circle" size={14} color={SKY} />
              <Text className="text-[11px] font-semibold" style={{ color: SKY }}>
                {t('badges.confirmed')}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
