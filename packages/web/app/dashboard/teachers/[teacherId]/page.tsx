"use client";

import { useParams } from "next/navigation";
import { DirectorTeacherDetail } from "./DirectorTeacherDetail";

export default function TeacherProfilePage() {
  const params = useParams<{ teacherId: string }>();
  return <DirectorTeacherDetail teacherId={params.teacherId} />;
}
