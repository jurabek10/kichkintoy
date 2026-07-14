import { createAccess } from "../orpc/access";
import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";

export function createMessagesRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    contacts: os.messages.contacts.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.contacts(context.user.id, input?.centerId),
    ),
    threads: os.messages.threads.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.threads(context.user.id, input),
    ),
    thread: os.messages.thread.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.thread(context.user.id, input.threadId, input),
    ),
    startThread: os.messages.startThread.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.startThread(context.user.id, input),
    ),
    send: os.messages.send.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.send(context.user.id, input.threadId, input),
    ),
    markRead: os.messages.markRead.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.markRead(context.user.id, input.threadId),
    ),
    editMessage: os.messages.editMessage.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.editMessage(context.user.id, input.messageId, input.body),
    ),
    deleteMessage: os.messages.deleteMessage.use(access.authed).handler(({ input, context }) =>
      deps.messagesService.deleteMessage(context.user.id, input.messageId),
    ),
    unreadCount: os.messages.unreadCount.use(access.authed).handler(({ context }) =>
      deps.messagesService.unreadCount(context.user.id),
    ),
  };
}
