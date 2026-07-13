"use client";
import { useParams } from "next/navigation";
import { ComplaintDetailView } from "../_components/complaint-detail";

export default function ComplaintPage() {
  const { complaintId } = useParams<{ complaintId: string }>();
  return <ComplaintDetailView complaintId={complaintId} />;
}
