import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { FEED_KIND_TOKENS, type FeedKind } from '@/components/home/feed-card';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/utils';

type EmptyFeedCardProps = {
  kind: FeedKind;
  tag: string;
  title: string;
  subtitle: string;
};

/**
 * A calm "nothing yet" placeholder that keeps the section's identity: the same
 * kind tag pill as a real card, then a soft-tinted icon badge in the feature's
 * accent and a friendly anticipation message.
 */
export function EmptyFeedCard({ kind, tag, title, subtitle }: EmptyFeedCardProps) {
  const token = FEED_KIND_TOKENS[kind];
  return (
    <Card>
      <Tag
        label={tag}
        icon={token.icon}
        iconColor={token.iconColor}
        className={token.tagClass}
        textClassName={token.textClass}
      />
      <View className="items-center gap-2 py-5">
        <View className={cn('h-14 w-14 items-center justify-center rounded-2xl', token.tagClass)}>
          <Ionicons name={token.icon} size={26} color={token.iconColor} />
        </View>
        <Text className="text-[15px] font-bold text-foreground">{title}</Text>
        <Text className="max-w-[240px] text-center text-xs leading-5 text-muted">{subtitle}</Text>
      </View>
    </Card>
  );
}
