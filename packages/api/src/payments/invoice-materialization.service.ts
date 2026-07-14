import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { TashkentMonth } from "../common/tashkent-month";

export type ParentEnrollmentForInvoice = {
  childId: string;
  childName: string;
  photoUrl: string | null;
  centerId: string;
  centerName: string;
  className: string | null;
  monthlyTuitionUzs: Prisma.Decimal;
  parentUserId: string;
};

export type InvoiceWithPayments = Prisma.InvoiceGetPayload<{
  include: { payments: true };
}>;

@Injectable()
export class InvoiceMaterializationService {
  constructor(private readonly prisma: PrismaService) {}

  async primaryGuardianEnrollments(
    userId?: string,
  ): Promise<ParentEnrollmentForInvoice[]> {
    const guardians = await this.prisma.childGuardian.findMany({
      where: {
        ...(userId ? { userId } : {}),
        isPrimary: true,
        child: { status: "active" },
      },
      include: {
        child: {
          include: {
            childEnrollments: {
              where: { enrollmentStatus: "active" },
              include: {
                center: {
                  select: { id: true, name: true, monthlyTuitionUzs: true },
                },
                class: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const seen = new Set<string>();
    const enrollments: ParentEnrollmentForInvoice[] = [];
    for (const guardian of guardians) {
      for (const enrollment of guardian.child.childEnrollments) {
        const key = `${guardian.userId}:${guardian.childId}:${enrollment.centerId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        enrollments.push({
          childId: guardian.childId,
          childName: [guardian.child.firstName, guardian.child.lastName]
            .filter(Boolean)
            .join(" "),
          photoUrl: guardian.child.photoUrl,
          centerId: enrollment.centerId,
          centerName: enrollment.center.name,
          className: enrollment.class?.name ?? null,
          monthlyTuitionUzs: enrollment.center.monthlyTuitionUzs,
          parentUserId: guardian.userId,
        });
      }
    }
    return enrollments;
  }

  async ensureMonthInvoice(
    enrollment: ParentEnrollmentForInvoice,
    month: TashkentMonth,
  ): Promise<InvoiceWithPayments> {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        childId: enrollment.childId,
        centerId: enrollment.centerId,
        periodStart: month.periodStartDate,
      },
      include: { payments: true },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;

    return this.prisma.invoice.create({
      data: {
        centerId: enrollment.centerId,
        childId: enrollment.childId,
        parentUserId: enrollment.parentUserId,
        amount: enrollment.monthlyTuitionUzs,
        currency: "UZS",
        periodStart: month.periodStartDate,
        periodEnd: month.periodEndDate,
        dueDate: month.periodEndDate,
        status: "issued",
      },
      include: { payments: true },
    });
  }
}
