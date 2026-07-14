import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export type WebNotificationVisual = {
  icon: LucideIcon;
  tileClass: string;
  iconClass: string;
};

export function notificationVisual(
  notificationType: string,
): WebNotificationVisual {
  if (
    notificationType === "digest.daily" ||
    notificationType === "digest.weekly"
  ) {
    return { icon: Home, tileClass: "bg-sky-100", iconClass: "text-sky-600" };
  }
  if (notificationType === "digest.tomorrow_events") {
    return {
      icon: CalendarDays,
      tileClass: "bg-blue-100",
      iconClass: "text-blue-600",
    };
  }
  if (notificationType === "payment.reminder") {
    return {
      icon: CreditCard,
      tileClass: "bg-emerald-100",
      iconClass: "text-emerald-600",
    };
  }
  if (notificationType === "document.deadline_reminder") {
    return {
      icon: FileText,
      tileClass: "bg-violet-100",
      iconClass: "text-violet-600",
    };
  }
  if (notificationType === "notice.unread_nudge") {
    return {
      icon: Megaphone,
      tileClass: "bg-sky-100",
      iconClass: "text-sky-600",
    };
  }
  return {
    icon: Bell,
    tileClass: "bg-muted",
    iconClass: "text-muted-foreground",
  };
}
