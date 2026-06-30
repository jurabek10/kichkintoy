import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { ConfirmModal } from '@/components/medication/confirm-modal';
import { FormDateField, FormField } from '@/components/medication/fields';
import { SignaturePad } from '@/components/medication/signature-pad';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { useCreateMedicationRequest, useMedicationChildren } from '@/data/medications';
import { formatLongDate, todayIsoDate } from '@/lib/date';
import { uploadMedication, writeBase64Png } from '@/lib/upload';
import { cn } from '@/lib/utils';

const CORAL = '#E8674E';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-coral-ink">{title}</Text>
      {children}
    </View>
  );
}

export default function NewMedicationScreen() {
  const { t, i18n } = useTranslation(['medications', 'nav']);
  const router = useRouter();
  const lang = i18n.language;
  const { data: children } = useMedicationChildren();
  const create = useCreateMedicationRequest();

  const [childId, setChildId] = useState('');
  const [requestedForDate, setRequestedForDate] = useState(todayIsoDate());
  const [symptoms, setSymptoms] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [medicationType, setMedicationType] = useState('');
  const [dosage, setDosage] = useState('');
  const [medicationTime, setMedicationTime] = useState('');
  const [medicationCount, setMedicationCount] = useState('');
  const [storageMethod, setStorageMethod] = useState('');
  const [instructions, setInstructions] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const [consent, setConsent] = useState(false);

  const [photoAssetId, setPhotoAssetId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [signatureAssetId, setSignatureAssetId] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signVisible, setSignVisible] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!childId && children[0]) setChildId(children[0].id);
  }, [children, childId]);

  const childOptions: SelectOption[] = children.map((child) => ({
    id: child.id,
    label: child.name,
    subtitle: child.className ?? undefined,
  }));
  const selectedChild = children.find((child) => child.id === childId) ?? null;

  /** Pick a medicine photo and upload it. Needs a child (for the center scope). */
  async function pickPhoto() {
    if (!selectedChild) return setError(t('validation.childRequired'));
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError(t('validation.photoPermission'));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setError(null);
    setPhotoUploading(true);
    try {
      const id = await uploadMedication({
        uri: asset.uri,
        centerId: selectedChild.centerId,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? 'medicine.jpg',
      });
      setPhotoAssetId(id);
      setPhotoPreview(asset.uri);
    } catch {
      setError(t('validation.uploadFailed'));
    } finally {
      setPhotoUploading(false);
    }
  }

  /** Persist a drawn signature: write the PNG to a temp file and upload it. */
  async function handleSignature(dataUrl: string) {
    setSignVisible(false);
    if (!selectedChild) return setError(t('validation.childRequired'));
    setError(null);
    setSignatureUploading(true);
    try {
      const uri = await writeBase64Png(dataUrl);
      const id = await uploadMedication({
        uri,
        centerId: selectedChild.centerId,
        mimeType: 'image/png',
        fileName: 'signature.png',
      });
      setSignatureAssetId(id);
      setSignaturePreview(dataUrl);
    } catch {
      setError(t('validation.uploadFailed'));
    } finally {
      setSignatureUploading(false);
    }
  }

  /** Validate, then open the confirmation modal — never submit directly. */
  function review() {
    setError(null);
    if (!childId) return setError(t('validation.childRequired'));
    if (!symptoms.trim()) return setError(t('validation.symptomsRequired'));
    if (!medicineName.trim()) return setError(t('validation.medicineNameRequired'));
    if (!medicationType.trim()) return setError(t('validation.medicationTypeRequired'));
    if (!dosage.trim()) return setError(t('validation.dosageRequired'));
    if (!medicationTime.trim()) return setError(t('validation.medicationTimeRequired'));
    if (!signatureAssetId) return setError(t('validation.signatureRequired'));
    if (!consent) return setError(t('validation.consentRequired'));
    setConfirming(true);
  }

  function submit() {
    create.mutate(
      {
        childId,
        requestedForDate,
        symptoms: symptoms.trim(),
        medicineName: medicineName.trim(),
        medicationType: medicationType.trim(),
        dosage: dosage.trim(),
        medicationTime: medicationTime.trim(),
        medicationCount: medicationCount.trim() || undefined,
        storageMethod: storageMethod.trim() || undefined,
        instructions: instructions.trim() || undefined,
        specialNote: specialNote.trim() || undefined,
        photoMediaAssetId: photoAssetId ?? undefined,
        parentSignature: `media:${signatureAssetId}`,
        consent: true,
      },
      {
        onSuccess: (request) => {
          setConfirming(false);
          router.replace({ pathname: '/medications/[id]', params: { id: request.id } });
        },
        onError: (err) => {
          setConfirming(false);
          setError(err instanceof Error ? err.message : t('validation.requestFailed'));
        },
      },
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('composer.newTitle')} back />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-3 p-4 pb-6">
          {error ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-coral px-4 py-3">
              <Ionicons name="alert-circle" size={18} color={CORAL} />
              <Text className="flex-1 text-sm font-semibold text-coral-ink">{error}</Text>
            </View>
          ) : null}

          <Section title={t('sections.who')}>
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase text-muted">
                {t('composer.child')}
                <Text className="text-coral-ink"> *</Text>
              </Text>
              <SelectField
                placeholder={t('composer.chooseChild')}
                title={t('composer.chooseChild')}
                value={selectedChild ? { id: selectedChild.id, label: selectedChild.name } : null}
                options={childOptions}
                onChange={(option) => setChildId(option.id)}
              />
            </View>
            <FormDateField
              label={t('composer.date')}
              title={t('composer.date')}
              value={requestedForDate}
              onChange={setRequestedForDate}
              lang={lang}
            />
          </Section>

          <Section title={t('sections.medicine')}>
            <FormField label={t('composer.symptoms')} value={symptoms} onChange={setSymptoms} required multiline />
            <FormField label={t('composer.medicineName')} value={medicineName} onChange={setMedicineName} required />
            <FormField label={t('composer.medicationType')} value={medicationType} onChange={setMedicationType} required />
            <FormField label={t('composer.dosage')} value={dosage} onChange={setDosage} required />
            <FormField label={t('composer.medicationTime')} value={medicationTime} onChange={setMedicationTime} required />
            <FormField label={t('composer.countFrequency')} value={medicationCount} onChange={setMedicationCount} />
            <FormField label={t('composer.storageMethod')} value={storageMethod} onChange={setStorageMethod} />

            {/* Medicine photo */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase text-muted">
                {t('composer.medicationPhoto')}
              </Text>
              {photoPreview ? (
                <View className="flex-row items-center gap-3">
                  <Image source={{ uri: photoPreview }} className="h-16 w-16 rounded-xl bg-segment" />
                  <Pressable onPress={pickPhoto} disabled={photoUploading} hitSlop={6}>
                    <Text className="text-sm font-bold text-coral-ink">
                      {t('composer.changePhoto')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={pickPhoto}
                  disabled={photoUploading}
                  className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background py-5">
                  {photoUploading ? (
                    <ActivityIndicator size="small" color={CORAL} />
                  ) : (
                    <Ionicons name="camera-outline" size={20} color={CORAL} />
                  )}
                  <Text className="text-sm font-semibold text-muted">
                    {photoUploading ? t('composer.uploading') : t('composer.addPhoto')}
                  </Text>
                </Pressable>
              )}
            </View>
          </Section>

          <Section title={t('sections.notes')}>
            <FormField label={t('composer.instructions')} value={instructions} onChange={setInstructions} multiline />
            <FormField label={t('composer.specialNote')} value={specialNote} onChange={setSpecialNote} multiline />
          </Section>

          <Section title={t('sections.authorize')}>
            {/* Finger-drawn signature */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase text-muted">
                {t('composer.parentSignature')}
                <Text className="text-coral-ink"> *</Text>
              </Text>
              {signaturePreview ? (
                <View className="gap-2">
                  <View className="h-28 items-center justify-center rounded-2xl border border-border bg-card">
                    <Image
                      source={{ uri: signaturePreview }}
                      className="h-full w-full"
                      resizeMode="contain"
                    />
                  </View>
                  <Pressable
                    onPress={() => setSignVisible(true)}
                    disabled={signatureUploading}
                    hitSlop={6}
                    className="self-start">
                    <Text className="text-sm font-bold text-coral-ink">{t('composer.reSign')}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setSignVisible(true)}
                  disabled={signatureUploading}
                  className="h-28 items-center justify-center gap-2 rounded-2xl border border-dashed border-coral-ink bg-coral">
                  {signatureUploading ? (
                    <ActivityIndicator size="small" color={CORAL} />
                  ) : (
                    <Ionicons name="create-outline" size={22} color={CORAL} />
                  )}
                  <Text className="text-sm font-semibold text-coral-ink">
                    {signatureUploading ? t('composer.uploading') : t('composer.tapToSign')}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Consent */}
            <Pressable
              onPress={() => setConsent((value) => !value)}
              className="flex-row items-start gap-3 rounded-2xl bg-coral p-3.5">
              <View
                className={cn(
                  'mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 border-coral-ink',
                  consent ? 'bg-coral-ink' : 'bg-card',
                )}>
                {consent ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-foreground">
                {t('composer.consent')}
              </Text>
            </Pressable>
          </Section>
        </ScrollView>

        <View className="border-t border-border bg-card px-4 pb-6 pt-3">
          <Pressable
            onPress={review}
            className="flex-row items-center justify-center gap-1.5 rounded-full bg-coral-ink py-3.5">
            <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
            <Text className="text-[15px] font-bold text-white">{t('composer.saveRequest')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <SignaturePad
        visible={signVisible}
        onClose={() => setSignVisible(false)}
        onSave={handleSignature}
      />

      <ConfirmModal
        visible={confirming}
        title={t('confirm.title')}
        body={t('confirm.body')}
        summary={[
          { label: t('composer.child'), value: selectedChild?.name ?? '' },
          { label: t('composer.date'), value: formatLongDate(requestedForDate, lang) },
          { label: t('composer.medicineName'), value: medicineName },
          { label: t('composer.dosage'), value: dosage },
          { label: t('composer.medicationTime'), value: medicationTime },
        ]}
        confirmLabel={t('confirm.yes')}
        cancelLabel={t('confirm.no')}
        loading={create.isPending}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </SafeAreaView>
  );
}
