import { ComplaintDetailScreen } from '@kichkintoy/mobile-shared/complaints';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

export default function ComplaintRoute() { const { complaintId } = useLocalSearchParams<{ complaintId: string }>(); const router = useRouter(); const { session } = useAuth(); return <ComplaintDetailScreen api={orpc.complaints} complaintId={complaintId} role="teacher" currentUserId={session?.user.id ?? ''} navigation={{ back: router.back, create: () => {}, open: (id) => router.replace(`/complaints/${id}` as Href) }} />; }
