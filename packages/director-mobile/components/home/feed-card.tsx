import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { colors } from '@/constants/theme';

/** The kinds of "what happened today" entries a parent can see. */
export type FeedKind = 'report' | 'album' | 'notice';

/** Per-kind icon + accent tokens, shared with the empty-state card. */
export const FEED_KIND_TOKENS: Record<
  FeedKind,
  {
    icon: ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
    tagClass: string;
    textClass: string;
  }
> = {
  report: { icon: 'document-text', iconColor: '#E8674E', tagClass: 'bg-coral', textClass: 'text-coral-ink' },
  album: { icon: 'images', iconColor: '#7C5CD8', tagClass: 'bg-grape', textClass: 'text-grape-ink' },
  notice: { icon: 'megaphone', iconColor: '#3E8FE0', tagClass: 'bg-sky', textClass: 'text-sky-ink' },
};

type FeedCardProps = {
  kind: FeedKind;
  tag: string;
  time: string;
  title: string;
  body?: string;
  cta?: string;
  onPress?: () => void;
  children?: ReactNode;
};

/**
 * The tagged feed card (pill + time + title + body + optional CTA) shared by the
 * home feed and the per-section screens. The look and the kind→colour palette
 * live here so a new feed kind is one map entry.
 */
export function FeedCard({ kind, tag, time, title, body, cta, onPress, children }: FeedCardProps) {
  const token = FEED_KIND_TOKENS[kind];
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="flex-row items-center justify-between">
          <Tag
            label={tag}
            icon={token.icon}
            iconColor={token.iconColor}
            className={token.tagClass}
            textClassName={token.textClass}
          />
          {time ? <Text className="text-xs font-semibold text-muted">{time}</Text> : null}
        </View>
        <Text className="mt-3 text-base font-bold text-foreground">{title}</Text>
        {body ? (
          <Text numberOfLines={3} className="mt-1 text-sm leading-5 text-muted">
            {body}
          </Text>
        ) : null}
        {children}
        {cta ? (
          <View className="mt-3 flex-row items-center gap-1">
            <Text className="text-sm font-bold text-primary">{cta}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
