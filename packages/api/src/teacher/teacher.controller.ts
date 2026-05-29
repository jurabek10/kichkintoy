import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  SessionGuard,
  type AuthenticatedUser,
} from "../auth/session.guard";
import { TeacherService } from "./teacher.service";

@Controller("teacher")
@UseGuards(SessionGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get("classes")
  listClasses(@CurrentUser() user: AuthenticatedUser) {
    return this.teacherService.listClasses(user.id);
  }

  @Get("classes/:classId/children")
  listClassChildren(
    @CurrentUser() user: AuthenticatedUser,
    @Param("classId", new ParseUUIDPipe()) classId: string,
  ) {
    return this.teacherService.listClassChildren(user.id, classId);
  }
}
