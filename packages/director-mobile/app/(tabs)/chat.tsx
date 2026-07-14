import {
  MobileAssistantScreen,
  type MobileAssistantClient,
} from "@kichkintoy/mobile-shared/assistant";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/config";
import { orpc } from "@/lib/orpc";

const client: MobileAssistantClient = {
  listThreads: () => orpc.chat.listThreads({}),
  createThread: () => orpc.chat.createThread({}),
  getThread: (threadId) => orpc.chat.getThread({ threadId }),
  renameThread: (threadId, title) =>
    orpc.chat.renameThread({ threadId, title }),
  deleteThread: (threadId) => orpc.chat.deleteThread({ threadId }),
};

export default function DirectorAssistantScreen() {
  const { session } = useAuth();
  const { i18n } = useTranslation();
  return (
    <MobileAssistantScreen
      role="director"
      client={client}
      apiBaseUrl={apiBaseUrl}
      authToken={session?.token ?? null}
      language={i18n.language}
    />
  );
}
