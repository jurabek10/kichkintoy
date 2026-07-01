import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { SelectField } from '@/components/ui/select-field';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

const SUBJECTS = ['English', 'Russian', 'Uzbek', 'Math', 'Music', 'Art', 'PE', 'Speech', 'Reading', 'Logic', 'Dance', 'Other'] as const;
const LEVELS = ['excellent', 'good', 'needs_support', 'not_observed', 'absent'] as const;
const INTERESTS = ['high', 'medium', 'low', 'not_observed'] as const;

type Level = (typeof LEVELS)[number];
type Interest = (typeof INTERESTS)[number];

export type ParticipationRow = {
  key: string;
  subject: string;
  customSubject: string;
  participation: Level;
  interest: Interest;
  strengths: string;
  needsPractice: string;
  homeSuggestion: string;
  teacherNote: string;
};

let counter = 0;
export function createParticipationRow(): ParticipationRow {
  return {
    key: `p${Date.now()}-${counter++}`,
    subject: 'English',
    customSubject: '',
    participation: 'good',
    interest: 'medium',
    strengths: '',
    needsPractice: '',
    homeSuggestion: '',
    teacherNote: '',
  };
}

const blank = (v: string) => (v.trim() ? v.trim() : undefined);

/** Rows → language-neutral report items (subject title, level value, JSON note). */
export function participationRowsToItems(rows: ParticipationRow[]) {
  return rows
    .map((row) => {
      const subject = row.subject === 'Other' ? row.customSubject.trim() : row.subject.trim();
      const note = {
        interest: row.interest,
        strengths: blank(row.strengths),
        needsPractice: blank(row.needsPractice),
        homeSuggestion: blank(row.homeSuggestion),
        teacherNote: blank(row.teacherNote),
      };
      return { itemType: 'class_participation' as const, title: subject, value: row.participation, note: JSON.stringify(note) };
    })
    .filter((item) => item.title);
}

/** Rows → the compact shape the AI note endpoint expects. */
export function participationRowsForAI(rows: ParticipationRow[]) {
  return rows
    .filter((row) => row.subject.trim() || row.customSubject.trim())
    .map((row) => ({
      subject: row.subject === 'Other' ? row.customSubject : row.subject,
      level: row.participation,
      interest: row.interest,
      strengths: row.strengths || undefined,
      needsPractice: row.needsPractice || undefined,
    }));
}

function ChipRow<T extends string>({
  options,
  value,
  labelFor,
  onSelect,
}: {
  options: readonly T[];
  value: T;
  labelFor: (v: T) => string;
  onSelect: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            className={cn('rounded-full border px-3 py-1.5', active ? 'border-primary bg-primary' : 'border-border bg-card')}>
            <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>{labelFor(o)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-semibold text-muted">{label}</Text>
      {children}
    </View>
  );
}

function DetailInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        className="rounded-md border border-border bg-background px-3 py-2.5 text-[15px] text-foreground"
      />
    </Field>
  );
}

function RowEditor({
  row,
  index,
  onUpdate,
  onRemove,
}: {
  row: ParticipationRow;
  index: number;
  onUpdate: (patch: Partial<ParticipationRow>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('reports');
  const subjectOptions = SUBJECTS.map((s) => ({ id: s, label: t(`participation.subjects.${s}`, { defaultValue: s }) }));
  const selectedSubject = subjectOptions.find((o) => o.id === row.subject) ?? null;

  return (
    <View className="gap-3.5 rounded-2xl border border-border p-3.5">
      {/* Subject header row — numbered so a long list stays legible. */}
      <View className="flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-grape">
          <Text className="text-[12px] font-extrabold text-grape-ink">{index + 1}</Text>
        </View>
        <View className="flex-1">
          <SelectField
            title={t('participation.subject')}
            placeholder={t('participation.subject')}
            value={selectedSubject}
            options={subjectOptions}
            searchable
            searchPlaceholder={t('participation.subjectName')}
            onChange={(o) => onUpdate({ subject: o.id })}
          />
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-full bg-pill">
          <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {row.subject === 'Other' ? (
        <TextInput
          value={row.customSubject}
          onChangeText={(v) => onUpdate({ customSubject: v })}
          placeholder={t('participation.subjectName')}
          placeholderTextColor={colors.textMuted}
          className="rounded-md border border-border bg-background px-3 py-2.5 text-[15px] text-foreground"
        />
      ) : null}

      <Field label={t('participation.participation')}>
        <ChipRow options={LEVELS} value={row.participation} labelFor={(v) => t(`participationLevels.${v}`)} onSelect={(v) => onUpdate({ participation: v })} />
      </Field>
      <Field label={t('participation.interest')}>
        <ChipRow options={INTERESTS} value={row.interest} labelFor={(v) => t(`participationInterests.${v}`)} onSelect={(v) => onUpdate({ interest: v })} />
      </Field>

      {/* All detail fields visible at once — no extra tap to reveal them. */}
      <View className="h-px bg-border" />
      <DetailInput label={t('participation.strengths')} value={row.strengths} placeholder={t('participation.strengthsPlaceholder')} onChange={(v) => onUpdate({ strengths: v })} />
      <DetailInput label={t('participation.needsPractice')} value={row.needsPractice} placeholder={t('participation.needsPracticePlaceholder')} onChange={(v) => onUpdate({ needsPractice: v })} />
      <DetailInput label={t('participation.homeSuggestion')} value={row.homeSuggestion} placeholder={t('participation.homeSuggestionPlaceholder')} onChange={(v) => onUpdate({ homeSuggestion: v })} />
      <DetailInput label={t('participation.teacherNote')} value={row.teacherNote} placeholder={t('participation.teacherNotePlaceholder')} onChange={(v) => onUpdate({ teacherNote: v })} />
    </View>
  );
}

/** Optional per-subject participation notes — parents see strengths and what to
 *  practise. Stays fully manual; also feeds the AI note. */
export function ReportParticipationSection({
  rows,
  onChange,
}: {
  rows: ParticipationRow[];
  onChange: (rows: ParticipationRow[]) => void;
}) {
  const { t } = useTranslation('reports');

  return (
    <Card className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-extrabold text-foreground">{t('participation.title')}</Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-muted">{t('participation.description')}</Text>
        </View>
      </View>

      {rows.map((row, index) => (
        <RowEditor
          key={row.key}
          row={row}
          index={index}
          onUpdate={(patch) => onChange(rows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)))}
          onRemove={() => onChange(rows.filter((r) => r.key !== row.key))}
        />
      ))}

      <Pressable
        onPress={() => onChange([...rows, createParticipationRow()])}
        className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3">
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text className="text-[14px] font-bold text-primary">{t('participation.addSubject')}</Text>
      </Pressable>
    </Card>
  );
}
