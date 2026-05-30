import { orpc } from "../../orpc";
import type { QueryParams } from "../types";
import {
  input,
  match,
  queryWithoutEmptyValues,
  type ORPCRequest,
} from "./common";

export function catalogRequest(
  path: string,
  method: string,
  query: QueryParams,
): ORPCRequest | null {
  if (path === "/geo/regions" && method === "GET") {
    return orpc.geo.regions({});
  }

  const districts = match(path, /^\/geo\/regions\/([^/]+)\/districts$/);
  if (districts && method === "GET") {
    return orpc.geo.districts({ regionId: districts[1] });
  }

  if (path === "/centers/search" && method === "GET") {
    return orpc.centers.search(
      input<typeof orpc.centers.search>(queryWithoutEmptyValues(query)),
    );
  }

  if (path === "/centers/by-code" && method === "GET") {
    return orpc.centers.byCode({ code: String(query.code ?? "") });
  }

  const centerClasses = match(path, /^\/centers\/([^/]+)\/classes$/);
  if (centerClasses && method === "GET") {
    return orpc.centers.classes({ centerId: centerClasses[1] });
  }

  return null;
}

export function teacherRequest(path: string, method: string): ORPCRequest | null {
  if (path === "/teacher/classes" && method === "GET") {
    return orpc.teacher.classes({});
  }

  const children = match(path, /^\/teacher\/classes\/([^/]+)\/children$/);
  if (children && method === "GET") {
    return orpc.teacher.classChildren({ classId: children[1] });
  }

  return null;
}
