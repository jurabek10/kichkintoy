import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { StaffNoticeSummary } from '@/data/notices';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<StaffNoticeSummary['status'], { bg: string; text: string }> = {
  draft: { bg: 'bg-pill', text: 'text-muted' },
  scheduled: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  published: { bg: 'bg-mint', text: 'text-mint-ink' },
};

/** The leading glyph: an important notice reads coral, a pinned one sky, the
 *  rest a neutral megaphone — so the two that matter stand out in a scan. */
function LeadIcon({ notice }: { notice: StaffNoticeSummary }) {
  if (notice.isImportant) {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-coral">
        <Ionicons name="star" size={17} color={colors.textPrimary} />
      </View>
    );
  }
  if (notice.isPinned) {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-sky">
        <Ionicons name="bookmark" size={16} color="#3E8FE0" />
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
 * One notice on the teacher's board. Carries the two things a teacher scans for
 * — who it went to and how many parents have seen it — with a thin sky read bar
 * on published notices as the signature accent. Taps through to the detail.
 */
export function StaffNoticeListItem({ notice }: { notice: StaffNoticeSummary }) {
  const { t } = useTranslation('notices');
  const tone = STATUS_TONE[notice.status];
  const readPct =
    notice.recipientCount > 0 ? Math.round((notice.readCount / notice.recipientCount) * 100) : 0;

  const audienceLabel = notice.targetLabel || t(`audience.${notice.audience}`);

  return (
    <Link href={{ pathname: '/notice/[id]', params: { id: notice.id } }} asChild>
      <Pressable className="rounded-lg bg-card p-4 active:opacity-80">
        <View className="flex-row items-start gap-3">
          <LeadIcon notice={notice} />

          <View className="flex-1">
            <View className="flex-row items-start gap-2">
              <Text numberOfLines={2} className="flex-1 text-[15px] font-bold leading-5 text-foreground">
                {notice.title}
              </Text>
              <View className={cn('rounded-full px-2.5 py-1', tone.bg)}>
                <Text className={cn('text-[11px] font-bold', tone.text)}>
                  {t(`status.${notice.status}`)}
                </Text>
              </View>
            </View>

            {/* Audience */}
            <View className="mt-1.5 flex-row items-center gap-1">
              <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
              <Text numberOfLines={1} className="flex-1 text-[12px] text-muted">
                {audienceLabel}
                {notice.extraTargets > 0 ? ` +${notice.extraTargets}` : ''}
              </Text>
            </View>

            <Text numberOfLines={2} className="mt-1.5 text-[13px] leading-5 text-muted">
              {notice.bodyPreview}
            </Text>
          </View>
        </View>

        {/* Read progress — the teacher's core question, shown only once it's out */}
        {notice.status === 'published' ? (
          <View className="mt-3 gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold text-foreground">
                {t('readCount', { read: notice.readCount, total: notice.recipientCount })}
              </Text>
              <View className="flex-row items-center gap-3">
                {notice.requiresConfirmation ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="checkmark-done-outline" size={13} color={colors.textSecondary} />
                    <Text className="text-[12px] text-muted">{notice.confirmedCount}</Text>
                  </View>
                ) : null}
                {notice.commentCount > 0 ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
                    <Text className="text-[12px] text-muted">{notice.commentCount}</Text>
                  </View>
                ) : null}
                <Text className="text-[12px] text-muted">{notice.dateLabel}</Text>
              </View>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full bg-segment">
              <View className="h-full rounded-full bg-sky-ink" style={{ width: `${readPct}%` }} />
            </View>
          </View>
        ) : (
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-[12px] text-muted">
              {notice.status === 'scheduled' ? t('scheduledSoon') : t('draftNotSent')}
            </Text>
            <Text className="text-[12px] text-muted">{notice.dateLabel}</Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}
