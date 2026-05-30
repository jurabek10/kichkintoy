import { orpc } from "../../orpc";
import type { QueryParams } from "../types";
import { input, match, stringQuery, type ORPCRequest } from "./common";

export function reportRequest(
  path: string,
  method: string,
  body: unknown,
  query: QueryParams,
): ORPCRequest | null {
  if (path === "/teacher/reports" && method === "GET") {
    return orpc.reports.teacherList({
      reportDate: stringQuery(query.reportDate),
    });
  }
  if (path === "/teacher/reports" && method === "POST") {
    return orpc.reports.create(input<typeof orpc.reports.create>(body));
  }

  return (
    teacherReportRequest(path, method, body) ??
    classReportRequest(path, method, body, query) ??
    parentReportRequest(path, method, body)
  );
}

function teacherReportRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  const publish = match(path, /^\/teacher\/reports\/([^/]+)\/publish$/);
  if (publish && method === "POST") {
    return orpc.reports.publish({
      reportId: publish[1],
      body: input<typeof orpc.reports.publish>({ reportId: publish[1], body })
        .body,
    });
  }

  const unpublish = match(path, /^\/teacher\/reports\/([^/]+)\/unpublish$/);
  if (unpublish && method === "POST") {
    return orpc.reports.unpublish({ reportId: unpublish[1] });
  }

  const staffComment = match(
    path,
    /^\/teacher\/reports\/([^/]+)\/comments$/,
  );
  if (staffComment && method === "POST") {
    return orpc.reports.staffComment({
      reportId: staffComment[1],
      body: input<typeof orpc.reports.staffComment>({
        reportId: staffComment[1],
        body,
      }).body,
    });
  }

  const reads = match(path, /^\/teacher\/reports\/([^/]+)\/reads$/);
  if (reads && method === "GET") {
    return orpc.reports.reads({ reportId: reads[1] });
  }

  const report = match(path, /^\/teacher\/reports\/([^/]+)$/);
  if (report && method === "GET") {
    return orpc.reports.teacherDetail({ reportId: report[1] });
  }
  if (report && method === "PATCH") {
    return orpc.reports.update({
      reportId: report[1],
      body: input<typeof orpc.reports.update>({
        reportId: report[1],
        body,
      }).body,
    });
  }
  if (report && method === "DELETE") {
    return orpc.reports.delete({ reportId: report[1] });
  }

  return null;
}

function classReportRequest(
  path: string,
  method: string,
  body: unknown,
  query: QueryParams,
): ORPCRequest | null {
  const bulk = match(path, /^\/teacher\/classes\/([^/]+)\/reports\/bulk$/);
  if (bulk && method === "POST") {
    return orpc.reports.bulkCreateDrafts({
      classId: bulk[1],
      body: input<typeof orpc.reports.bulkCreateDrafts>({
        classId: bulk[1],
        body,
      }).body,
    });
  }

  const publishDrafts = match(
    path,
    /^\/teacher\/classes\/([^/]+)\/reports\/publish-drafts$/,
  );
  if (publishDrafts && method === "POST") {
    return orpc.reports.publishDrafts({
      classId: publishDrafts[1],
      body: input<typeof orpc.reports.publishDrafts>({
        classId: publishDrafts[1],
        body,
      }).body,
    });
  }

  const classReports = match(path, /^\/teacher\/classes\/([^/]+)\/reports$/);
  if (classReports && method === "GET") {
    return orpc.reports.classStatuses({
      classId: classReports[1],
      reportDate: stringQuery(query.reportDate),
    });
  }

  return null;
}

function parentReportRequest(
  path: string,
  method: string,
  body: unknown,
): ORPCRequest | null {
  if (path === "/parent/children" && method === "GET") {
    return orpc.reports.parentChildren({});
  }

  const parentReports = match(path, /^\/parent\/children\/([^/]+)\/reports$/);
  if (parentReports && method === "GET") {
    return orpc.reports.parentList({ childId: parentReports[1] });
  }

  const parentComment = match(path, /^\/parent\/reports\/([^/]+)\/comments$/);
  if (parentComment && method === "POST") {
    return orpc.reports.parentComment({
      reportId: parentComment[1],
      body: input<typeof orpc.reports.parentComment>({
        reportId: parentComment[1],
        body,
      }).body,
    });
  }

  const parentReport = match(path, /^\/parent\/reports\/([^/]+)$/);
  if (parentReport && method === "GET") {
    return orpc.reports.parentDetail({ reportId: parentReport[1] });
  }

  const deleteComment = match(path, /^\/reports\/([^/]+)\/comments\/([^/]+)$/);
  if (deleteComment && method === "DELETE") {
    return orpc.reports.deleteComment({
      reportId: deleteComment[1],
      commentId: deleteComment[2],
    });
  }

  return null;
}
