import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { DateField } from '@/components/documents/date-field';
import { SignaturePad } from '@/components/medication/signature-pad';
import { SignedImage } from '@/components/medication/signed-image';
import { colors } from '@/constants/theme';
import type { DocumentAnswerValue, DocumentAttachment, DocumentField } from '@/data/documents';
import { uploadMedia, writeBase64Png } from '@/lib/upload';
import { cn } from '@/lib/utils';

const MINT_INK = '#46B06A';
// Word documents the parent may attach (PDF/images go through the same picker).
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/*',
];
const INPUT = 'rounded-2xl border border-border bg-card px-4 py-3 text-[15px] text-foreground';

const isString = (v: unknown): v is string => typeof v === 'string';
const asStrings = (v: DocumentAnswerValue | undefined): string[] =>
  Array.isArray(v) ? v.filter(isString) : [];
const isImageMime = (mime?: string) => !!mime && mime.startsWith('image/');

function Wrapper({
  label,
  required,
  helpText,
  children,
}: {
  label: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase text-muted">
        {label}
        {required ? <Text className="text-mint-ink"> *</Text> : null}
      </Text>
      {helpText ? <Text className="-mt-0.5 text-xs text-muted">{helpText}</Text> : null}
      {children}
    </View>
  );
}

/** Renders one document field by its type. The host owns the answer value; file
 *  uploads and the drawn signature stream straight to storage and store the
 *  media asset id in the answer array. */
