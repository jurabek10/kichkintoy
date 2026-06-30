import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';

import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { colors } from '@/constants/theme';
import { orpc } from '@/lib/orpc';

import { useSignup } from './context';
import { OptionRow } from './parts';
import { StepFooter } from './step-footer';

const NO_CLASS = '__none';

export function CenterStep() {
  const { t } = useTranslation('app');
  const { draft, update, next } = useSignup();
  const [region, setRegion] = useState<SelectOption | null>(null);
  const [district, setDistrict] = useState<SelectOption | null>(null);
  const [q, setQ] = useState('');

  const regionId = region?.id ?? null;
  const districtId = district?.id ?? null;
  const locationReady = !!regionId && !!districtId;

  const regionsQuery = useQuery({ queryKey: ['geo', 'regions'], queryFn: () => orpc.geo.regions() });
  const districtsQuery = useQuery({
    queryKey: ['geo', 'districts', regionId],
    queryFn: () => orpc.geo.districts({ regionId: regionId! }),
    enabled: !!regionId,
  });
  const centersQuery = useQuery({
    queryKey: ['centers', 'search', regionId, districtId, q],
    queryFn: () =>
      orpc.centers.search({ regionId: regionId!, districtId: districtId!, q: q.trim() || undefined }),
    enabled: locationReady,
  });
  const classesQuery = useQuery({
    queryKey: ['centers', 'classes', draft.centerId],
    queryFn: () => orpc.centers.classes({ centerId: draft.centerId! }),
    enabled: !!draft.centerId,
  });

  const centers = centersQuery.data ?? [];

  const classOptions: SelectOption[] = [
    { id: NO_CLASS, label: t('signup.dontKnowYet') },
    ...(classesQuery.data ?? []).map((c) => ({ id: c.id, label: c.name, subtitle: c.ageGroup ?? undefined })),
  ];
  const classValue: SelectOption =
    classOptions.find((o) => o.id === draft.classId) ?? classOptions[0];

  function resetCenter() {
    update({ centerId: null, centerName: null, classId: null, className: null });
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-foreground">{t('signup.centerTitle')}</Text>
        <Text className="mt-1 text-sm text-muted">{t('signup.centerDescription')}</Text>
      </View>

      {/* Location dropdowns */}
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
            resetCenter();
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
            resetCenter();
          }}
        />
      </View>

      {/* Center name search */}
      <View className="flex-row items-center gap-2 rounded-md bg-background px-3 py-2.5">
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

      {/* Results — only after a location is chosen */}
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
              selected={draft.centerId === center.id}
              onPress={() =>
                update({ centerId: center.id, centerName: center.name, classId: null, className: null })
              }
            />
          ))}
        </View>
      )}

      {/* Class — dropdown, after a center is chosen */}
      {draft.centerId ? (
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-muted">{t('signup.classTitle')}</Text>
          <SelectField
            placeholder={t('signup.dontKnowYet')}
            title={t('signup.classTitle')}
            value={classValue}
            options={classOptions}
            loading={classesQuery.isPending}
            onChange={(opt) =>
              update({
                classId: opt.id === NO_CLASS ? null : opt.id,
                className: opt.id === NO_CLASS ? null : opt.label,
              })
            }
          />
        </View>
      ) : null}

      <StepFooter nextLabel={t('actions.continue')} nextDisabled={!draft.centerId} onNext={next} />
    </View>
  );
}
