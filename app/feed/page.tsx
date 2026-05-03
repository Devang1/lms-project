import Link from "next/link";
import { Camera, Flame, HelpCircle, Plus, Trophy, Zap } from "lucide-react";
import { DoubtComposer } from "@/app/feed/doubt-composer";
import { FeedDoubt } from "@/app/feed/feed-doubt";
import { FeedPost } from "@/app/feed/feed-post";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await auth();
  const [posts, currentUser, topStudents, topStreak, doubts] = await Promise.all([
    prisma.post.findMany({
      include: {
        user: true,
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        reactions: session?.user.id ? { where: { userId: session.user.id }, select: { type: true } } : false
      },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    session?.user.id ? prisma.user.findUnique({
      where: { id: session.user.id },
      include: { streak: true }
    }) : null,
    prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: { xp: "desc" }, take: 8 }),
    prisma.streak.findFirst({ include: { user: true }, orderBy: [{ current: "desc" }, { best: "desc" }] }),
    prisma.doubt.findMany({
      include: { user: true, answers: { include: { user: true }, orderBy: { createdAt: "asc" } } },
      orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
      take: 20
    })
  ]);

  const feedItems = [
    ...doubts.map((doubt) => ({ type: "doubt" as const, createdAt: doubt.createdAt, isResolved: doubt.isResolved, doubt })),
    ...posts.map((post) => ({ type: "post" as const, createdAt: post.createdAt, isResolved: true, post }))
  ].sort((a, b) => {
    if (a.type !== b.type) return a.type === "doubt" ? -1 : 1;
    if (a.type === "doubt" && a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <AppShell role={session?.user.role ?? "STUDENT"} showMobileHeader={true} className="bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,620px)_320px]">
        <main className="min-w-0">
          {/* <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-md sm:border sm:border-t-0 lg:top-0">
            <div className="flex items-center gap-3">
              <Link href="/feed" className="flex min-w-0 flex-1 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Flame size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-5">Star Study Point</p>
                  <p className="text-xs text-muted-foreground">Learning feed</p>
                </div>
              </Link>
              <Button asChild size="icon" aria-label="Create post">
                <Link href="/feed/create"><Plus size={21} /></Link>
              </Button>
            </div>
          </div> */}

          <section className="sticky top-[61px] z-20 -mx-4 border-b bg-background/95 px-2 py-1 backdrop-blur sm:top-[60px] sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-3 sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0 lg:top-[61px]">
            <div className="grid grid-cols-3 gap-1 sm:contents">
              <HighlightCard
                icon={Flame}
                label="Your streak"
                title={`${currentUser?.streak?.current ?? 0}d`}
                detail={`Best ${currentUser?.streak?.best ?? 0}`}
              />
              <HighlightCard
                icon={Zap}
                label="Top streak"
                title={topStreak ? `${topStreak.current}d` : "0d"}
                detail={topStreak?.user.name ?? "No leader"}
              />
              <HighlightCard
                icon={Trophy}
                label="Performer"
                title={topStudents[0]?.name ?? "Opening"}
                detail={topStudents[0] ? `${topStudents[0].xp} XP` : "Earn XP"}
              />
            </div>
          </section>

          <details className="mt-4 rounded-md border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold">
              <HelpCircle size={18} /> Ask a peer doubt
            </summary>
            <div className="border-t p-4">
              <DoubtComposer />
            </div>
          </details>

          <section className="mt-5 grid gap-5">
            {feedItems.map((item) => item.type === "doubt" ? (
              <FeedDoubt
                key={`doubt-${item.doubt.id}`}
                doubt={{
                  ...item.doubt,
                  createdAt: item.doubt.createdAt.toISOString(),
                  answers: item.doubt.answers.map((answer) => ({
                    ...answer,
                    createdAt: answer.createdAt.toISOString()
                  }))
                }}
              />
            ) : (
              <FeedPost
                key={`post-${item.post.id}`}
                post={{
                  ...item.post,
                  userReaction: item.post.reactions[0]?.type ?? null,
                  createdAt: item.post.createdAt.toISOString(),
                  comments: item.post.comments.map((comment) => ({
                    ...comment,
                    createdAt: comment.createdAt.toISOString()
                  }))
                }}
              />
            ))}
            {!feedItems.length ? <EmptyFeed /> : null}
          </section>
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-6 grid gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={session?.user.name ?? "Student"} />
                  <div>
                    <p className="font-semibold">{session?.user.name ?? "Student"}</p>
                    <p className="text-sm text-muted-foreground">Competitive learning mode</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="grid gap-3 p-4">
                <p className="font-semibold">Top streak</p>
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={topStreak?.user.name ?? "Student"} image={topStreak?.user.image} />
                    <div>
                      <p className="font-medium">{topStreak?.user.name ?? "No streak leader yet"}</p>
                      <p className="text-sm text-muted-foreground">
                        {topStreak ? `${topStreak.current} day streak · best ${topStreak.best}` : "Post daily to start a streak"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="grid gap-3 p-4">
                <p className="font-semibold">Community now</p>
                {doubts.slice(0, 4).map((doubt) => (
                  <Link href="/doubts" className="rounded-md border p-3 text-sm transition hover:bg-muted" key={doubt.id}>
                    <p className="line-clamp-1 font-medium">{doubt.title}</p>
                    <p className="text-xs text-muted-foreground">{doubt.answers.length} answers by the community</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function HighlightCard({
  icon: Icon,
  label,
  title,
  detail
}: {
  icon: typeof Flame;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <Card className="rounded-sm shadow-none sm:rounded-md sm:shadow-sm">
      <CardContent className="grid grid-cols-[18px_1fr] items-center gap-1 p-1.5 text-left sm:flex sm:justify-start sm:gap-3 sm:p-4">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground sm:size-10 sm:rounded-md">
          <Icon size={12} className="sm:size-[19px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[9px] font-medium leading-3 text-muted-foreground sm:text-xs sm:leading-4">{label}</p>
          <p className="truncate text-[11px] font-semibold leading-4 sm:text-base sm:leading-5">{title}</p>
          <p className="truncate text-[9px] leading-3 text-muted-foreground sm:text-xs sm:leading-4">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-accent via-primary to-secondary p-0.5">
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-background text-sm font-semibold">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Auth avatars may come from arbitrary configured providers.
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : name.charAt(0)}
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <Card>
      <CardContent className="grid justify-items-center gap-3 p-8 text-center">
        <Camera className="text-primary" size={34} />
        <div>
          <p className="font-semibold">No study posts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Share the first study win, notes screenshot, or daily target.</p>
        </div>
      </CardContent>
    </Card>
  );
}
