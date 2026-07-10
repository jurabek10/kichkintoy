import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { colors } from '@/constants/theme';
import { useMyJoinRequests, useParentChildren } from '@/data/profile';
import { useSelectedChildId } from '@/lib/selected-child';
import { cn } from '@/lib/utils';

/**
 * Kidsnote-style kid switcher: the bottom sheet the home-header kid block
 * opens. Lists every kid the parent guards (each may attend a different
 * kindergarten), pending "add a kid" requests, and the add action.
 */
export function ChildSwitcherSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('app');
  const router = useRouter();
  const { selectedChildId, select } = useSelectedChildId();
  const { data: children = [] } = useParentChildren();
  const { data: pending = [] } = useMyJoinRequests();

  const activeId = children.find((c) => c.id === selectedChildId)?.id ?? children[0]?.id ?? null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-card px-4 pb-9 pt-3" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <Text className="mb-1 text-base font-extrabold text-foreground">
            {t('childSwitcher.title')}
          </Text>

          <View className="mt-1">
            {children.map((child) => {
              const active = child.id === activeId;
              return (
                <Pressable
                  key={child.id}
                  onPress={() => {
                    select(child.id);
                    onClose();
                  }}
                  className="flex-row items-center gap-3 py-2.5">
                  <ProfileAvatar
                    avatarMediaAssetId={child.photoMediaAssetId}
                    photoUrl={child.photoUrl}
                    name={child.name}
                    size={40}
                    fallbackClassName="bg-sky"
                    fallbackTextClassName="text-sky-ink"
                  />
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className={cn(
                        'text-[15px]',
                        active ? 'font-bold text-foreground' : 'font-semibold text-foreground',
                      )}>
                      {child.name}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">
                      {[child.centerName, child.className].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <View className="h-5 w-5 rounded-full border border-border" />
                  )}
                </Pressable>
              );
            })}

            {pending.map((request) => (
              <View key={request.id} className="flex-row items-center gap-3 py-2.5 opacity-90">
                <ProfileAvatar
                  avatarMediaAssetId={null}
                  photoUrl={request.childPhotoUrl}
                  name={request.childName ?? '?'}
                  size={40}
                  fallbackClassName="bg-sunshine"
                  fallbackTextClassName="text-sunshine-ink"
                />
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-[15px] font-semibold text-foreground">
                    {request.childName}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">
                    {request.centerName}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1 rounded-full bg-sunshine px-2 py-1">
                  <Ionicons name="time-outline" size={12} color="#F4A621" />
                  <Text className="text-[10px] font-bold text-sunshine-ink">
                    {t('childSwitcher.pending')}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View className="my-2 h-px bg-border" />

          <Pressable
            onPress={() => {
              onClose();
              router.push('/children/add');
            }}
            className="flex-row items-center gap-3 py-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-primary/50">
              <Ionicons name="add" size={20} color={colors.primary} />
            </View>
            <Text className="text-[15px] font-bold text-primary">
              {t('childSwitcher.addChild')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
