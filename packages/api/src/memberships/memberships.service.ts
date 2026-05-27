import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

type Tx = Prisma.TransactionClient;

export type ParentChildInfo = {
  name: string;
  dateOfBirth: Date;
  gender: "boy" | "girl" | "prefer_not_to_say";
  imageUrl?: string;
  relationshipType: string;
  customRelationshipLabel?: string;
};

const ROLE_PARENT = "parent" as const;
const ROLE_TEACHER = "teacher" as const;
const ROLE_DIRECTOR = "director" as const;
const ROLE_ORGANIZATION_OWNER = "organization_owner" as const;

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async activateParent(
    tx: Tx,
    args: {
      userId: string;
      centerId: string;
      classId?: string | null;
      child: ParentChildInfo;
    },
  ) {
    const center = await this.requireCenter(tx, args.centerId);

    if (args.classId) {
      await this.requireClassAtCenter(tx, args.centerId, args.classId);
    }

    const relationship =
      args.child.relationshipType === "other"
        ? args.child.customRelationshipLabel?.trim() || "other"
        : args.child.relationshipType;

    const child = await tx.child.create({
      data: {
        firstName: args.child.name.trim(),
        dob: args.child.dateOfBirth,
        gender: args.child.gender,
        photoUrl: args.child.imageUrl ?? null,
      },
    });

    await tx.childGuardian.create({
      data: {
        childId: child.id,
        userId: args.userId,
        relationship,
        nicknameForChild: args.child.customRelationshipLabel?.trim() || null,
        isPrimary: true,
        canPickup: true,
        canMessage: true,
      },
    });

    await tx.childEnrollment.create({
      data: {
        childId: child.id,
        centerId: center.id,
        classId: args.classId ?? null,
        enrollmentStatus: "active",
        startedAt: new Date(),
      },
    });

    await this.ensureRole(tx, {
      userId: args.userId,
      roleName: ROLE_PARENT,
      organizationId: center.organizationId,
      centerId: center.id,
    });

    return { center, child };
  }

  async activateTeacher(
    tx: Tx,
    args: {
      userId: string;
      centerId: string;
      classId?: string | null;
      canApproveMembers?: boolean;
    },
  ) {
    const center = await this.requireCenter(tx, args.centerId);

    if (args.classId) {
      await this.requireClassAtCenter(tx, args.centerId, args.classId);
    }

    await this.ensureRole(tx, {
      userId: args.userId,
      roleName: ROLE_TEACHER,
      organizationId: center.organizationId,
      centerId: center.id,
      canApproveMembers: args.canApproveMembers ?? false,
    });

    if (args.classId) {
      await this.ensureTeacherClassAssignment(tx, {
        teacherUserId: args.userId,
        classId: args.classId,
      });
    }

    return { center };
  }

  async activateDirector(
    tx: Tx,
    args: {
      userId: string;
      centerId: string;
    },
  ) {
    const center = await this.requireCenter(tx, args.centerId);

    await this.ensureRole(tx, {
      userId: args.userId,
      roleName: ROLE_DIRECTOR,
      organizationId: center.organizationId,
      centerId: center.id,
    });

    return { center };
  }

  async ensureRole(
    tx: Tx,
    args: {
      userId: string;
      roleName: string;
      organizationId: string | null;
      centerId: string | null;
      canApproveMembers?: boolean;
    },
  ) {
    const role = await tx.role.upsert({
      where: { name: args.roleName },
      update: {},
      create: { name: args.roleName },
    });

    const existing = await tx.userRole.findFirst({
      where: {
        userId: args.userId,
        roleId: role.id,
        organizationId: args.organizationId ?? null,
        centerId: args.centerId ?? null,
      },
    });

    if (existing) {
      if (
        args.canApproveMembers !== undefined &&
        existing.canApproveMembers !== args.canApproveMembers
      ) {
        return tx.userRole.update({
          where: { id: existing.id },
          data: { canApproveMembers: args.canApproveMembers },
        });
      }
      return existing;
    }

    return tx.userRole.create({
      data: {
        userId: args.userId,
        roleId: role.id,
        organizationId: args.organizationId,
        centerId: args.centerId,
        canApproveMembers: args.canApproveMembers ?? false,
      },
    });
  }

  private async ensureTeacherClassAssignment(
    tx: Tx,
    args: { teacherUserId: string; classId: string },
  ) {
    const existing = await tx.teacherClassAssignment.findFirst({
      where: {
        teacherUserId: args.teacherUserId,
        classId: args.classId,
        endedAt: null,
      },
    });

    if (existing) {
      return existing;
    }

    return tx.teacherClassAssignment.create({
      data: {
        teacherUserId: args.teacherUserId,
        classId: args.classId,
        assignmentRole: "teacher",
        startedAt: new Date(),
      },
    });
  }

  private async requireCenter(tx: Tx, centerId: string) {
    const center = await tx.center.findUnique({ where: { id: centerId } });
    if (!center) {
      throw new BadRequestException("Center not found.");
    }
    return center;
  }

  private async requireClassAtCenter(
    tx: Tx,
    centerId: string,
    classId: string,
  ) {
    const klass = await tx.class.findUnique({ where: { id: classId } });
    if (!klass || klass.centerId !== centerId) {
      throw new BadRequestException(
        "Selected class does not belong to this center.",
      );
    }
    if (klass.status !== "active") {
      throw new BadRequestException("Selected class is not active.");
    }
    return klass;
  }
}
