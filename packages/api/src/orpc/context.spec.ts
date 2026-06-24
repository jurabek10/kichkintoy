import { describe, it, expect, vi } from "vitest";
import { HttpStatus } from "@nestjs/common";
import type { Request } from "express";
import type { AppErrorCode } from "@kichkintoy/shared";
import { requireUser, requireCenterAccess } from "./context";
import { AppException } from "../common/app-exception";

/** Asserts the promise rejects with an AppException carrying the given code. */
async function expectAppError(
  promise: Promise<unknown>,
  code: AppErrorCode,
  status: HttpStatus,
) {
  await expect(promise).rejects.toBeInstanceOf(AppException);
  await promise.catch((error: unknown) => {
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe(code);
    expect((error as AppException).getStatus()).toBe(status);
  });
}

/**
 * Safety-net tests for the authorization seam. These pin the *enforcement*
 * behaviour of requireUser / requireCenterAccess so the declarative-access
 * refactor (and any future change) can't silently weaken who may call what —
 * the highest-risk logic in a product holding children's data.
 */

function fakeReq(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
    ip: "127.0.0.1",
  } as unknown as Request;
}

const validSession = {
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  user: {
    id: "user-1",
    fullName: "Test Parent",
    username: "parent1",
    phone: "+998900000000",
    userRoles: [
      { role: { name: "parent" }, organizationId: null, centerId: null, branchId: null },
    ],
  },
};

const authedUser = {
  id: "user-1",
  fullName: "Test Parent",
  username: "parent1",
  phoneNumber: "+998900000000",
  roles: [{ name: "parent", organizationId: null, centerId: null, branchId: null }],
};

describe("requireUser", () => {
  it("rejects a request with no bearer token", async () => {
    const prisma = { authSession: { findUnique: vi.fn() } } as any;
    await expectAppError(
      requireUser(prisma, fakeReq()),
      "AUTH_REQUIRED",
      HttpStatus.UNAUTHORIZED,
    );
    expect(prisma.authSession.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when the session is not found", async () => {
    const prisma = { authSession: { findUnique: vi.fn().mockResolvedValue(null) } } as any;
    await expectAppError(
      requireUser(prisma, fakeReq("Bearer abc")),
      "SESSION_EXPIRED",
      HttpStatus.UNAUTHORIZED,
    );
  });

  it("rejects an expired session", async () => {
    const prisma = {
      authSession: {
        findUnique: vi.fn().mockResolvedValue({
          ...validSession,
          expiresAt: new Date(Date.now() - 1000),
        }),
      },
    } as any;
    await expectAppError(
      requireUser(prisma, fakeReq("Bearer abc")),
      "SESSION_EXPIRED",
      HttpStatus.UNAUTHORIZED,
    );
  });

  it("rejects a revoked session", async () => {
    const prisma = {
      authSession: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ ...validSession, revokedAt: new Date() }),
      },
    } as any;
    await expectAppError(
      requireUser(prisma, fakeReq("Bearer abc")),
      "SESSION_EXPIRED",
      HttpStatus.UNAUTHORIZED,
    );
  });

  it("resolves a valid session and caches the user on the request", async () => {
    const prisma = {
      authSession: { findUnique: vi.fn().mockResolvedValue(validSession) },
    } as any;
    const req = fakeReq("Bearer abc");
    const user = await requireUser(prisma, req);
    expect(user).toMatchObject({ id: "user-1", roles: [{ name: "parent" }] });
    // second call uses the cache, not the DB
    const again = await requireUser(prisma, req);
    expect(again).toBe(user);
    expect(prisma.authSession.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("requireCenterAccess", () => {
  function prismaWith({
    center,
    director,
    approver,
    teacher,
  }: {
    center: unknown;
    director?: unknown;
    approver?: unknown;
    teacher?: unknown;
  }) {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(director ?? null) // director / org-owner lookup
      .mockResolvedValueOnce(approver ?? null) // approver-teacher lookup
      .mockResolvedValueOnce(teacher ?? null); // any-teacher lookup (allowAnyTeacher)
    return {
      center: { findUnique: vi.fn().mockResolvedValue(center) },
      userRole: { findFirst },
    } as any;
  }

  function authedReq(): Request {
    const req = fakeReq("Bearer abc");
    (req as any).user = authedUser;
    return req;
  }

  it("throws when the center does not exist", async () => {
    const prisma = prismaWith({ center: null });
    await expectAppError(
      requireCenterAccess(prisma, authedReq(), "center-1"),
      "CENTER_NOT_FOUND",
      HttpStatus.NOT_FOUND,
    );
  });

  it("grants 'director' when a director role matches", async () => {
    const prisma = prismaWith({
      center: { id: "center-1", organizationId: "org-1" },
      director: { id: "role-1" },
    });
    await expect(
      requireCenterAccess(prisma, authedReq(), "center-1"),
    ).resolves.toBe("director");
  });

  it("rejects a non-director when directorOnly is set", async () => {
    const prisma = prismaWith({
      center: { id: "center-1", organizationId: "org-1" },
      director: null,
      approver: { id: "role-2" },
    });
    await expectAppError(
      requireCenterAccess(prisma, authedReq(), "center-1", {
        directorOnly: true,
      }),
      "DIRECTOR_ACCESS_REQUIRED",
      HttpStatus.FORBIDDEN,
    );
  });

  it("grants 'approver_teacher' to an approver teacher when not directorOnly", async () => {
    const prisma = prismaWith({
      center: { id: "center-1", organizationId: "org-1" },
      director: null,
      approver: { id: "role-2" },
    });
    await expect(
      requireCenterAccess(prisma, authedReq(), "center-1"),
    ).resolves.toBe("approver_teacher");
  });

  it("throws NO_APPROVER_ACCESS when a plain teacher tries to act", async () => {
    const prisma = prismaWith({
      center: { id: "center-1", organizationId: "org-1" },
      director: null,
      approver: null,
    });
    await expectAppError(
      requireCenterAccess(prisma, authedReq(), "center-1"),
      "NO_APPROVER_ACCESS",
      HttpStatus.FORBIDDEN,
    );
  });

  it("grants 'center_teacher' to any teacher when allowAnyTeacher is set", async () => {
    const prisma = prismaWith({
      center: { id: "center-1", organizationId: "org-1" },
      director: null,
      approver: null,
      teacher: { id: "role-3" },
    });
    await expect(
      requireCenterAccess(prisma, authedReq(), "center-1", {
        allowAnyTeacher: true,
      }),
    ).resolves.toBe("center_teacher");
  });

  it("throws CENTER_ACCESS_REQUIRED when a non-teacher reads with allowAnyTeacher", async () => {
    const prisma = prismaWith({
      center: { id: "center-1", organizationId: "org-1" },
      director: null,
      approver: null,
      teacher: null,
    });
    await expectAppError(
      requireCenterAccess(prisma, authedReq(), "center-1", {
        allowAnyTeacher: true,
      }),
      "CENTER_ACCESS_REQUIRED",
      HttpStatus.FORBIDDEN,
    );
  });
});
