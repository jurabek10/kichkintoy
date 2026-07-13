import { ComplaintDetailScreen } from '@kichkintoy/mobile-shared/complaints';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

export default function ComplaintRoute() { const { complaintId } = useLocalSearchParams<{ complaintId: string }>(); const router = useRouter(); const { session } = useAuth(); return <ComplaintDetailScreen api={orpc.complaints} complaintId={complaintId} role="parent" currentUserId={session?.user.id ?? ''} resolvePhoto={(id) => orpc.media.getDownloadUrl({ mediaAssetId: id }).then((result) => result.downloadUrl)} navigation={{ back: router.back, create: () => router.push('/complaints/new' as Href), open: (id) => router.replace(`/complaints/${id}` as Href) }} />; }
