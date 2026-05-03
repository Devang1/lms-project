import { Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeaderboardsPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: [{ xp: "desc" }, { createdAt: "asc" }],
    take: 50
  });

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="grid gap-5">
        <div>
          <p className="text-sm text-muted-foreground">Competitive rankings</p>
          <h1 className="text-3xl font-semibold">Hero leaderboard</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Season rankings</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {users.map((user, index) => (
              <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-md border p-3" key={user.id}>
                <div className="flex size-9 items-center justify-center rounded-md bg-muted font-semibold">{index + 1}</div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.heroTag}</p>
                </div>
                <Badge variant={index < 3 ? "accent" : "outline"}><Trophy size={14} /> {user.xp} XP</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
