import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentStatusChip } from '@/components/documents/status-chip';
import { SignedImage } from '@/components/medication/signed-image';
import { Loader } from '@/components/ui/loader';
import { useStaffDocumentDetail, type StaffDocumentDetail } from '@/data/teacher';
import { formatLongDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';

const MINT_BG = '#DCF2E3';
const INK = '#2B2D31';
const MUTED = '#8A8F99';

type Field = StaffDocumentDetail['fields'][number];
type Answers = StaffDocumentDetail['answers'];
type Attachment = StaffDocumentDetail['attachments'][number];

/** Soft mint header — the calm "paperwork" identity. */
function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: MINT_BG }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-foreground">{title}</Text>
        <View className="w-6" />
      </View>
    </SafeAreaView>
  );
}

/** Opens an uploaded file (PDF, Word, …) in the device browser through the
 *  signed-download flow. The object keeps its real content-type, so the browser
 *  renders a PDF inline rather than downloading a blob. */
function FileRow({ attachment, t }: { attachment: Attachment; t: (key: string) => string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function open() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const { downloadUrl } = await orpc.media.getDownloadUrl({ mediaAssetId: attachment.mediaAssetId });
      if (downloadUrl && (await Linking.canOpenURL(downloadUrl))) {
        await Linking.openURL(downloadUrl);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      <Pressable
        onPress={open}
        disabled={busy}
        className="mt-2 flex-row items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 active:opacity-80">
        <Ionicons name="document-attach-outline" size={18} color={MUTED} />
        <Text numberOfLines={1} className="flex-1 text-[14px] text-foreground">
          {attachment.originalFilename ?? t('detail.openFile')}
        </Text>
        {busy ? (
          <ActivityIndicator size="small" color={MUTED} />
        ) : (
          <Ionicons name="open-outline" size={16} color={MUTED} />
        )}
      </Pressable>
      {failed ? (
        <Text className="mt-1 px-1 text-[12px] text-coral-ink">{t('detail.openFailed')}</Text>
      ) : null}
    </View>
  );
}

function isImage(attachment: Attachment) {
  return (attachment.mimeType ?? '').startsWith('image/');
}

/** A single field rendered read-only: its label plus whatever the parent submitted. */
function FieldRow({ field, answers, attachments, t }: {
  field: Field;
  answers: Answers;
  attachments: Attachment[];
  t: (key: string) => string;
}) {
  const value = answers[field.key];
  const fieldFiles = attachments.filter((a) => a.fieldKey === field.key);

  let text: string | null = null;
  if (field.type === 'checkbox') {
    text = value === true ? '✓' : t('detail.noAnswer');
  } else if (field.type === 'single_choice') {
    text = field.options?.find((o) => o.value === value)?.label ?? (typeof value === 'string' ? value : null);
  } else if (field.type === 'multi_choice') {
    const values = Array.isArray(value) ? (value as string[]) : [];
    text = values.length
      ? values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(', ')
      : null;
  } else if (field.type !== 'file' && field.type !== 'signature') {
    text = typeof value === 'string' && value.trim() ? value : null;
  }

  return (
    <View className="gap-1.5 border-t border-border pt-3">
      <Text className="text-[11px] font-semibold uppercase text-muted">{field.label}</Text>

      {field.type === 'signature' || field.type === 'file' ? (
        fieldFiles.length === 0 ? (
          <Text className="text-[15px] text-muted">{t('detail.noAnswer')}</Text>
        ) : (
          <View className="gap-2">
            {fieldFiles.map((a) =>
              isImage(a) ? (
                <View key={a.id} className="overflow-hidden rounded-xl border border-border bg-white">
                  <SignedImage assetId={a.mediaAssetId} className="h-40 w-full" resizeMode="contain" />
                </View>
              ) : (
                <FileRow key={a.id} attachment={a} t={t} />
              ),
            )}
          </View>
        )
      ) : (
        <Text className="text-[15px] text-foreground">{text ?? t('detail.noAnswer')}</Text>
      )}
    </View>
  );
}

export default function StaffDocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('documents');
  const { data: doc, isPending } = useStaffDocumentDetail(String(id));

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!doc) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-4 p-4 pb-10">
        {/* Identity */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <DocumentStatusChip status={doc.status} />
            {doc.dueDate ? (
              <View className="rounded-full bg-pill px-2.5 py-1">
                <Text className="text-[11px] font-bold text-muted">
                  {t('detail.dueDate', { date: formatLongDate(doc.dueDate, i18n.language) })}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-2xl font-extrabold leading-8 text-foreground">{doc.requestTitle}</Text>
          <Text className="text-sm text-muted">
            {doc.childName}
            {doc.className ? ` · ${doc.className}` : ''}
          </Text>
        </View>

        {/* Correction note */}
        {doc.correctionNote ? (
          <View className="gap-1 rounded-2xl bg-coral p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-coral-ink">
              {t('form.correctionTitle')}
            </Text>
            <Text className="text-sm leading-5 text-foreground">{doc.correctionNote}</Text>
          </View>
        ) : null}

        {doc.instructions ? (
          <Text className="text-sm leading-5 text-muted">{doc.instructions}</Text>
        ) : null}

        {/* Responses */}
        <View className="gap-3 rounded-2xl bg-card p-4">
          <Text className="text-[13px] font-extrabold text-foreground">{t('detail.responses')}</Text>
          {doc.fields.map((field) => (
            <FieldRow key={field.key} field={field} answers={doc.answers} attachments={doc.attachments} t={t} />
          ))}
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl bg-pill p-4">
          <Ionicons name="lock-closed-outline" size={18} color={MUTED} />
          <Text className="flex-1 text-sm text-muted">{t('detail.staffLocked')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
