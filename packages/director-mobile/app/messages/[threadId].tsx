import { ConversationScreen } from '@kichkintoy/mobile-shared/messages';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

export default function ConversationRoute() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  return <ConversationScreen api={orpc.messages} resolvePhoto={(id) => orpc.media.getDownloadUrl({ mediaAssetId: id }).then((result) => result.downloadUrl)} threadId={threadId} currentUserId={session?.user.id ?? ''} navigation={{ back: router.back, newMessage: () => router.push('/messages/new' as Href), openThread: () => {} }} />;
}
