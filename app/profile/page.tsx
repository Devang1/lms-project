import Link from "next/link";
import { BookOpen, Flame, Grid3X3, Medal, MessageCircle, Star, Trophy, UserCog } from "lucide-react";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: {
      badges: { include: { badge: true } },
      posts: { orderBy: { createdAt: "desc" }, take: 12 },
      enrollments: { include: { course: true }, take: 6 },
      doubtAnswers: true,
      streak: true
    }
  });
  const leaders = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: [{ xp: "desc" }, { createdAt: "asc" }],
    take: 10
  });

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="mx-auto grid max-w-5xl gap-5 pb-20 lg:pb-0">
        <section className="overflow-hidden rounded-md border bg-card shadow-sm">
          <div className="h-28 bg-gradient-to-r from-primary via-secondary to-accent" />
          <div className="px-4 pb-5 sm:px-6">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex size-24 items-center justify-center rounded-full border-4 border-card bg-background text-3xl font-bold shadow-sm">
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Auth avatars may come from arbitrary configured providers.
                    <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : user?.name.charAt(0)}
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl font-semibold">{user?.name}</h1>
                  <p className="text-sm text-muted-foreground">@{user?.username}</p>
                </div>
              </div>
              <Button asChild variant="secondary"><Link href="/feed#create">Create post</Link></Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="accent"><Medal size={14} /> {user?.heroTag}</Badge>
              <Badge variant="secondary"><Trophy size={14} /> {user?.xp ?? 0} XP</Badge>
              <Badge variant="outline"><Flame size={14} /> {user?.streak?.current ?? 0} day streak</Badge>
            </div>

            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
              {user?.bio ?? "Competitive learner sharing study wins, notes, questions, and progress with the Star Study Point community."}
            </p>

            <div className="mt-5 grid grid-cols-4 rounded-md border text-center text-sm">
              <Stat label="Posts" value={user?.posts.length ?? 0} />
              <Stat label="Courses" value={user?.enrollments.length ?? 0} />
              <Stat label="Answers" value={user?.doubtAnswers.length ?? 0} />
              <Stat label="Followers" value="--" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardContent className="grid gap-4 p-4">
              <div className="flex items-center gap-2 font-semibold"><UserCog size={18} /> Edit profile</div>
              <form action={updateProfileAction} className="grid gap-2">
                <Input name="name" defaultValue={user?.name ?? ""} placeholder="Name" required />
                <Textarea name="bio" defaultValue={user?.bio ?? ""} placeholder="Bio" />
                <Button type="submit" size="sm">Save profile</Button>
              </form>
              <form action={changePasswordAction} className="grid gap-2 border-t pt-4">
                <Input name="currentPassword" type="password" placeholder="Current password" required />
                <Input name="newPassword" type="password" placeholder="New password" minLength={6} required />
                <Button type="submit" size="sm" variant="secondary">Change password</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-4 p-4">
              <div className="flex items-center gap-2 font-semibold"><Star size={18} /> Achievements</div>
              <div className="flex flex-wrap gap-2">
                {user?.badges.map(({ badge }) => <Badge key={badge.id} variant="secondary">{badge.icon} {badge.name}</Badge>)}
                {!user?.badges.length ? <p className="text-sm text-muted-foreground">Badges unlock from streaks, tests, and peer mentoring.</p> : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-4 p-4">
              <div className="flex items-center gap-2 font-semibold"><BookOpen size={18} /> Learning spaces</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {user?.enrollments.map((enrollment) => (
                  <Link href={`/courses/${enrollment.course.slug}`} className="rounded-md border p-3 transition hover:bg-muted" key={enrollment.id}>
                    <p className="line-clamp-1 font-medium">{enrollment.course.title}</p>
                    <p className="text-xs text-muted-foreground">{enrollment.course.subject}</p>
                  </Link>
                ))}
                {!user?.enrollments.length ? <p className="text-sm text-muted-foreground">No enrolled courses yet.</p> : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center gap-2 font-semibold"><Trophy size={18} /> Rankings</div>
              {leaders.map((leader, index) => (
                <div className="grid grid-cols-[32px_1fr_auto] items-center gap-2 rounded-md border p-2 text-sm" key={leader.id}>
                  <span className="flex size-8 items-center justify-center rounded-md bg-muted font-semibold">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{leader.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{leader.heroTag}</p>
                  </div>
                  <Badge variant={index < 3 ? "accent" : "outline"}>{leader.xp} XP</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold"><Grid3X3 size={18} /> Posts</div>
            <Button asChild variant="ghost" size="sm"><Link href="/feed">Open feed</Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {user?.posts.map((post) => (
              <article className="aspect-square overflow-hidden rounded-md border bg-muted/50" key={post.id}>
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- User-pasted post images can come from any URL.
                  <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col justify-between p-3 text-sm">
                    <p className="line-clamp-5 font-medium">{post.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageCircle size={14} />
                      Study update
                    </div>
                  </div>
                )}
              </article>
            ))}
            {!user?.posts.length ? (
              <div className="col-span-full rounded-md border p-6 text-center text-sm text-muted-foreground">
                Your study posts will appear here.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r p-3 last:border-r-0">
      <p className="font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
