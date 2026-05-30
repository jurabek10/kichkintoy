import { orpc } from "../../orpc";
import { input, match, type ORPCRequest } from "./common";

export function authRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  if (path === "/auth/send-code" && method === "POST") {
    return orpc.auth.sendCode(input<typeof orpc.auth.sendCode>(body));
  }
  if (path === "/auth/verify-code" && method === "POST") {
    return orpc.auth.verifyCode(input<typeof orpc.auth.verifyCode>(body));
  }
  if (path === "/auth/register" && method === "POST") {
    return orpc.auth.register(input<typeof orpc.auth.register>(body));
  }
  if (path === "/auth/login" && method === "POST") {
    return orpc.auth.login(input<typeof orpc.auth.login>(body));
  }
  if (path === "/auth/logout" && method === "POST") {
    return orpc.auth.logout(input<typeof orpc.auth.logout>(body ?? {}));
  }
  if (path === "/auth/invitations/lookup" && method === "POST") {
    return orpc.auth.lookupInvitations(
      input<typeof orpc.auth.lookupInvitations>(body),
    );
  }
  if (path === "/auth/me/invitations" && method === "GET") {
    return orpc.auth.myInvitations({});
  }
  if (path === "/auth/me/join-requests" && method === "POST") {
    return orpc.auth.submitJoinRequest(
      input<typeof orpc.auth.submitJoinRequest>(body),
    );
  }

  const accept = match(path, /^\/auth\/me\/invitations\/([^/]+)\/accept$/);
  if (accept && method === "POST") {
    return orpc.auth.acceptInvitation({
      id: accept[1],
      body: body ?? {},
    });
  }

  const decline = match(path, /^\/auth\/me\/invitations\/([^/]+)\/decline$/);
  if (decline && method === "POST") {
    return orpc.auth.declineInvitation({ id: decline[1] });
  }

  const cancel = match(path, /^\/auth\/me\/join-requests\/([^/]+)$/);
  if (cancel && method === "DELETE") {
    return orpc.auth.cancelJoinRequest({ id: cancel[1] });
  }

  return null;
}
