import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { FormDateField, FormField } from '@/components/medication/fields';
import { TimePickerSheet } from '@/components/pickup/time-picker-sheet';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import type { PickupChildOption, PickupRelationship } from '@/data/pickups';
import { cn } from '@/lib/utils';

const SUNSHINE = '#F4A621';
const RELATIONSHIPS: PickupRelationship[] = ['mother', 'father', 'grandparent', 'other'];

type IconName = ComponentProps<typeof Ionicons>['name'];

/** A titled, iconed card grouping related fields — gives the form a scannable
 *  rhythm (Who's collecting → When → Note). */
function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-sunshine">
          <Ionicons name={icon} size={15} color={SUNSHINE} />
        </View>
        <Text className="text-[14px] font-extrabold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}

export type PickupFormValues = {
  childId: string;
  pickupDate: string;
  pickupTime: string;
  pickupPersonName: string;
  relationship: PickupRelationship;
  note: string;
};

/**
 * The notice form, shared by the new-notice screen and the detail screen's
 * edit mode. In `edit` mode the child can't move, so the child picker is
 * hidden (the API's update body omits childId).
 */
export function PickupForm({
  mode,
  childOptions,
  initial,
  submitLabel,
  submitIcon = 'paper-plane',
  submitting,
  lang,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  childOptions?: PickupChildOption[];
  initial: PickupFormValues;
  submitLabel: string;
  submitIcon?: keyof typeof Ionicons.glyphMap;
  submitting?: boolean;
  lang: string;
  onSubmit: (values: PickupFormValues) => void;
}) {
  const { t } = useTranslation('pickups');
  const [childId, setChildId] = useState(initial.childId);
  const [pickupDate, setPickupDate] = useState(initial.pickupDate);
  const [pickupTime, setPickupTime] = useState(initial.pickupTime);
  const [personName, setPersonName] = useState(initial.pickupPersonName);
  const [relationship, setRelationship] = useState<PickupRelationship>(initial.relationship);
  const [note, setNote] = useState(initial.note);
  const [error, setError] = useState<string | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);

  const options: SelectOption[] = (childOptions ?? []).map((child) => ({
    id: child.id,
    label: child.name,
    subtitle: child.className ?? undefined,
  }));
  const selectedChild = (childOptions ?? []).find((child) => child.id === childId) ?? null;

  function submit() {
    setError(null);
    if (mode === 'create' && !childId) return setError(t('validation.childRequired'));
    if (!pickupDate) return setError(t('validation.dateRequired'));
    if (!pickupTime) return setError(t('validation.timeRequired'));
    if (!personName.trim()) return setError(t('validation.personRequired'));
    onSubmit({
      childId,
      pickupDate,
      pickupTime,
      pickupPersonName: personName.trim(),
      relationship,
      note: note.trim(),
    });
  }

  return (
    <View className="gap-4">
      {error ? (
        <View className="flex-row items-center gap-2 rounded-2xl bg-coral px-4 py-3">
          <Ionicons name="alert-circle" size={18} color="#E8674E" />
          <Text className="flex-1 text-sm font-semibold text-coral-ink">{error}</Text>
        </View>
      ) : null}

      <Section icon="walk-outline" title={t('sections.who')}>
        {mode === 'create' ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase text-muted">
              {t('composer.child')}
              <Text className="text-sunshine-ink"> *</Text>
            </Text>
            <SelectField
              placeholder={t('composer.chooseChild')}
              title={t('composer.chooseChild')}
              value={selectedChild ? { id: selectedChild.id, label: selectedChild.name } : null}
              options={options}
              onChange={(option) => setChildId(option.id)}
            />
            {selectedChild?.className ? (
              <Text className="text-xs text-muted">{selectedChild.className}</Text>
            ) : null}
          </View>
        ) : null}

        <FormField
          label={t('composer.personName')}
          value={personName}
          onChange={setPersonName}
          required
        />

        {/* Relationship — chips beat a dropdown for four fixed choices */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase text-muted">
            {t('composer.relationship')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {RELATIONSHIPS.map((value) => {
              const selected = value === relationship;
              return (
                <Pressable
                  key={value}
                  onPress={() => setRelationship(value)}
                  className={cn(
                    'rounded-full border px-4 py-2',
                    selected ? 'border-sunshine-ink bg-sunshine' : 'border-border bg-card',
                  )}>
                  <Text
                    className={cn(
                      'text-sm font-bold',
                      selected ? 'text-sunshine-ink' : 'text-muted',
                    )}>
                    {t(`relationship.${value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Section>

      <Section icon="time-outline" title={t('sections.when')}>
        <FormDateField
          label={t('composer.date')}
          title={t('composer.date')}
          value={pickupDate}
          onChange={setPickupDate}
          lang={lang}
        />

        {/* Time — opens the 24-hour wheel */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase text-muted">
            {t('composer.time')}
            <Text className="text-sunshine-ink"> *</Text>
          </Text>
          <Pressable
            onPress={() => setTimeOpen(true)}
            className="flex-row items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="time-outline" size={18} color={SUNSHINE} />
              <Text className="text-[17px] font-bold tabular-nums text-foreground">{pickupTime}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#8A8F99" />
          </Pressable>
        </View>
      </Section>

      <Section icon="chatbubble-outline" title={t('sections.note')}>
        <FormField
          label={t('composer.note')}
          value={note}
          onChange={setNote}
          multiline
          maxLength={500}
        />
      </Section>

      <Pressable
        onPress={submit}
        disabled={submitting}
        className={cn(
          'mt-1 flex-row items-center justify-center gap-1.5 rounded-full bg-sunshine-ink py-3.5',
          submitting && 'opacity-70',
        )}>
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name={submitIcon} size={17} color="#FFFFFF" />
        )}
        <Text className="text-[15px] font-bold text-white">{submitLabel}</Text>
      </Pressable>

      <TimePickerSheet
        visible={timeOpen}
        value={pickupTime}
        onClose={() => setTimeOpen(false)}
        onChange={setPickupTime}
      />
    </View>
  );
}
