import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import type {
  AssignTeacherInput,
  CreateClassInput,
  UpdateClassInput,
} from "./class.schemas";

@Injectable()
export class ClassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listClasses(centerId: string) {
    const classes = await this.prisma.class.findMany({
      where: { centerId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            childEnrollments: { where: { enrollmentStatus: "active" } },
          },
        },
        teacherClassAssignments: {
          where: { endedAt: null },
          include: {
            teacherUser: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    return classes.map((klass) => this.toClassListItem(klass));
  }

  async getClass(centerId: string, classId: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: {
          select: {
            childEnrollments: { where: { enrollmentStatus: "active" } },
          },
        },
        teacherClassAssignments: {
          where: { endedAt: null },
          include: {
            teacherUser: { select: { id: true, fullName: true } },
          },
        },
        childEnrollments: {
          where: { enrollmentStatus: "active" },
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                dob: true,
                gender: true,
              },
            },
          },
          orderBy: { startedAt: "asc" },
        },
      },
    });

    if (!klass || klass.centerId !== centerId) {
      throw new NotFoundException("Class not found.");
    }

    return {
      ...this.toClassListItem(klass),
      children: klass.childEnrollments.map((enrollment) => ({
        childId: enrollment.child.id,
        name: [enrollment.child.firstName, enrollment.child.lastName]
          .filter(Boolean)
          .join(" "),
        photoUrl: enrollment.child.photoUrl,
        dateOfBirth: enrollment.child.dob.toISOString().slice(0, 10),
        gender: enrollment.child.gender,
      })),
    };
  }

  async createClass(args: {
    centerId: string;
    actorUserId: string;
    input: CreateClassInput;
  }) {
    const center = await this.requireCenter(args.centerId);

    const klass = await this.prisma.class.create({
      data: {
        centerId: center.id,
        name: args.input.name.trim(),
        ageGroup: args.input.ageGroup?.trim() || null,
        academicYear: args.input.academicYear?.trim() || null,
        status: "active",
      },
    });

    await this.audit.log({
      organizationId: center.organizationId,
      centerId: center.id,
      actorUserId: args.actorUserId,
      action: "class.created",
      entityType: "class",
      entityId: klass.id,
      metadata: { name: klass.name },
    });

    return this.getClass(args.centerId, klass.id);
  }

  async updateClass(args: {
    centerId: string;
    classId: string;
    actorUserId: string;
    input: UpdateClassInput;
  }) {
    const klass = await this.requireClass(args.centerId, args.classId);

    const data: Prisma.ClassUpdateInput = {};
    if (args.input.name !== undefined) data.name = args.input.name.trim();
    if (args.input.ageGroup !== undefined)
      data.ageGroup = args.input.ageGroup?.trim() || null;
    if (args.input.academicYear !== undefined)
      data.academicYear = args.input.academicYear?.trim() || null;

    await this.prisma.class.update({ where: { id: klass.id }, data });

    await this.audit.log({
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "class.updated",
      entityType: "class",
      entityId: klass.id,
    });

    return this.getClass(args.centerId, klass.id);
  }

  async archiveClass(args: {
    centerId: string;
    classId: string;
    actorUserId: string;
  }) {
    const klass = await this.requireClass(args.centerId, args.classId);

    const activeEnrollments = await this.prisma.childEnrollment.count({
      where: { classId: klass.id, enrollmentStatus: "active" },
    });

    if (activeEnrollments > 0) {
      throw new BadRequestException(
        "Move or unenroll the children in this class before archiving it.",
      );
    }

    await this.prisma.class.update({
      where: { id: klass.id },
      data: { status: "archived" },
    });

    await this.audit.log({
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "class.archived",
      entityType: "class",
      entityId: klass.id,
    });

    return this.getClass(args.centerId, klass.id);
  }

  async restoreClass(args: {
    centerId: string;
    classId: string;
    actorUserId: string;
  }) {
    const klass = await this.requireClass(args.centerId, args.classId);

    await this.prisma.class.update({
      where: { id: klass.id },
      data: { status: "active" },
    });

    await this.audit.log({
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "class.restored",
      entityType: "class",
      entityId: klass.id,
    });

    return this.getClass(args.centerId, klass.id);
  }

  // --- Teachers ---

  async listTeachers(centerId: string) {
    const teacherRoles = await this.prisma.userRole.findMany({
      where: { centerId, role: { name: "teacher" } },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            username: true,
          },
        },
      },
    });

    const teacherUserIds = teacherRoles.map((role) => role.userId);

    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherUserId: { in: teacherUserIds },
        endedAt: null,
        class: { centerId },
      },
      include: { class: { select: { id: true, name: true } } },
    });

    const assignmentsByUser = new Map<
      string,
      Array<{ classId: string; className: string; assignmentRole: string }>
    >();
    for (const assignment of assignments) {
      const list = assignmentsByUser.get(assignment.teacherUserId) ?? [];
      list.push({
        classId: assignment.class.id,
        className: assignment.class.name,
        assignmentRole: assignment.assignmentRole,
      });
      assignmentsByUser.set(assignment.teacherUserId, list);
    }

    return teacherRoles.map((role) => ({
      userId: role.user.id,
      fullName: role.user.fullName,
      phoneNumber: role.user.phone,
      username: role.user.username,
      canApproveMembers: role.canApproveMembers,
      assignments: assignmentsByUser.get(role.userId) ?? [],
    }));
  }

  async assignTeacher(args: {
    centerId: string;
    classId: string;
    actorUserId: string;
    input: AssignTeacherInput;
  }) {
    const klass = await this.requireClass(args.centerId, args.classId);

    const teacherRole = await this.prisma.userRole.findFirst({
      where: {
        userId: args.input.teacherUserId,
        centerId: args.centerId,
        role: { name: "teacher" },
      },
    });

    if (!teacherRole) {
      throw new BadRequestException("Teacher not found at this center.");
    }

    const existing = await this.prisma.teacherClassAssignment.findFirst({
      where: {
        teacherUserId: args.input.teacherUserId,
        classId: klass.id,
        endedAt: null,
      },
    });

    if (existing) {
      return { id: existing.id, alreadyAssigned: true };
    }

    const assignment = await this.prisma.teacherClassAssignment.create({
      data: {
        teacherUserId: args.input.teacherUserId,
        classId: klass.id,
        assignmentRole: args.input.assignmentRole,
        startedAt: new Date(),
      },
    });

    await this.audit.log({
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "teacher.assigned_to_class",
      entityType: "teacher_class_assignment",
      entityId: assignment.id,
      metadata: { classId: klass.id, teacherUserId: args.input.teacherUserId },
    });

    return { id: assignment.id, alreadyAssigned: false };
  }

  async unassignTeacher(args: {
    centerId: string;
    classId: string;
    teacherUserId: string;
    actorUserId: string;
  }) {
    const klass = await this.requireClass(args.centerId, args.classId);

    const assignment = await this.prisma.teacherClassAssignment.findFirst({
      where: {
        teacherUserId: args.teacherUserId,
        classId: klass.id,
        endedAt: null,
      },
    });

    if (!assignment) {
      throw new NotFoundException("Active assignment not found.");
    }

    await this.prisma.teacherClassAssignment.update({
      where: { id: assignment.id },
      data: { endedAt: new Date() },
    });

    await this.audit.log({
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "teacher.unassigned_from_class",
      entityType: "teacher_class_assignment",
      entityId: assignment.id,
      metadata: { classId: klass.id, teacherUserId: args.teacherUserId },
    });

    return { success: true as const };
  }

  // --- Helpers ---

  private toClassListItem(klass: {
    id: string;
    name: string;
    ageGroup: string | null;
    academicYear: string | null;
    status: string;
    _count: { childEnrollments: number };
    teacherClassAssignments: Array<{
      assignmentRole: string;
      teacherUser: { id: string; fullName: string };
    }>;
  }) {
    return {
      id: klass.id,
      name: klass.name,
      ageGroup: klass.ageGroup,
      academicYear: klass.academicYear,
      status: klass.status,
      childCount: klass._count.childEnrollments,
      teacherCount: klass.teacherClassAssignments.length,
      teachers: klass.teacherClassAssignments.map((assignment) => ({
        userId: assignment.teacherUser.id,
        fullName: assignment.teacherUser.fullName,
        assignmentRole: assignment.assignmentRole,
      })),
    };
  }

  private async requireCenter(centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });
    if (!center) {
      throw new NotFoundException("Center not found.");
    }
    return center;
  }

  private async requireClass(centerId: string, classId: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!klass || klass.centerId !== centerId) {
      throw new NotFoundException("Class not found.");
    }
    return klass;
  }
}
