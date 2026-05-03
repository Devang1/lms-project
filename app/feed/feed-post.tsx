"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle, MoreHorizontal, Smile, Sparkles, ThumbsDown } from "lucide-react";
import { createCommentAction, setPostReactionAction } from "@/app/actions/social";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FeedPostProps = {
  post: {
    id: string;
    content: string;
    imageUrl: string | null;
    likes: number;
    userReaction: "LIKE" | "DISLIKE" | null;
    studyHours: number | null;
    mockScore: number | null;
    createdAt: string;
    user: {
      name: string;
      image: string | null;
      heroTag: string;
    };
    comments: {
      id: string;
      content: string;
      createdAt: string;
      user: { name: string; image: string | null };
    }[];
  };
};

export function FeedPost({ post }: FeedPostProps) {
  const [likes, setLikes] = useState(post.likes);
  const [reaction, setReaction] = useState<"LIKE" | "DISLIKE" | null>(post.userReaction);
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCommentPending, startCommentTransition] = useTransition();

  function likePost() {
    if (isPending) return;
    const previous = reaction;
    const nextReaction = previous === "LIKE" ? null : "LIKE";
    const nextLikes = previous === "LIKE" ? Math.max(0, likes - 1) : likes + 1;
    setReaction(nextReaction);
    setLikes(nextLikes);
    startTransition(async () => {
      try {
        await setPostReactionAction(post.id, nextReaction ?? "NONE");
      } catch {
        setReaction(previous);
        setLikes(likes);
      }
    });
  }

  function dislikePost() {
    if (isPending) return;
    const previous = reaction;
    const nextReaction = previous === "DISLIKE" ? null : "DISLIKE";
    const nextLikes = previous === "LIKE" ? Math.max(0, likes - 1) : likes;
    setReaction(nextReaction);
    setLikes(nextLikes);
    startTransition(async () => {
      try {
        await setPostReactionAction(post.id, nextReaction ?? "NONE");
      } catch {
        setReaction(previous);
        setLikes(likes);
      }
    });
  }

  function submitComment(formData: FormData) {
    if (!commentText.trim()) return;
    startCommentTransition(async () => {
      await createCommentAction(post.id, formData);
      setCommentText("");
    });
  }

  return (
    <article id={`post-${post.id}`} className="overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={post.user.name} image={post.user.image} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{post.user.name}</p>
              <Badge variant="accent">{post.user.heroTag}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="More post actions"><MoreHorizontal size={18} /></Button>
      </div>

      {post.imageUrl ? (
        <div className="aspect-square bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- User uploaded post images are remote Cloudinary URLs. */}
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mx-4 rounded-md border bg-muted/40 p-4">
          <p className="whitespace-pre-line text-base font-medium leading-7">{post.content}</p>
        </div>
      )}

      <div className="grid gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Appreciate post"
              onClick={likePost}
              className={reaction === "LIKE" ? "text-destructive" : undefined}
            >
              <Heart size={22} fill={reaction === "LIKE" ? "currentColor" : "none"} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Dislike post"
              onClick={dislikePost}
              className={reaction === "DISLIKE" ? "text-muted-foreground" : undefined}
            >
              <ThumbsDown size={21} fill={reaction === "DISLIKE" ? "currentColor" : "none"} />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Comment" onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}>
              <MessageCircle size={22} />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{likes} appreciations</span>
          <Badge variant="secondary"><Sparkles size={14} /> +10 XP</Badge>
          {post.studyHours ? <Badge variant="outline">{post.studyHours} study hours</Badge> : null}
          {post.mockScore ? <Badge variant="outline">{post.mockScore}% test score</Badge> : null}
        </div>
        {post.imageUrl ? (
          <div className="rounded-md bg-muted/40 p-3">
            <p className="whitespace-pre-line text-sm leading-6">
              <span className="font-semibold">{post.user.name}</span> {post.content}
            </p>
          </div>
        ) : null}

        {post.comments.length ? (
          <details className="rounded-md border bg-background">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold">
              View comments <span className="text-muted-foreground">({post.comments.length})</span>
            </summary>
            <div className="grid max-h-40 gap-2 overflow-y-auto border-t p-3">
              {post.comments.map((comment) => (
                <div className="flex gap-2 text-sm" key={comment.id}>
                  <Avatar name={comment.user.name} image={comment.user.image} size="sm" />
                  <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-3 py-2">
                    <p className="font-semibold">{comment.user.name}</p>
                    <p className="break-words text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <form action={submitComment} className="flex items-center gap-2 border-t pt-3">
          <Smile size={18} className="text-muted-foreground" />
          <Input
            id={`comment-${post.id}`}
            name="content"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Add a supportive comment..."
            className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
            disabled={isCommentPending}
          />
          <Button type="submit" variant="ghost" size="sm" disabled={!commentText.trim() || isCommentPending}>Post</Button>
        </form>
      </div>
    </article>
  );
}

function Avatar({ name, image, size = "default" }: { name: string; image?: string | null; size?: "default" | "sm" }) {
  return (
    <div className={`${size === "sm" ? "size-8" : "size-11"} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-accent via-primary to-secondary p-0.5`}>
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-background text-sm font-semibold">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Auth avatars may come from arbitrary configured providers.
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : name.charAt(0)}
      </div>
    </div>
  );
}
