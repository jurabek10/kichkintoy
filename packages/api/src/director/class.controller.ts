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
  UseGuards,
} from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  SessionGuard,
  type AuthenticatedUser,
} from "../auth/session.guard";
import { CenterApproverGuard, DirectorOnly } from "./director.guard";
import {
  assignTeacherSchema,
  createClassSchema,
  updateClassSchema,
} from "./class.schemas";
import { ClassService } from "./class.service";

@Controller("director/centers/:centerId")
@UseGuards(SessionGuard, CenterApproverGuard)
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get("classes")
  listClasses(@Param("centerId", new ParseUUIDPipe()) centerId: string) {
    return this.classService.listClasses(centerId);
  }

  @Get("classes/:classId")
  getClass(
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("classId", new ParseUUIDPipe()) classId: string,
  ) {
    return this.classService.getClass(centerId, classId);
  }

  @Post("classes")
  @DirectorOnly()
  createClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Body() body: unknown,
  ) {
    return this.classService.createClass({
      centerId,
      actorUserId: user.id,
      input: parseInput(createClassSchema, body ?? {}),
    });
  }

  @Patch("classes/:classId")
  @DirectorOnly()
  updateClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("classId", new ParseUUIDPipe()) classId: string,
    @Body() body: unknown,
  ) {
    return this.classService.updateClass({
      centerId,
      classId,
      actorUserId: user.id,
      input: parseInput(updateClassSchema, body ?? {}),
    });
  }

  @Post("classes/:classId/archive")
  @DirectorOnly()
  archiveClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("classId", new ParseUUIDPipe()) classId: string,
  ) {
    return this.classService.archiveClass({
      centerId,
      classId,
      actorUserId: user.id,
    });
  }

  @Post("classes/:classId/restore")
  @DirectorOnly()
  restoreClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("classId", new ParseUUIDPipe()) classId: string,
  ) {
    return this.classService.restoreClass({
      centerId,
      classId,
      actorUserId: user.id,
    });
  }

  @Get("teachers")
  @DirectorOnly()
  listTeachers(@Param("centerId", new ParseUUIDPipe()) centerId: string) {
    return this.classService.listTeachers(centerId);
  }

  @Post("classes/:classId/teachers")
  @DirectorOnly()
  assignTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("classId", new ParseUUIDPipe()) classId: string,
    @Body() body: unknown,
  ) {
    return this.classService.assignTeacher({
      centerId,
      classId,
      actorUserId: user.id,
      input: parseInput(assignTeacherSchema, body ?? {}),
    });
  }

  @Delete("classes/:classId/teachers/:teacherUserId")
  @DirectorOnly()
  unassignTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("classId", new ParseUUIDPipe()) classId: string,
    @Param("teacherUserId", new ParseUUIDPipe()) teacherUserId: string,
  ) {
    return this.classService.unassignTeacher({
      centerId,
      classId,
      teacherUserId,
      actorUserId: user.id,
    });
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
