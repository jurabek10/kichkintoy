import { ComplaintsListScreen } from '@kichkintoy/mobile-shared/complaints';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

export default function ComplaintsRoute() { const router = useRouter(); const { session } = useAuth(); return <ComplaintsListScreen api={orpc.complaints} role="teacher" centerId={session?.membership.centerId} navigation={{ back: router.back, create: () => {}, open: (id) => router.push(`/complaints/${id}` as Href) }} />; }
