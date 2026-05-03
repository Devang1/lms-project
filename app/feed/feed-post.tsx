"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle, MoreHorizontal, Smile, Sparkles, ThumbsDown, BookOpen, Target } from "lucide-react";
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
  const [showComments, setShowComments] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCommentPending, startCommentTransition] = useTransition();

  const handleLike = () => {
    if (isPending) return;
    
    const previousReaction = reaction;
    const newReaction = previousReaction === "LIKE" ? null : "LIKE";
    const newLikes = previousReaction === "LIKE" ? likes - 1 : likes + 1;
    
    setReaction(newReaction);
    setLikes(newLikes);
    
    startTransition(async () => {
      try {
        await setPostReactionAction(post.id, newReaction ?? "NONE");
      } catch {
        setReaction(previousReaction);
        setLikes(likes);
      }
    });
  };

  const handleDislike = () => {
    if (isPending) return;
    
    const previousReaction = reaction;
    const newReaction = previousReaction === "DISLIKE" ? null : "DISLIKE";
    const newLikes = previousReaction === "LIKE" ? likes - 1 : likes;
    
    setReaction(newReaction);
    setLikes(newLikes);
    
    startTransition(async () => {
      try {
        await setPostReactionAction(post.id, newReaction ?? "NONE");
      } catch {
        setReaction(previousReaction);
        setLikes(likes);
      }
    });
  };

  const handleCommentSubmit = (formData: FormData) => {
    if (!commentText.trim()) return;
    
    startCommentTransition(async () => {
      await createCommentAction(post.id, formData);
      setCommentText("");
    });
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        if (unit === 'minute') return `${interval}m`;
        if (unit === 'hour') return `${interval}h`;
        if (unit === 'day') return `${interval}d`;
        if (unit === 'week') return `${interval}w`;
        if (unit === 'month') return `${interval}mo`;
        if (unit === 'year') return `${interval}y`;
        return `${interval}${unit.charAt(0)}`;
      }
    }
    return 'now';
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  return (
    <article className="mb-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.user.name} image={post.user.image} />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{post.user.name}</p>
              <Badge variant="accent" className="text-xs px-1.5 py-0">
                {post.user.heroTag}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(post.createdAt)} ago
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal size={18} />
        </Button>
      </div>

      {/* Media Content */}
      {post.imageUrl ? (
        <div className="relative bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={post.imageUrl} 
            alt="Post content" 
            className="w-full object-cover max-h-[600px]"
          />
        </div>
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Engagement Stats */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-1">
          <Heart 
            size={18} 
            className={reaction === "LIKE" ? "fill-red-500 text-red-500" : "text-muted-foreground"}
          />
          <span className="text-sm font-semibold">{likes.toLocaleString()} likes</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`gap-2 h-10 px-3 ${reaction === "LIKE" ? "text-red-500" : ""}`}
        >
          <Heart size={24} fill={reaction === "LIKE" ? "currentColor" : "none"} />
          <span className="text-sm">Like</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleComments}
          className="gap-2 h-10 px-3"
        >
          <MessageCircle size={24} />
          <span className="text-sm">Comment</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDislike}
          className={`gap-2 h-10 px-3 ${reaction === "DISLIKE" ? "text-muted-foreground" : ""}`}
        >
          <ThumbsDown size={22} />
        </Button>
      </div>

      {/* Achievement Badges */}
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        <Badge variant="secondary" className="gap-1 text-xs">
          <Sparkles size={12} /> +10 XP
        </Badge>
        {post.studyHours && (
          <Badge variant="outline" className="gap-1 text-xs">
            <BookOpen size={12} /> {post.studyHours} hours studied
          </Badge>
        )}
        {post.mockScore && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Target size={12} /> {post.mockScore}% test score
          </Badge>
        )}
      </div>

      {/* Caption for image posts */}
      {post.imageUrl && post.content && (
        <div className="px-4 pb-2">
          <p className="text-sm">
            <span className="font-semibold mr-2">{post.user.name}</span>
            {post.content}
          </p>
        </div>
      )}

      {/* Comments Section - Always visible but toggleable */}
      <div className="px-4 py-2">
        {post.comments.length > 0 && (
          <button
            onClick={toggleComments}
            className="text-xs text-muted-foreground font-semibold hover:text-foreground transition-colors mb-2"
          >
            {showComments ? "Hide" : "View all"} {post.comments.length} comment{post.comments.length !== 1 && "s"}
          </button>
        )}
        
        {showComments && post.comments.length > 0 && (
          <div className="space-y-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2 text-sm">
                <Avatar name={comment.user.name} image={comment.user.image} size="sm" />
                <div className="flex-1">
                  <p>
                    <span className="font-semibold mr-2">{comment.user.name}</span>
                    <span className="text-muted-foreground">{comment.content}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTimeAgo(comment.createdAt)} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      <form action={handleCommentSubmit} className="border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <Smile size={20} className="text-muted-foreground shrink-0" />
          <Input
            id={`comment-input-${post.id}`}
            name="content"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            disabled={isCommentPending}
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={!commentText.trim() || isCommentPending}
            className="text-primary font-semibold hover:text-primary/80"
          >
            Post
          </Button>
        </div>
      </form>
    </article>
  );
}

// Avatar Component
function Avatar({ 
  name, 
  image, 
  size = "default" 
}: { 
  name: string; 
  image?: string | null; 
  size?: "default" | "sm" 
}) {
  const sizeClasses = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  
  return (
    <div className={`${sizeClasses} shrink-0`}>
      <div className="relative h-full w-full">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent via-primary to-secondary" />
        <div className="absolute inset-[1.5px] flex items-center justify-center rounded-full bg-background">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className={`${textSize} font-semibold`}>
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}