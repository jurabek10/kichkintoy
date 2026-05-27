"use client";

import Link from "next/link";
import { ArrowRight, Inbox, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session";

export default function DashboardHome() {
  const { session } = useSession();
  if (!session) return null;

  const role = session.user.role;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Welcome
          </p>
          <CardTitle className="text-2xl">Hi, {session.user.fullName}</CardTitle>
          <CardDescription>
            {session.membership.centerName
              ? `You're signed in at ${session.membership.centerName}.`
              : "Your account is active."}
          </CardDescription>
        </CardHeader>
      </Card>

      {role === "director" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            href="/dashboard/requests"
            title="Join requests"
            description="Review and approve parents and teachers waiting to join your kindergarten."
            Icon={Inbox}
          />
          <ActionCard
            href="/dashboard/invitations"
            title="Invitations"
            description="Invite a parent or teacher by phone number. They get an SMS link to sign up."
            Icon={Mail}
          />
        </div>
      ) : null}

      {role === "teacher" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            href="/dashboard/requests"
            title="Join requests"
            description="If your director gave you approval permission, you can review pending requests here."
            Icon={Inbox}
          />
        </div>
      ) : null}

      {role === "parent" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your child's day</CardTitle>
            <CardDescription>
              Daily reports, notices, and the album will appear here once your
              teacher starts posting.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  Icon: typeof Inbox;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border bg-card text-card-foreground shadow-card transition hover:border-primary/40 hover:shadow-pop"
    >
      <CardContent className="flex flex-col gap-2 p-6 pt-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-bold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </CardContent>
    </Link>
  );
}
