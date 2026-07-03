import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/documents/date-field';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { StackHeader } from '@/components/common/stack-header';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useApplyChild, useParentChildren, type ParentChild } from '@/data/profile';
import { orpc } from '@/lib/orpc';
import { uploadMedia } from '@/lib/upload';
import { cn } from '@/lib/utils';

function Field({
  label,
  value,
  onChangeText,
  multiline,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textMuted}
        className="rounded-2xl border border-border bg-card px-3.5 py-3 text-[15px] text-foreground"
        style={multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}

function ChildForm({ child }: { child: ParentChild }) {
  const router = useRouter();
  const { t } = useTranslation('profile');
  const applyChild = useApplyChild();

  const [firstName, setFirstName] = useState(child.firstName);
  const [lastName, setLastName] = useState(child.lastName ?? '');
  const [dob, setDob] = useState(child.dateOfBirth ?? '');
  const [gender, setGender] = useState<ParentChild['gender']>(child.gender);
  const [allergies, setAllergies] = useState(child.allergies ?? '');
  const [medicalNotes, setMedicalNotes] = useState(child.medicalNotes ?? '');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      orpc.profile.updateChild({
        childId: child.id,
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim() ? lastName.trim() : null,
          dateOfBirth: dob,
          gender,
          allergies: allergies.trim() ? allergies.trim() : null,
          medicalNotes: medicalNotes.trim() ? medicalNotes.trim() : null,
        },
      }),
    onSuccess: (next) => {
      applyChild(next);
      router.back();
    },
    onError: () => setError(t('errors.saveFailed')),
  });

  async function pickPhoto() {
    if (!child.centerId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setError(null);
    setPhotoBusy(true);
    try {
      const mediaAssetId = await uploadMedia({
        uri: asset.uri,
        centerId: child.centerId,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? 'child.jpg',
        purpose: 'child_profile',
      });
      applyChild(await orpc.profile.updateChildPhoto({ childId: child.id, mediaAssetId }));
    } catch {
      setError(t('errors.saveFailed'));
    } finally {
      setPhotoBusy(false);
    }
  }

  const removePhoto = useMutation({
    mutationFn: () => orpc.profile.removeChildPhoto({ childId: child.id }),
    onSuccess: applyChild,
  });

  const hasPhoto = Boolean(child.photoMediaAssetId || child.photoUrl);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader
        title={child.name}
        right={{ label: t('actions.save'), onPress: () => (save.isPending ? undefined : save.mutate()) }}
      />
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4 p-4 pb-10">
          {/* Photo */}
          <View className="items-center gap-3 rounded-2xl border border-border bg-card py-6">
            <ProfileAvatar
              avatarMediaAssetId={child.photoMediaAssetId}
              photoUrl={child.photoUrl}
              name={child.name}
              size={92}
              showCamera
              busy={photoBusy}
              onPress={pickPhoto}
              fallbackClassName="bg-sky"
              fallbackTextClassName="text-sky-ink"
            />
            <View className="flex-row items-center gap-4">
              <Pressable onPress={pickPhoto} disabled={photoBusy} hitSlop={6}>
                <Text className="text-[14px] font-bold text-primary">{t('child.photo')}</Text>
              </Pressable>
              {hasPhoto ? (
                <Pressable onPress={() => removePhoto.mutate()} disabled={removePhoto.isPending} hitSlop={6}>
                  <Text className="text-[14px] font-semibold text-coral-ink">{t('actions.removePhoto')}</Text>
                </Pressable>
              ) : null}
            </View>
            {child.centerName ? (
              <Text className="text-[12px] text-muted">
                {[child.centerName, child.className].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>

          <Field label={t('child.firstName')} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Field label={t('child.lastName')} value={lastName} onChangeText={setLastName} autoCapitalize="words" />

          <DateField label={t('child.birthDate')} value={dob} onChange={setDob} required />

          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase text-muted">{t('child.gender')}</Text>
            <View className="flex-row gap-2">
              {(['boy', 'girl'] as const).map((option) => {
                const active = gender === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setGender(option)}
                    className={cn(
                      'flex-1 items-center rounded-2xl border py-3',
                      active ? 'border-primary bg-primary' : 'border-border bg-card',
                    )}>
                    <Text className={cn('text-[15px] font-semibold', active ? 'text-white' : 'text-muted')}>
                      {t(`child.${option}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Field label={t('child.allergies')} value={allergies} onChangeText={setAllergies} multiline />
          <Field label={t('child.medicalNotes')} value={medicalNotes} onChangeText={setMedicalNotes} multiline />

          {error ? <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ChildEditScreen() {
  const { t } = useTranslation('profile');
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data: children = [], isPending } = useParentChildren();
  const child = children.find((c) => c.id === childId);

  if (isPending || !child) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
        <StackHeader title={t('children.title')} />
        <View className="flex-1 bg-background">
          {isPending ? <Loader /> : <Text className="p-6 text-center text-sm text-muted">{t('children.empty')}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return <ChildForm child={child} />;
}
