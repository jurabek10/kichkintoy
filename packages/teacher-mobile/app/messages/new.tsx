import { NewMessageScreen } from '@kichkintoy/mobile-shared/messages';
import { useRouter, type Href } from 'expo-router';
import { orpc } from '@/lib/orpc';
import { uploadMedia } from '@/lib/upload';

export default function NewMessageRoute() {
  const router = useRouter();
  return <NewMessageScreen api={orpc.messages} upload={(params) => uploadMedia({ ...params, purpose: 'message' })} resolvePhoto={(id) => orpc.media.getDownloadUrl({ mediaAssetId: id }).then((result) => result.downloadUrl)} navigation={{ back: router.back, newMessage: () => {}, openThread: (threadId) => router.replace(`/messages/${threadId}` as Href) }} />;
}
