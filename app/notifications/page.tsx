import { Bell, Megaphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  const notifications = session?.user.id ? await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  }) : [];

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="grid gap-5 pb-20 lg:pb-0">
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-primary">Notifications</p>
          <h1 className="mt-1 text-2xl font-semibold">Teacher announcements and updates</h1>
        </section>
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <CardContent className="flex gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  {notification.type === "COURSE" ? <Megaphone size={18} /> : <Bell size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{notification.title}</p>
                    {!notification.read ? <Badge variant="accent">New</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{notification.createdAt.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {!notifications.length ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
