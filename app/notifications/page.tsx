import Link from "next/link";
import { Bell, Megaphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();

  const notifications = session?.user.id
    ? await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="mx-auto grid max-w-4xl gap-5 px-4 pb-20 sm:px-6 lg:px-0 lg:pb-0">
        {/* Header */}
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-primary">
                  Notifications
                </p>

                {unreadCount > 0 ? (
                  <span className="relative flex">
                    <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                  </span>
                ) : null}
              </div>

              <h1 className="mt-1 text-xl font-semibold sm:text-2xl">
                Teacher announcements and updates
              </h1>

              {unreadCount > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  You have {unreadCount} new notification
                  {unreadCount > 1 ? "s" : ""}
                </p>
              ) : null}
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link href="/feed">Back to feed</Link>
            </Button>
          </div>
        </section>

        {/* Notifications List */}
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all ${
                !notification.read
                  ? "border-red-500/40 bg-red-500/5"
                  : ""
              }`}
            >
              <CardContent className="flex gap-3 p-4">
                {/* Icon */}
                <div className="relative">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    {notification.type === "COURSE" ? (
                      <Megaphone size={18} />
                    ) : (
                      <Bell size={18} />
                    )}
                  </span>

                  {!notification.read ? (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                    </span>
                  ) : null}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {notification.title}
                    </p>

                    {!notification.read ? (
                      <Badge variant="destructive">
                        New
                      </Badge>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.body}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {notification.createdAt.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {!notifications.length ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}