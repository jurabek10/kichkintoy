import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { DocumentStatusChip } from '@/components/documents/status-chip';
import { templateTypeKey } from '@/components/documents/labels';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { groupDocuments, useParentDocuments, type DocumentSummary } from '@/data/documents';

const MUTED = '#8A8F99';
const MINT_INK = '#46B06A';

function DocumentRow({ doc }: { doc: DocumentSummary }) {
  const { t } = useTranslation('documents');
  return (
    <Link href={{ pathname: '/documents/[id]', params: { id: doc.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-mint">
          <Ionicons name="document-text" size={20} color={MINT_INK} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
              {doc.requestTitle}
            </Text>
            <DocumentStatusChip status={doc.status} />
          </View>
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {doc.childName} · {t(templateTypeKey(doc.templateType))}
          </Text>
          {doc.status === 'needs_correction' && doc.correctionNote ? (
            <Text className="mt-1 text-xs font-semibold text-coral-ink" numberOfLines={1}>
              {doc.correctionNote}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </Pressable>
    </Link>
  );
}

export default function DocumentsScreen() {
  const { t } = useTranslation(['nav', 'documents']);
  const { data: docs, isPending } = useParentDocuments();
  const groups = groupDocuments(docs);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.documents', { ns: 'nav' })} back />

      {isPending ? (
        <Loader />
      ) : docs.length === 0 ? (
        <View className="p-4">
          <EmptyState
            icon="document-text-outline"
            title={t('empty.parentTitle', { ns: 'documents' })}
            body={t('empty.parentBody', { ns: 'documents' })}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
          {groups.map((group) => (
            <View key={group.key}>
              <View className="flex-row items-center gap-2 bg-background px-4 pb-2 pt-4">
                <Text className="text-base font-bold text-foreground">
                  {t(`group.${group.key}`, { ns: 'documents' })}
                </Text>
                <View className="rounded-full bg-segment px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-muted">{group.items.length}</Text>
                </View>
              </View>
              <View className="gap-3 px-4">
                {group.items.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
