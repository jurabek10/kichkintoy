import { orpc } from "../../orpc";
import type { QueryParams } from "../types";
import {
  asRecord,
  input,
  match,
  stringQuery,
  type ORPCRequest,
} from "./common";

type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export function directorRequest(
  path: string,
  method: string,
  body: unknown,
  query: QueryParams,
): ORPCRequest | null {
  return (
    joinRequest(path, method, body, query) ??
    invitationRequest(path, method, body) ??
    teacherRequest(path, method, body) ??
    classRequest(path, method, body)
  );
}

function joinRequest(
  path: string,
  method: string,
  body: unknown,
  query: QueryParams,
): ORPCRequest | null {
  const list = match(path, /^\/director\/centers\/([^/]+)\/join-requests$/);
  if (list && method === "GET") {
    return orpc.director.joinRequests({
      centerId: list[1],
      status: stringQuery(query.status) as JoinRequestStatus | undefined,
    });
  }

  const approve = match(
    path,
    /^\/director\/centers\/([^/]+)\/join-requests\/([^/]+)\/approve$/,
  );
  if (approve && method === "POST") {
    const payload = asRecord(body);
    return orpc.director.approveJoinRequest({
      centerId: approve[1],
      requestId: approve[2],
      classId:
        typeof payload.classId === "string" ? payload.classId : undefined,
    });
  }

  const reject = match(
    path,
    /^\/director\/centers\/([^/]+)\/join-requests\/([^/]+)\/reject$/,
  );
  if (reject && method === "POST") {
    const payload = asRecord(body);
    return orpc.director.rejectJoinRequest({
      centerId: reject[1],
      requestId: reject[2],
      reason: typeof payload.reason === "string" ? payload.reason : undefined,
    });
  }

  return null;
}

function invitationRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  const invitations = match(
    path,
    /^\/director\/centers\/([^/]+)\/invitations$/,
  );
  if (invitations && method === "GET") {
    return orpc.director.invitations({ centerId: invitations[1] });
  }
  if (invitations && method === "POST") {
    return orpc.director.createInvitation(
      input<typeof orpc.director.createInvitation>({
        centerId: invitations[1],
        ...asRecord(body),
      }),
    );
  }

  const resend = match(
    path,
    /^\/director\/centers\/([^/]+)\/invitations\/([^/]+)\/resend$/,
  );
  if (resend && method === "POST") {
    return orpc.director.resendInvitation({
      centerId: resend[1],
      invitationId: resend[2],
    });
  }

  const invitation = match(
    path,
    /^\/director\/centers\/([^/]+)\/invitations\/([^/]+)$/,
  );
  if (invitation && method === "DELETE") {
    return orpc.director.revokeInvitation({
      centerId: invitation[1],
      invitationId: invitation[2],
    });
  }

  return null;
}

function teacherRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  const teachers = match(path, /^\/director\/centers\/([^/]+)\/teachers$/);
  if (teachers && method === "GET") {
    return orpc.director.teachers({ centerId: teachers[1] });
  }

  const teacher = match(
    path,
    /^\/director\/centers\/([^/]+)\/teachers\/([^/]+)$/,
  );
  if (teacher && method === "PATCH") {
    return orpc.director.updateTeacher({
      centerId: teacher[1],
      userId: teacher[2],
      body: input<typeof orpc.director.updateTeacher>({
        centerId: teacher[1],
        userId: teacher[2],
        body,
      }).body,
    });
  }

  return null;
}

function classRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  const classes = match(path, /^\/director\/centers\/([^/]+)\/classes$/);
  if (classes && method === "GET") {
    return orpc.director.classes({ centerId: classes[1] });
  }
  if (classes && method === "POST") {
    return orpc.director.createClass({
      centerId: classes[1],
      body: input<typeof orpc.director.createClass>({
        centerId: classes[1],
        body,
      }).body,
    });
  }

  return (
    classTeacherRequest(path, method, body) ??
    classStatusRequest(path, method) ??
    classDetailRequest(path, method, body)
  );
}

function classTeacherRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  const classTeachers = match(
    path,
    /^\/director\/centers\/([^/]+)\/classes\/([^/]+)\/teachers$/,
  );
  if (classTeachers && method === "POST") {
    return orpc.director.assignTeacher({
      centerId: classTeachers[1],
      classId: classTeachers[2],
      body: input<typeof orpc.director.assignTeacher>({
        centerId: classTeachers[1],
        classId: classTeachers[2],
        body,
      }).body,
    });
  }

  const classTeacher = match(
    path,
    /^\/director\/centers\/([^/]+)\/classes\/([^/]+)\/teachers\/([^/]+)$/,
  );
  if (classTeacher && method === "DELETE") {
    return orpc.director.unassignTeacher({
      centerId: classTeacher[1],
      classId: classTeacher[2],
      teacherUserId: classTeacher[3],
    });
  }

  return null;
}

function classStatusRequest(path: string, method: string): ORPCRequest | null {
  const archive = match(
    path,
    /^\/director\/centers\/([^/]+)\/classes\/([^/]+)\/archive$/,
  );
  if (archive && method === "POST") {
    return orpc.director.archiveClass({
      centerId: archive[1],
      classId: archive[2],
    });
  }

  const restore = match(
    path,
    /^\/director\/centers\/([^/]+)\/classes\/([^/]+)\/restore$/,
  );
  if (restore && method === "POST") {
    return orpc.director.restoreClass({
      centerId: restore[1],
      classId: restore[2],
    });
  }

  return null;
}

function classDetailRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  const klass = match(path, /^\/director\/centers\/([^/]+)\/classes\/([^/]+)$/);
  if (klass && method === "GET") {
    return orpc.director.class({
      centerId: klass[1],
      classId: klass[2],
    });
  }
  if (klass && method === "PATCH") {
    return orpc.director.updateClass({
      centerId: klass[1],
      classId: klass[2],
      body: input<typeof orpc.director.updateClass>({
        centerId: klass[1],
        classId: klass[2],
        body,
      }).body,
    });
  }

  return null;
}
