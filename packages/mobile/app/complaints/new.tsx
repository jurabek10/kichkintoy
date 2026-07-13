import { ComplaintComposerScreen } from '@kichkintoy/mobile-shared/complaints';
import { useRouter, type Href } from 'expo-router';
import { orpc } from '@/lib/orpc';

export default function NewComplaintRoute() { const router = useRouter(); return <ComplaintComposerScreen api={orpc.complaints} listChildren={() => orpc.profile.listChildren({})} navigation={{ back: router.back, create: () => {}, open: (id) => router.replace(`/complaints/${id}` as Href) }} />; }
