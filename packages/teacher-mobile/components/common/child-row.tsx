import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import type { Child } from '@/constants/data';
import { colors } from '@/constants/theme';

type ChildRowProps = {
  child: Child;
  /** Small overlay on the avatar: settings gear, remove minus, or none. */
  avatarAction: 'gear' | 'minus' | 'none';
  memoriesLabel: string;
  addLabel: string;
  onAddAffiliation: () => void;
};

/** A single child entry in the account hub: avatar, name/age, action chips. */
export function ChildRow({ child, avatarAction, memoriesLabel, addLabel, onAddAffiliation }: ChildRowProps) {
  return (
    <View className="flex-row gap-3 px-4 py-3">
      <View>
        <Avatar uri={child.photo} size={56} />
        {avatarAction !== 'none' ? (
          <View className="absolute -bottom-0.5 -left-0.5 h-[22px] w-[22px] items-center justify-center rounded-full border border-border bg-card">
            <Ionicons
              name={avatarAction === 'gear' ? 'settings-sharp' : 'remove'}
              size={12}
              color={colors.textSecondary}
            />
          </View>
        ) : null}
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-[17px] font-bold text-foreground">{child.name}</Text>
        <Text className="mb-2 mt-0.5 text-[13px] text-muted">
          {child.birthLabel} ({child.ageLabel})
        </Text>
        <View className="flex-row gap-2">
          <Pill icon="time-outline" label={memoriesLabel} />
          <Pill icon="add" label={addLabel} onPress={onAddAffiliation} />
        </View>
      </View>
    </View>
  );
}
