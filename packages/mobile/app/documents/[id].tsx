import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompletionMeter } from '@/components/documents/completion-meter';
import { FieldEditor } from '@/components/documents/field-editor';
import { DocumentStatusChip } from '@/components/documents/status-chip';
import { Loader } from '@/components/ui/loader';
import {
  completion,
  isAnswered,
  isEditable,
  useDocumentSubmission,
  useSaveDocumentDraft,
  useSubmitDocument,
  type DocumentAnswers,
  type DocumentAnswerValue,
} from '@/data/documents';
import { formatLongDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const MINT_BG = '#DCF2E3';
const MINT_INK = '#46B06A';
const INK = '#2B2D31';

/** Soft mint header — the calm "paperwork done" identity. */
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

export default function DocumentSubmissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('documents');
  const { data: doc, isPending } = useDocumentSubmission(String(id));
  const saveDraft = useSaveDocumentDraft(String(id));
  const submit = useSubmitDocument(String(id));
  const [local, setLocal] = useState<DocumentAnswers>({});
  const [error, setError] = useState<string | null>(null);

  const answers = useMemo<DocumentAnswers>(
    () => ({ ...(doc?.answers ?? {}), ...local }),
    [doc?.answers, local],
  );

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

  const editable = isEditable(doc.status);
  const { done, total } = completion(doc.fields, answers);
  const busy = saveDraft.isPending || submit.isPending;

  function setAnswer(key: string, value: DocumentAnswerValue) {
    setError(null);
    setLocal((previous) => ({ ...previous, [key]: value }));
  }

  /** First unmet required field, mirroring the server's submit check. */
  function firstGap(): string | null {
    for (const field of doc!.fields) {
      if (field.required && !isAnswered(field, answers[field.key])) {
        return field.type === 'file'
          ? t('form.fileRequiredError', { label: field.label })
          : t('form.requiredError', { label: field.label });
      }
    }
    return null;
  }

  function onSaveDraft() {
    setError(null);
    saveDraft.mutate(answers, { onSuccess: () => setLocal({}) });
  }

  function onSubmit() {
    const gap = firstGap();
    if (gap) return setError(gap);
    submit.mutate(answers, { onSuccess: () => setLocal({}) });
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4 p-4 pb-8">
          {/* Identity block */}
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
            <Text className="text-2xl font-extrabold leading-8 text-foreground">
              {doc.requestTitle}
            </Text>
            <Text className="text-sm text-muted">
              {doc.childName}
              {doc.className ? ` · ${doc.className}` : ''}
            </Text>
          </View>

          {/* Correction note — the loud, actionable banner */}
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

          {editable ? <CompletionMeter done={done} total={total} /> : null}

          {error ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-coral px-4 py-3">
              <Ionicons name="alert-circle" size={18} color="#E8674E" />
              <Text className="flex-1 text-sm font-semibold text-coral-ink">{error}</Text>
            </View>
          ) : null}

          {/* Fields */}
          {doc.fields.map((field) => (
            <FieldEditor
              key={field.key}
              field={field}
              value={answers[field.key]}
              editable={editable}
              centerId={doc.centerId}
              attachments={doc.attachments}
              onChange={(value) => setAnswer(field.key, value)}
            />
          ))}

          {!editable ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-pill p-4">
              <Ionicons name="lock-closed-outline" size={18} color="#8A8F99" />
              <Text className="flex-1 text-sm text-muted">{t('form.lockedNote')}</Text>
            </View>
          ) : null}
        </ScrollView>

        {editable ? (
          <View className="flex-row gap-3 border-t border-border bg-card px-4 pb-6 pt-3">
            <Pressable
              onPress={onSaveDraft}
              disabled={busy}
              className={cn(
                'flex-1 items-center justify-center rounded-full bg-pill py-3.5',
                busy && 'opacity-70',
              )}>
              {saveDraft.isPending ? (
                <ActivityIndicator size="small" color={MINT_INK} />
              ) : (
                <Text className="text-sm font-bold text-muted">{t('detail.saveDraft')}</Text>
              )}
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={busy}
              className={cn(
                'flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-3.5',
                busy && 'opacity-70',
              )}
              style={{ backgroundColor: MINT_INK }}>
              {submit.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              )}
              <Text className="text-sm font-bold text-white">{t('detail.submit')}</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
