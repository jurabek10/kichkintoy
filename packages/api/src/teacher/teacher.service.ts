import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async listClasses(teacherUserId: string) {
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: { teacherUserId, endedAt: null, class: { status: "active" } },
      include: {
        class: {
          include: {
            _count: {
              select: {
                childEnrollments: { where: { enrollmentStatus: "active" } },
              },
            },
          },
        },
      },
      orderBy: { class: { name: "asc" } },
    });

    return assignments.map((assignment) => ({
      id: assignment.class.id,
      name: assignment.class.name,
      ageGroup: assignment.class.ageGroup,
      academicYear: assignment.class.academicYear,
      assignmentRole: assignment.assignmentRole,
      childCount: assignment.class._count.childEnrollments,
    }));
  }

  async listClassChildren(teacherUserId: string, classId: string) {
    await this.requireActiveAssignment(teacherUserId, classId);

    const enrollments = await this.prisma.childEnrollment.findMany({
      where: { classId, enrollmentStatus: "active" },
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
    });

    return enrollments.map((enrollment) => ({
      childId: enrollment.child.id,
      name: [enrollment.child.firstName, enrollment.child.lastName]
        .filter(Boolean)
        .join(" "),
      photoUrl: enrollment.child.photoUrl,
      dateOfBirth: enrollment.child.dob.toISOString().slice(0, 10),
      joinedAt: enrollment.startedAt.toISOString().slice(0, 10),
      gender: normalizeChildGender(enrollment.child.gender),
    }));
  }

  private async requireActiveAssignment(
    teacherUserId: string,
    classId: string,
  ) {
    const assignment = await this.prisma.teacherClassAssignment.findFirst({
      where: { teacherUserId, classId, endedAt: null },
    });

    if (!assignment) {
      throw new ForbiddenException("You are not assigned to this class.");
    }

    return assignment;
  }
}

function normalizeChildGender(gender: string | null) {
  if (!gender) return null;
  if (gender === "boy" || gender === "girl" || gender === "prefer_not_to_say") {
    return gender;
  }
  if (gender === "male") return "boy";
  if (gender === "female") return "girl";
  return "prefer_not_to_say";
}