export function FieldEditor({
  field,
  value,
  editable,
  centerId,
  attachments,
  onChange,
}: {
  field: DocumentField;
  value: DocumentAnswerValue | undefined;
  editable: boolean;
  centerId: string;
  attachments: DocumentAttachment[];
  onChange: (value: DocumentAnswerValue) => void;
}) {
  const { t } = useTranslation('documents');
  const [uploading, setUploading] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signPreview, setSignPreview] = useState<string | null>(null);
  // Just-uploaded files: keep the local uri + mime so we can preview them
  // instantly, before they become a downloadable attachment on save.
  const [localMeta, setLocalMeta] =
    useState<Record<string, { mime?: string; name?: string; uri?: string }>>({});
  const text = typeof value === 'string' ? value : '';

  function metaFor(id: string): { mime?: string; name?: string; uri?: string } {
    if (localMeta[id]) return localMeta[id];
    const att = attachments.find((a) => a.mediaAssetId === id);
    return { mime: att?.mimeType ?? undefined, name: att?.originalFilename ?? undefined };
  }

  // --- Date ----------------------------------------------------------------
  if (field.type === 'date') {
    return (
      <DateField
        label={field.label}
        required={field.required}
        helpText={field.helpText}
        value={text}
        onChange={onChange}
        disabled={!editable}
      />
    );
  }

  // --- Checkbox ------------------------------------------------------------
  if (field.type === 'checkbox') {
    const checked = value === true;
    return (
      <Pressable
        onPress={() => editable && onChange(!checked)}
        className="flex-row items-start gap-3 rounded-2xl border border-border bg-card p-3.5">
        <View
          className={cn(
            'mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 border-mint-ink',
            checked ? 'bg-mint-ink' : 'bg-card',
          )}>
          {checked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
        </View>
        <Text className="flex-1 text-[13px] leading-5 text-foreground">
          {field.helpText ?? field.label}
          {field.required ? <Text className="text-mint-ink"> *</Text> : null}
        </Text>
      </Pressable>
    );
  }

  // --- Signature — drawn with the finger, stored as a media asset ----------
  if (field.type === 'signature') {
    const signed = asStrings(value)[0];

    async function onSign(dataUrl: string) {
      setSignOpen(false);
      // Show the drawing immediately — it isn't a downloadable attachment until
      // the form is saved, so a server fetch would 403 until then.
      setSignPreview(dataUrl);
      setUploading(true);
      try {
        const uri = await writeBase64Png(dataUrl);
        const id = await uploadMedia({
          uri,
          centerId,
          mimeType: 'image/png',
          fileName: 'signature.png',
          purpose: 'student_document',
        });
        setLocalMeta((m) => ({ ...m, [id]: { mime: 'image/png' } }));
        onChange([id]);
      } finally {
        setUploading(false);
      }
    }

    return (
      <Wrapper label={field.label} required={field.required} helpText={field.helpText}>
        {signPreview || signed ? (
          <View className="gap-2">
            <View className="h-28 items-center justify-center rounded-2xl border border-border bg-card">
              {signPreview ? (
                <Image source={{ uri: signPreview }} className="h-full w-full" resizeMode="contain" />
              ) : (
                <SignedImage
                  assetId={signed}
                  className="h-full w-full"
                  resizeMode="contain"
                  fallbackIcon="create-outline"
                />
              )}
            </View>
            {editable ? (
              <Pressable onPress={() => setSignOpen(true)} hitSlop={6} className="self-start">
                <Text className="text-sm font-bold text-mint-ink">{t('form.reSign')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : editable ? (
          <Pressable
            onPress={() => setSignOpen(true)}
            disabled={uploading}
            className="h-28 items-center justify-center gap-2 rounded-2xl border border-dashed border-mint-ink bg-mint">
            {uploading ? (
              <ActivityIndicator size="small" color={MINT_INK} />
            ) : (
              <Ionicons name="create-outline" size={22} color={MINT_INK} />
            )}
            <Text className="text-sm font-bold text-mint-ink">
              {uploading ? t('form.uploading') : t('form.tapToSign')}
            </Text>
          </Pressable>
        ) : (
          <Text className="text-sm text-muted">—</Text>
        )}
        <SignaturePad visible={signOpen} onClose={() => setSignOpen(false)} onSave={onSign} />
      </Wrapper>
    );
  }

  // --- Single / multi choice — chips ---------------------------------------
  if (field.type === 'single_choice' || field.type === 'multi_choice') {
    const multi = field.type === 'multi_choice';
    const selected = multi ? asStrings(value) : [text];
    const options = field.options ?? [];
    return (
      <Wrapper
        label={field.label}
        required={field.required}
        helpText={field.helpText ?? t(multi ? 'form.selectMany' : 'form.choose')}>
        <View className="flex-row flex-wrap gap-2">
          {options.map((option) => {
            const on = selected.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  if (!editable) return;
                  if (!multi) return onChange(option.value);
                  onChange(on ? selected.filter((v) => v !== option.value) : [...selected, option.value]);
                }}
                className={cn(
                  'rounded-full border px-4 py-2',
                  on ? 'border-mint-ink bg-mint' : 'border-border bg-card',
                )}>
                <Text className={cn('text-sm font-bold', on ? 'text-mint-ink' : 'text-muted')}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Wrapper>
    );
  }

  // --- File — photo + document (pdf / doc / docx) --------------------------
  if (field.type === 'file') {
    const ids = asStrings(value);
    const max = field.maxFiles ?? 5;

    async function add(uri: string, mimeType: string, fileName: string) {
      setUploading(true);
      try {
        const id = await uploadMedia({ uri, centerId, mimeType, fileName, purpose: 'student_document' });
        setLocalMeta((m) => ({ ...m, [id]: { mime: mimeType, name: fileName, uri } }));
        onChange([...ids, id]);
      } finally {
        setUploading(false);
      }
    }

    async function addPhoto() {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled) return;
      const asset = result.assets[0];
      await add(asset.uri, asset.mimeType ?? 'image/jpeg', asset.fileName ?? 'photo.jpg');
    }

    async function addDocument() {
      const result = await DocumentPicker.getDocumentAsync({
        type: DOC_TYPES,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      await add(asset.uri, asset.mimeType ?? 'application/octet-stream', asset.name ?? 'document');
    }

    return (
      <Wrapper label={field.label} required={field.required} helpText={field.helpText}>
        {ids.length > 0 ? (
          <View className="gap-2">
            {ids.map((id) => {
              const m = metaFor(id);
              const image = isImageMime(m.mime) || !m.mime;
              return (
                <View
                  key={id}
                  className={cn(
                    'flex-row items-center gap-3 rounded-xl border border-border bg-card p-2',
                    image && 'p-0',
                  )}>
                  {image ? (
                    <View className="h-20 w-20 overflow-hidden rounded-xl">
                      {m.uri ? (
                        <Image source={{ uri: m.uri }} className="h-full w-full" resizeMode="cover" />
                      ) : (
                        <SignedImage assetId={id} className="h-full w-full" fallbackIcon="document-text-outline" />
                      )}
                    </View>
                  ) : (
                    <>
                      <View className="h-10 w-10 items-center justify-center rounded-lg bg-mint">
                        <Ionicons name="document-text" size={20} color={MINT_INK} />
                      </View>
                      <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                        {m.name ?? t('detail.file')}
                      </Text>
                    </>
                  )}
                  {editable ? (
                    <Pressable
                      onPress={() => onChange(ids.filter((x) => x !== id))}
                      hitSlop={6}
                      className={cn(
                        'items-center justify-center',
                        image ? 'absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60' : 'px-1',
                      )}>
                      <Ionicons name="close" size={image ? 14 : 18} color={image ? '#FFFFFF' : '#8A8F99'} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
        {editable && ids.length < max ? (
          <View className="flex-row gap-2">
            <FileButton icon="image-outline" label={t('form.addPhoto')} onPress={addPhoto} busy={uploading} />
            <FileButton icon="document-attach-outline" label={t('form.addFile')} onPress={addDocument} busy={uploading} />
          </View>
        ) : null}
      </Wrapper>
    );
  }

  // --- Text-like: short_text / long_text / phone ---------------------------
  const multiline = field.type === 'long_text';
  return (
    <Wrapper label={field.label} required={field.required} helpText={field.helpText}>
      <TextInput
        value={text}
        onChangeText={onChange}
        editable={editable}
        multiline={multiline}
        keyboardType={field.type === 'phone' ? 'phone-pad' : 'default'}
        placeholderTextColor={colors.textMuted}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={cn(INPUT, multiline && 'min-h-[88px]', !editable && 'bg-segment text-muted')}
      />
    </Wrapper>
  );
}

function FileButton({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-mint-ink bg-mint py-3.5">
      {busy ? (
        <ActivityIndicator size="small" color={MINT_INK} />
      ) : (
        <Ionicons name={icon} size={18} color={MINT_INK} />
      )}
      <Text className="text-sm font-bold text-mint-ink">{label}</Text>
    </Pressable>
  );
}
