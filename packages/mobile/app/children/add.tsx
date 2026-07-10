import { Ionicons } from '@expo/vector-icons';
import { relationshipTypeValues } from '@kichkintoy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, OptionRow, PrimaryButton } from '@/components/signup/parts';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { colors } from '@/constants/theme';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

/**
 * The in-app "add a kid" wizard (Kidsnote-style): the same steps a parent
 * walked through at signup — kid info, relationship, kindergarten + class —
 * but submitted as a join request while staying signed in. The kid may attend
 * a different kindergarten; it shows as "pending approval" in the switcher
 * until that center's director approves.
 */

type ChildGender = 'boy' | 'girl' | 'prefer_not_to_say';
type RelationshipType = (typeof relationshipTypeValues)[number];

const STEPS = ['child', 'relationship', 'center', 'review'] as const;
type Step = (typeof STEPS)[number] | 'done';

const GENDERS: { value: ChildGender; key: string }[] = [
  { value: 'boy', key: 'signup.boy' },
  { value: 'girl', key: 'signup.girl' },
  { value: 'prefer_not_to_say', key: 'signup.preferNot' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NO_CLASS = '__none';

export default function AddChildScreen() {
  const { t } = useTranslation('app');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('child');
  const stepIndex = step === 'done' ? STEPS.length - 1 : STEPS.indexOf(step);

  // Kid info
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<ChildGender | ''>('');

  // Relationship
  const [relationship, setRelationship] = useState<RelationshipType | ''>('');

  // Kindergarten + class
  const [region, setRegion] = useState<SelectOption | null>(null);
  const [district, setDistrict] = useState<SelectOption | null>(null);
  const [q, setQ] = useState('');
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerName, setCenterName] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const regionId = region?.id ?? null;
  const districtId = district?.id ?? null;
  const locationReady = !!regionId && !!districtId;

  const regionsQuery = useQuery({
    queryKey: ['geo', 'regions'],
    queryFn: () => orpc.geo.regions(),
  });
  const districtsQuery = useQuery({
    queryKey: ['geo', 'districts', regionId],
    queryFn: () => orpc.geo.districts({ regionId: regionId! }),
    enabled: !!regionId,
  });
  const centersQuery = useQuery({
    queryKey: ['centers', 'search', regionId, districtId, q],
    queryFn: () =>
      orpc.centers.search({ regionId: regionId!, districtId: districtId!, q: q.trim() || undefined }),
    enabled: locationReady && step === 'center',
  });
  const classesQuery = useQuery({
    queryKey: ['centers', 'classes', centerId],
    queryFn: () => orpc.centers.classes({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const centers = centersQuery.data ?? [];
  const classOptions: SelectOption[] = [
    { id: NO_CLASS, label: t('signup.dontKnowYet') },
    ...(classesQuery.data ?? []).map((c) => ({
      id: c.id,
      label: c.name,
      subtitle: c.ageGroup ?? undefined,
    })),
  ];
  const classValue: SelectOption = classOptions.find((o) => o.id === classId) ?? classOptions[0];

  const submit = useMutation({
    mutationFn: () =>
      orpc.centers.requestChildJoin({
        centerId: centerId!,
        classId: classId ?? undefined,
        child: {
          name: name.trim(),
          dateOfBirth: dob,
          gender: gender as ChildGender,
          relationshipType: relationship as RelationshipType,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.joinRequests });
      setStep('done');
    },
    onError: (err) => setError((err as { message?: string })?.message ?? 'Error'),
  });

  const dobOk = ISO_DATE.test(dob);
  const childOk = name.trim().length > 0 && dobOk && gender !== '';

  function back() {
    setError(null);
    if (stepIndex <= 0 || step === 'done') {
      router.back();
      return;
    }
    setStep(STEPS[stepIndex - 1]);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {/* Header — the signup wizard's chrome: back / close + progress bars */}
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={back} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text className="text-base font-extrabold text-foreground">
            {t('childSwitcher.addChild')}
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View className="mt-3 flex-row gap-1">
          {STEPS.map((key, index) => (
            <View
              key={key}
              className={cn(
                'h-1 flex-1 rounded-full',
                step === 'done' || index <= stepIndex ? 'bg-primary' : 'bg-segment',
              )}
            />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
          {step === 'child' ? (
            <View className="gap-4">
              <View>
                <Text className="text-xl font-extrabold text-foreground">
                  {t('addChild.title')}
                </Text>
                <Text className="mt-1 text-sm text-muted">{t('addChild.childDescription')}</Text>
              </View>

              <Field
                label={t('signup.childName')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Field
                label={t('signup.birthDate')}
                value={dob}
                onChangeText={setDob}
                placeholder="2023-12-04"
                keyboardType="numbers-and-punctuation"
                error={dob.length > 0 && !dobOk ? 'YYYY-MM-DD' : undefined}
              />

              <View className="gap-1.5">
                <Text className="text-sm font-semibold text-muted">{t('signup.gender')}</Text>
                <View className="flex-row gap-2">
                  {GENDERS.map((option) => {
                    const active = gender === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setGender(option.value)}
                        className={cn(
                          'flex-1 items-center rounded-md border py-2.5',
                          active ? 'border-primary bg-primary' : 'border-border bg-card',
                        )}>
                        <Text
                          className={cn(
                            'text-sm font-semibold',
                            active ? 'text-white' : 'text-muted',
                          )}>
                          {t(option.key)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <PrimaryButton
                label={t('actions.continue')}
                disabled={!childOk}
                onPress={() => setStep('relationship')}
              />
            </View>
          ) : null}

          {step === 'relationship' ? (
            <View className="gap-4">
              <View>
                <Text className="text-xl font-extrabold text-foreground">
                  {t('signup.relationshipTitle')}
                </Text>
                <Text className="mt-1 text-sm text-muted">
                  {t('signup.relationshipDescription')}
                </Text>
              </View>

              <View className="gap-2">
                {relationshipTypeValues.map((value) => (
                  <OptionRow
                    key={value}
                    title={t(`signup.relationshipOptions.${value}`)}
                    selected={relationship === value}
                    onPress={() => setRelationship(value)}
                  />
                ))}
              </View>

              <PrimaryButton
                label={t('actions.continue')}
                disabled={relationship === ''}
                onPress={() => setStep('center')}
              />
            </View>
          ) : null}

          {step === 'center' ? (
            <View className="gap-4">
              <View>
                <Text className="text-xl font-extrabold text-foreground">
                  {t('signup.centerTitle')}
                </Text>
                <Text className="mt-1 text-sm text-muted">{t('addChild.centerDescription')}</Text>
              </View>

              <View className="flex-row gap-2">
                <SelectField
                  placeholder={t('signup.selectRegion')}
                  title={t('signup.region')}
                  value={region}
                  options={(regionsQuery.data ?? []).map((r) => ({ id: r.id, label: r.name }))}
                  loading={regionsQuery.isPending}
                  searchable
                  searchPlaceholder={t('signup.region')}
                  onChange={(opt) => {
                    setRegion(opt);
                    setDistrict(null);
                    setCenterId(null);
                    setCenterName(null);
                    setClassId(null);
                    setClassName(null);
                  }}
                />
                <SelectField
                  placeholder={t('signup.selectDistrict')}
                  title={t('signup.district')}
                  value={district}
                  disabled={!regionId}
                  options={(districtsQuery.data ?? []).map((d) => ({ id: d.id, label: d.name }))}
                  loading={districtsQuery.isPending}
                  searchable
                  searchPlaceholder={t('signup.district')}
                  onChange={(opt) => {
                    setDistrict(opt);
                    setCenterId(null);
                    setCenterName(null);
                    setClassId(null);
                    setClassName(null);
                  }}
                />
              </View>

              <View className="flex-row items-center gap-2 rounded-md bg-card px-3 py-2.5">
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  className="flex-1 p-0 text-[15px] text-foreground"
                  placeholder={t('signup.kindergartenNamePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={q}
                  onChangeText={setQ}
                  editable={locationReady}
                />
              </View>

              {!locationReady ? (
                <Text className="px-1 text-sm text-muted">{t('signup.pickRegionFirst')}</Text>
              ) : centers.length === 0 && !centersQuery.isPending ? (
                <Text className="px-1 text-sm text-muted">{t('signup.noCentersFound')}</Text>
              ) : (
                <View className="gap-2">
                  {centers.map((center) => (
                    <OptionRow
                      key={center.id}
                      title={center.name}
                      subtitle={center.address ?? center.district ?? undefined}
                      selected={centerId === center.id}
                      onPress={() => {
                        setCenterId(center.id);
                        setCenterName(center.name);
                        setClassId(null);
                        setClassName(null);
                      }}
                    />
                  ))}
                </View>
              )}

              {centerId ? (
                <View className="gap-1.5">
                  <Text className="text-sm font-semibold text-muted">{t('signup.classTitle')}</Text>
                  <SelectField
                    placeholder={t('signup.dontKnowYet')}
                    title={t('signup.classTitle')}
                    value={classValue}
                    options={classOptions}
                    loading={classesQuery.isPending}
                    onChange={(opt) => {
                      setClassId(opt.id === NO_CLASS ? null : opt.id);
                      setClassName(opt.id === NO_CLASS ? null : opt.label);
                    }}
                  />
                </View>
              ) : null}

              <PrimaryButton
                label={t('actions.continue')}
                disabled={!centerId}
                onPress={() => setStep('review')}
              />
            </View>
          ) : null}

          {step === 'review' ? (
            <View className="gap-4">
              <View>
                <Text className="text-xl font-extrabold text-foreground">
                  {t('signup.reviewTitle')}
                </Text>
                <Text className="mt-1 text-sm text-muted">{t('addChild.reviewDescription')}</Text>
              </View>

              <View className="rounded-md border border-border bg-card px-4 py-1">
                <Row label={t('signup.childName')} value={name.trim()} />
                <Row label={t('signup.birthDate')} value={dob} />
                <Row
                  label={t('signup.steps.relationship')}
                  value={relationship ? t(`signup.relationshipOptions.${relationship}`) : '—'}
                />
                <Row label={t('signup.steps.kindergarten')} value={centerName ?? '—'} />
                <Row
                  label={t('signup.steps.class')}
                  value={className ?? t('signup.dontKnowYet')}
                />
                <Row label={t('signup.status')} value={t('signup.pendingApproval')} last />
              </View>

              {error ? <Text className="text-sm text-coral-ink">{error}</Text> : null}

              <PrimaryButton
                label={submit.isPending ? t('addChild.submitting') : t('addChild.submit')}
                loading={submit.isPending}
                onPress={() => {
                  setError(null);
                  submit.mutate();
                }}
              />
            </View>
          ) : null}

          {step === 'done' ? (
            <View className="items-center gap-3 pt-10">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-mint">
                <Ionicons name="checkmark-circle" size={36} color="#46B06A" />
              </View>
              <Text className="text-xl font-extrabold text-foreground">
                {t('addChild.successTitle')}
              </Text>
              <Text className="px-6 text-center text-sm text-muted">
                {t('addChild.successBody', { child: name.trim(), center: centerName ?? '' })}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-sunshine px-3 py-1">
                <Ionicons name="time-outline" size={13} color="#F4A621" />
                <Text className="text-xs font-bold text-sunshine-ink">
                  {t('childSwitcher.pending')}
                </Text>
              </View>
              <View className="mt-3 w-full">
                <PrimaryButton
                  label={t('addChild.backToHome')}
                  onPress={() => router.replace('/(tabs)')}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={cn(
        'flex-row items-center justify-between py-2.5',
        !last && 'border-b border-border',
      )}>
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
