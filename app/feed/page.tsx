import Link from "next/link";
import { Camera, Flame, HelpCircle, Plus, Trophy, Zap, Filter, X } from "lucide-react";
import { DoubtComposer } from "@/app/feed/doubt-composer";
import { FeedDoubt } from "@/app/feed/feed-doubt";
import { FeedPost } from "@/app/feed/feed-post";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const filter = params.filter ?? "posts";

  const session = await auth();

  const [posts, currentUser, topStudents, topStreak, doubts] = await Promise.all([
    prisma.post.findMany({
      include: {
        user: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" }
        },
        reactions: session?.user.id
          ? {
              where: { userId: session.user.id },
              select: { type: true }
            }
          : false
      },
      orderBy: { createdAt: "desc" },
      take: 40
    }),

    session?.user.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          include: { streak: true }
        })
      : null,

    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { xp: "desc" },
      take: 8
    }),

    prisma.streak.findFirst({
      include: { user: true },
      orderBy: [{ current: "desc" }, { best: "desc" }]
    }),

    prisma.doubt.findMany({
      include: {
        user: true,
        answers: {
          include: { user: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
      take: 20
    })
  ]);

  let feedItems: any[] = [];

  if (filter === "doubts") {
    feedItems = doubts.map((doubt) => ({
      type: "doubt" as const,
      createdAt: doubt.createdAt,
      isResolved: doubt.isResolved,
      doubt
    }));
  } else if (filter === "all") {
    feedItems = [
      ...doubts.map((doubt) => ({
        type: "doubt" as const,
        createdAt: doubt.createdAt,
        isResolved: doubt.isResolved,
        doubt
      })),
      ...posts.map((post) => ({
        type: "post" as const,
        createdAt: post.createdAt,
        post
      }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    feedItems = posts.map((post) => ({
      type: "post" as const,
      createdAt: post.createdAt,
      post
    }));
  }

  return (
    <AppShell
      role={session?.user.role ?? "STUDENT"}
      showMobileHeader={true}
      className="bg-muted/30"
    >
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,620px)_320px]">
        <main className="min-w-0">
          {/* TOP HIGHLIGHTS - Hidden on mobile, visible on larger screens */}
          <section className="hidden sm:sticky sm:top-[61px] sm:z-20 sm:-mx-4 sm:border-b sm:bg-background/95 sm:px-2 sm:py-1 sm:backdrop-blur sm:block lg:top-[60px] lg:mx-0 lg:mt-8 lg:grid lg:grid-cols-3 lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0">
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
                detail={
                  topStudents[0]
                    ? `${topStudents[0].xp} XP`
                    : "Earn XP"
                }
              />
            </div>
          </section>

          {/* ASK PEERS - Collapsible with FAB on mobile */}
          <div className="relative">
  {/* Mobile FAB - Fixed with working close button */}
  <div className="fixed bottom-20 right-4 z-50 sm:hidden">
    <input type="checkbox" id="mobile-fab-toggle" className="hidden peer" />
    
    <label 
      htmlFor="mobile-fab-toggle" 
      className="flex cursor-pointer items-center justify-center rounded-full bg-primary p-4 shadow-lg transition-all hover:bg-primary/90"
    >
      <HelpCircle size={24} className="text-primary-foreground" />
    </label>
    
    <div className="fixed inset-0 z-50 hidden peer-checked:block">
      <label 
        htmlFor="mobile-fab-toggle" 
        className="absolute inset-0 bg-black/50 cursor-default"
      />
      
      <div className="absolute bottom-24 right-4 left-4 rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Ask Your Peers</h3>
          <label 
            htmlFor="mobile-fab-toggle" 
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </label>
        </div>
        <div className="p-4">
          <DoubtComposer />
        </div>
      </div>
    </div>
  </div>

  {/* Desktop version */}
  <Card className="mt-5 hidden border-primary shadow-lg sm:block">
    <CardContent className="p-0">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-md bg-primary px-5 py-4 text-lg font-bold text-primary-foreground">
          <span className="flex items-center gap-3">
            <HelpCircle size={22} />
            Ask Your Peers
          </span>

          <span className="text-sm font-medium">
            Get answers instantly
          </span>
        </summary>

        <div className="border-t bg-card p-5">
          <DoubtComposer />
        </div>
      </details>
    </CardContent>
  </Card>
</div>

{/* FILTER CONTROLS - Mobile optimized */}
<section className="mt-5">
  {/* Mobile: Horizontal scrollable filters */}
  <div className="flex gap-1.5 overflow-x-auto pb-2 sm:hidden">
    <Button
      asChild
      size="sm"
      variant={filter === "posts" ? "default" : "ghost"}
      className="flex-shrink-0 h-8 px-3"
    >
      <Link href="/feed?filter=posts">
        <Filter size={14} />
        Posts
      </Link>
    </Button>

    <Button
      asChild
      size="sm"
      variant={filter === "doubts" ? "default" : "ghost"}
      className="flex-shrink-0 h-8 px-3"
    >
      <Link href="/feed?filter=doubts">
        <HelpCircle size={14} />
        Doubts
      </Link>
    </Button>

    <Button
      asChild
      size="sm"
      variant={filter === "all" ? "default" : "ghost"}
      className="flex-shrink-0 h-8 px-3"
    >
      <Link href="/feed?filter=all">
        <Flame size={14} />
        All
      </Link>
    </Button>
  </div>

  {/* Desktop: Subtle filter tabs */}
  <div className="hidden sm:flex gap-1 border-b">
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`relative h-9 rounded-none px-4 ${
        filter === "posts" 
          ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" 
          : "text-muted-foreground"
      }`}
    >
      <Link href="/feed?filter=posts">
        <Filter size={15} className="mr-2" />
        Posts
      </Link>
    </Button>

    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`relative h-9 rounded-none px-4 ${
        filter === "doubts" 
          ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" 
          : "text-muted-foreground"
      }`}
    >
      <Link href="/feed?filter=doubts">
        <HelpCircle size={15} className="mr-2" />
        Doubts
      </Link>
    </Button>

    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`relative h-9 rounded-none px-4 ${
        filter === "all" 
          ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" 
          : "text-muted-foreground"
      }`}
    >
      <Link href="/feed?filter=all">
        <Flame size={15} className="mr-2" />
        All Feed
      </Link>
    </Button>
  </div>
