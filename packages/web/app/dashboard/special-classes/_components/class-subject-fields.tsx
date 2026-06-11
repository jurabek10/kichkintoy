"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClassSubjectFields({
  classId,
  subjectId,
  specialistTeacherId,
  classes,
  subjects,
  specialists,
  onClassChange,
  onSubjectChange,
  onSpecialistChange,
}: {
  classId: string;
  subjectId: string;
  specialistTeacherId: string;
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  specialists: Array<{ id: string; fullName: string }>;
  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onSpecialistChange: (value: string) => void;
}) {
  return (
    <>
      <Select value={classId} onValueChange={onClassChange}>
        <SelectTrigger>
          <SelectValue placeholder="Class" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((klass) => (
            <SelectItem key={klass.id} value={klass.id}>
              {klass.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={subjectId} onValueChange={onSubjectChange}>
        <SelectTrigger>
          <SelectValue placeholder="Subject" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((subject) => (
            <SelectItem key={subject.id} value={subject.id}>
              {subject.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={specialistTeacherId} onValueChange={onSpecialistChange}>
        <SelectTrigger>
          <SelectValue placeholder="Specialist" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No specialist</SelectItem>
          {specialists.map((specialist) => (
            <SelectItem key={specialist.id} value={specialist.id}>
              {specialist.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
