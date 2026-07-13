"use client";

import { useParams } from "next/navigation";
import { Conversation } from "../_components/conversation";

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  return <Conversation threadId={params.threadId} />;
}
