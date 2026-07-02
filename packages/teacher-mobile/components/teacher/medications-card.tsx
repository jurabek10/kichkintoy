import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { useTodayMedications, type StaffMedSummary } from '@/data/medications';

const CORAL = '#E8674E';
const MINT = '#46B06A';

const MAX_ROWS = 4;

type Medication = StaffMedSummary;

// Status → the pill shown on the right of a row (matches the meds screen).
const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  administered: { bg: 'bg-mint', text: 'text-mint-ink' },
  skipped: { bg: 'bg-pill', text: 'text-muted' },
  cancelled: { bg: 'bg-pill', text: 'text-muted' },
};

/** One dose: the child's initial (coral while the dose is still owed, calm once
 *  handled), the medicine line, and its status. Taps into the meds page. */
function MedRow({ med }: { med: Medication }) {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const pending = med.status === 'pending';
  const tone = STATUS_TONE[med.status] ?? STATUS_TONE.pending;
  const initial = med.childName.trim().charAt(0).toUpperCase() || '·';

  return (
    <Pressable
      onPress={() => router.push('/medications')}
      className="flex-row items-center gap-3 rounded-md bg-background p-3">
      <View
        className={`h-10 w-10 items-center justify-center rounded-2xl ${pending ? 'bg-coral' : 'bg-pill'}`}>
        <Text className={`text-base font-extrabold ${pending ? 'text-coral-ink' : 'text-muted'}`}>
          {initial}
        </Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
          {med.childName}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-[13px] text-muted">
          {med.medicineName} · {med.dosage} · {t('medications.atTime', { time: med.medicationTime })}
        </Text>
      </View>
      <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
        <Text className={`text-[11px] font-bold ${tone.text}`}>
          {t(`medications.status.${med.status}`, { defaultValue: med.status })}
        </Text>
      </View>
    </Pressable>
  );
}

/** A calm "all clear" placeholder, in the parent app's empty style: a soft mint
 *  medkit badge and a reassuring line — nothing to give today. */
function EmptyMeds() {
  const { t } = useTranslation('teacher');
  return (
    <View className="items-center gap-2 py-5">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-mint">
        <Ionicons name="medkit-outline" size={26} color={MINT} />
      </View>
      <Text className="text-[15px] font-bold text-foreground">{t('medications.empty')}</Text>
      <Text className="max-w-[240px] text-center text-xs leading-5 text-muted">
        {t('medications.emptySub')}
      </Text>
    </View>
  );
}

/**
 * Home card mirroring the web teacher home's medication board: today's doses
 * parents asked the teacher to give, pending ones first so what's still owed
 * leads. Replaces the old "My classes" card. Caps at four rows with a "+N more"
 * tail, and falls back to a friendly empty state when there's nothing to give.
 */
export function MedicationsCard() {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const query = useTodayMedications();
  const meds = query.data;

  // Pending rises to the top (stable sort keeps the server order within a group).
  const ordered = [...meds].sort(
    (a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1),
  );
  const pendingCount = meds.filter((m) => m.status === 'pending').length;
  const visible = ordered.slice(0, MAX_ROWS);
  const overflow = ordered.length - visible.length;

  return (
    <Card className="mt-3">
      {/* Header: identity + pending count + the way through to the full page. */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-coral">
            <Ionicons name="medkit-outline" size={20} color={CORAL} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text numberOfLines={1} className="text-base font-extrabold text-foreground">
                {t('medications.homeTitle')}
              </Text>
              {pendingCount > 0 ? (
                <View className="rounded-full bg-coral px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-coral-ink">
                    {t('medications.toGive', { count: pendingCount })}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} className="text-[13px] text-muted">
              {t('medications.sub')}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/medications')}
          hitSlop={8}
          className="flex-row items-center gap-1 pl-2">
          <Text className="text-sm font-semibold text-primary">{t('medications.viewAll')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {meds.length === 0 ? (
        <EmptyMeds />
      ) : (
        <View className="mt-4 gap-2.5">
          {visible.map((med) => (
            <MedRow key={med.id} med={med} />
          ))}
          {overflow > 0 ? (
            <Pressable
              onPress={() => router.push('/medications')}
              className="items-center py-1">
              <Text className="text-sm font-semibold text-primary">
                {t('medications.more', { count: overflow })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Card>
  );
}
