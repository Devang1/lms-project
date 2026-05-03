import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { FeedComposer } from "@/app/feed/feed-composer";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CreateFeedPostPage() {
  const session = await auth();

  // Redirect unauthenticated users
  if (!session?.user) {
    redirect("/login?callbackUrl=/feed/create");
  }

  return (
    <AppShell
      role={session.user.role ?? "STUDENT"}
      showMobileHeader={true}
      className="bg-muted/30"
    >
      <div className="mx-auto max-w-2xl pb-20 lg:pb-0">
        {/* Create Post Header */}
        <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-md sm:border sm:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Back to feed"
            >
              <Link href="/feed">
                <ArrowLeft size={20} />
              </Link>
            </Button>

            <div className="min-w-0 text-center">
              <p className="font-semibold leading-5">Create post</p>
              <p className="text-xs text-muted-foreground">
                Share a study update
              </p>
            </div>

            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ImagePlus size={19} />
            </span>
          </div>
        </div>

        {/* Feed Composer */}
        <Card className="mt-4 overflow-hidden">
          <CardContent className="p-0">
            <FeedComposer
              userName={session.user.name ?? "Student"}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}