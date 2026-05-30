import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  bulkDailyReportRequestSchema,
  createDailyReportRequestSchema,
  dailyReportCommentRequestSchema,
  publishDailyReportRequestSchema,
  updateDailyReportRequestSchema,
} from "@kichkintoy/shared";
import { ZodError, type ZodSchema } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  SessionGuard,
  type AuthenticatedUser,
} from "../auth/session.guard";
import { ReportsService } from "./reports.service";

@Controller()
@UseGuards(SessionGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("teacher/reports")
  listTeacherReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query("reportDate") reportDate?: string,
  ) {
    return this.reports.listTeacherReports(user.id, reportDate);
  }

  @Post("teacher/reports")
  createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.reports.createReport(
      user.id,
      parseInput(createDailyReportRequestSchema, body ?? {}),
    );
  }

  @Get("teacher/reports/:reportId")
  getTeacherReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
  ) {
    return this.reports.getReportForStaff(user.id, reportId);
  }

  @Patch("teacher/reports/:reportId")
  updateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
    @Body() body: unknown,
  ) {
    return this.reports.updateReport(
      user.id,
      reportId,
      parseInput(updateDailyReportRequestSchema, body ?? {}),
    );
  }

  @Post("teacher/reports/:reportId/publish")
  publishReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
    @Body() body: unknown,
  ) {
    return this.reports.publishReport(
      user.id,
      reportId,
      parseInput(publishDailyReportRequestSchema, body ?? {}),
    );
  }

  @Post("teacher/reports/:reportId/unpublish")
  unpublishReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
  ) {
    return this.reports.unpublishReport(user.id, reportId);
  }

  @Delete("teacher/reports/:reportId")
  deleteReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
  ) {
    return this.reports.deleteReport(user.id, reportId);
  }

  @Post("teacher/classes/:classId/reports/bulk")
  bulkCreateDrafts(
    @CurrentUser() user: AuthenticatedUser,
    @Param("classId", new ParseUUIDPipe()) classId: string,
    @Body() body: unknown,
  ) {
    return this.reports.bulkCreateDrafts(
      user.id,
      classId,
      parseInput(bulkDailyReportRequestSchema, body ?? {}),
    );
  }

  @Post("teacher/classes/:classId/reports/publish-drafts")
  publishDrafts(
    @CurrentUser() user: AuthenticatedUser,
    @Param("classId", new ParseUUIDPipe()) classId: string,
    @Body() body: unknown,
  ) {
    return this.reports.publishClassDrafts(
      user.id,
      classId,
      parseInput(bulkDailyReportRequestSchema, body ?? {}),
    );
  }

  @Get("teacher/classes/:classId/reports")
  listClassReportStatuses(
    @CurrentUser() user: AuthenticatedUser,
    @Param("classId", new ParseUUIDPipe()) classId: string,
    @Query("reportDate") reportDate?: string,
  ) {
    return this.reports.listClassReportStatuses(user.id, classId, reportDate);
  }

  @Get("teacher/reports/:reportId/reads")
  listReads(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
  ) {
    return this.reports.listReads(user.id, reportId);
  }

  @Post("teacher/reports/:reportId/comments")
  addStaffComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
    @Body() body: unknown,
  ) {
    return this.reports.addComment(
      user.id,
      reportId,
      parseInput(dailyReportCommentRequestSchema, body ?? {}),
    );
  }

  @Get("parent/children")
  listParentChildren(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.listParentChildren(user.id);
  }

  @Get("parent/children/:childId/reports")
  listParentReports(
    @CurrentUser() user: AuthenticatedUser,
    @Param("childId", new ParseUUIDPipe()) childId: string,
  ) {
    return this.reports.listParentReports(user.id, childId);
  }

  @Get("parent/reports/:reportId")
  getParentReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
  ) {
    return this.reports.getReportForParent(user.id, reportId);
  }

  @Post("parent/reports/:reportId/comments")
  addParentComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
    @Body() body: unknown,
  ) {
    return this.reports.addComment(
      user.id,
      reportId,
      parseInput(dailyReportCommentRequestSchema, body ?? {}),
    );
  }

  @Delete("reports/:reportId/comments/:commentId")
  deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId", new ParseUUIDPipe()) reportId: string,
    @Param("commentId", new ParseUUIDPipe()) commentId: string,
  ) {
    return this.reports.deleteComment(user.id, reportId, commentId);
  }
}

function parseInput<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: "Validation failed.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    throw error;
  }
}
