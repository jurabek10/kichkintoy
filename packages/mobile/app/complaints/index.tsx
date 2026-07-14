import { ComplaintsListScreen } from '@kichkintoy/mobile-shared/complaints';
import { useRouter, type Href } from 'expo-router';
import { orpc } from '@/lib/orpc';

export default function ComplaintsRoute() { const router = useRouter(); return <ComplaintsListScreen api={orpc.complaints} role="parent" resolvePhoto={(id) => orpc.media.getDownloadUrl({ mediaAssetId: id }).then((result) => result.downloadUrl)} navigation={{ back: router.back, create: () => router.push('/complaints/new' as Href), open: (id) => router.push(`/complaints/${id}` as Href) }} />; }
