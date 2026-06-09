"use client";

import { useParams } from "next/navigation";
import { DocumentSubmissionScreen } from "../_components/document-submission-screen";

export default function DocumentSubmissionPage() {
  const params = useParams<{ submissionId: string }>();
  return <DocumentSubmissionScreen submissionId={params.submissionId} />;
}