</section>

          {/* FEED */}
          <section className="mt-5 grid gap-5">
            {feedItems.map((item) =>
              item.type === "doubt" ? (
                <FeedDoubt
                  key={`doubt-${item.doubt.id}`}
                  doubt={{
                    ...item.doubt,
                    createdAt: item.doubt.createdAt.toISOString(),
                    answers: item.doubt.answers.map((answer: any) => ({
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
                    userReaction:
                      item.post.reactions?.[0]?.type ?? null,
                    createdAt: item.post.createdAt.toISOString(),
                    comments: item.post.comments.map((comment: any) => ({
                      ...comment,
                      createdAt: comment.createdAt.toISOString()
                    }))
                  }}
                />
              )
            )}

            {!feedItems.length ? <EmptyFeed /> : null}
          </section>
        </main>

        {/* SIDEBAR */}
        <aside className="hidden xl:block">
          <div className="sticky top-6 grid gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={session?.user.name ?? "Student"} />
                  <div>
                    <p className="font-semibold">
                      {session?.user.name ?? "Student"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Competitive learning mode
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-3 p-4">
                <p className="font-semibold">Top streak</p>

                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={topStreak?.user.name ?? "Student"}
                      image={topStreak?.user.image}
                    />

                    <div>
                      <p className="font-medium">
                        {topStreak?.user.name ??
                          "No streak leader yet"}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {topStreak
                          ? `${topStreak.current} day streak · best ${topStreak.best}`
                          : "Post daily to start a streak"}
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
                  <Link
                    href="/doubts"
                    className="rounded-md border p-3 text-sm transition hover:bg-muted"
                    key={doubt.id}
                  >
                    <p className="line-clamp-1 font-medium">
                      {doubt.title}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {doubt.answers.length} answers by the community
                    </p>
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

// Rest of the components remain the same...
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
          <p className="truncate text-[9px] font-medium leading-3 text-muted-foreground sm:text-xs sm:leading-4">
            {label}
          </p>

          <p className="truncate text-[11px] font-semibold leading-4 sm:text-base sm:leading-5">
            {title}
          </p>

          <p className="truncate text-[9px] leading-3 text-muted-foreground sm:text-xs sm:leading-4">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Avatar({
  name,
  image
}: {
  name: string;
  image?: string | null;
}) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-accent via-primary to-secondary p-0.5">
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-background text-sm font-semibold">
        {image ? (
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          name.charAt(0)
        )}
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
          <p className="font-semibold">
            No study posts yet
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Share the first study win, notes screenshot, or daily target.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}