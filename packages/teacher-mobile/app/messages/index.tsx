import { MessagesListScreen } from '@kichkintoy/mobile-shared/messages';
import { useRouter, type Href } from 'expo-router';
import { orpc } from '@/lib/orpc';

export default function MessagesRoute() {
  const router = useRouter();
  return <MessagesListScreen api={orpc.messages} resolvePhoto={(id) => orpc.media.getDownloadUrl({ mediaAssetId: id }).then((result) => result.downloadUrl)} navigation={{ back: router.back, newMessage: () => router.push('/messages/new' as Href), openThread: (threadId) => router.push(`/messages/${threadId}` as Href) }} />;
}
